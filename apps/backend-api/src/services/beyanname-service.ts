import { prisma } from "../lib/prisma";
import { logger } from "@repo/shared-utils";
import { Decimal } from "@prisma/client/runtime/library";

interface CreateBeyannameInput {
  clientCompanyId: string;
  type: string; // KDV, MUHTASAR, GECICI_VERGI, KURUMLAR, GELIR, DAMGA, KDV2
  period: string; // YYYY-MM, YYYY-Q1, YYYY
  dueDate: string;
  notes?: string;
}

interface ListBeyannameParams {
  clientCompanyId?: string;
  type?: string;
  status?: string;
  period?: string;
  page?: number;
  pageSize?: number;
}

// Turkish tax rates
const WITHHOLDING_RATE = 0.2; // Stopaj oranı
const CORPORATE_TAX_RATE = 0.25; // Kurumlar vergisi
const QUARTERLY_TAX_RATE = 0.25; // Geçici vergi

class BeyannameService {
  /**
   * Get Beyanname dashboard statistics
   */
  async getDashboardStats(tenantId: string) {
    const now = new Date();

    const [totalBeyanname, draftBeyanname, submittedBeyanname, upcomingDue, overdueBeyanname, byType] =
      await Promise.all([
        prisma.beyanname.count({ where: { tenantId } }),
        prisma.beyanname.count({ where: { tenantId, status: "draft" } }),
        prisma.beyanname.count({ where: { tenantId, status: "submitted" } }),
        prisma.beyanname.findMany({
          where: {
            tenantId,
            status: { in: ["draft", "calculating", "calculated", "reviewed"] },
            dueDate: { gte: now },
          },
          orderBy: { dueDate: "asc" },
          take: 10,
          include: { clientCompany: { select: { name: true } } },
        }),
        prisma.beyanname.count({
          where: {
            tenantId,
            status: { in: ["draft", "calculating", "calculated", "reviewed"] },
            dueDate: { lt: now },
          },
        }),
        prisma.beyanname.groupBy({
          by: ["type"],
          where: { tenantId },
          _count: true,
        }),
      ]);

    return {
      totalBeyanname,
      draftBeyanname,
      submittedBeyanname,
      overdueBeyanname,
      upcomingDue: upcomingDue.map((b) => ({
        id: b.id,
        clientCompanyName: b.clientCompany.name,
        type: b.type,
        period: b.period,
        dueDate: b.dueDate,
        status: b.status,
        netPayable: b.netPayable,
      })),
      byType: byType.map((b) => ({ type: b.type, count: b._count })),
    };
  }

  /**
   * Create a new beyanname
   */
  async createBeyanname(tenantId: string, userId: string, input: CreateBeyannameInput) {
    // Check for existing
    const existing = await prisma.beyanname.findUnique({
      where: {
        tenantId_clientCompanyId_type_period: {
          tenantId,
          clientCompanyId: input.clientCompanyId,
          type: input.type,
          period: input.period,
        },
      },
    });

    if (existing) {
      throw new Error(`${input.period} dönemi için ${input.type} beyannamesi zaten mevcut`);
    }

    const beyanname = await prisma.beyanname.create({
      data: {
        tenantId,
        clientCompanyId: input.clientCompanyId,
        type: input.type,
        period: input.period,
        status: "draft",
        dueDate: new Date(input.dueDate),
        preparedByUserId: userId,
        notes: input.notes,
        calculationData: {},
      },
      include: { clientCompany: { select: { name: true } } },
    });

    logger.info("Beyanname created", undefined, { id: beyanname.id, type: input.type, period: input.period });
    return beyanname;
  }

  /**
   * Calculate beyanname amounts based on invoice/transaction data
   */
  async calculateBeyanname(tenantId: string, beyannameId: string) {
    const beyanname = await prisma.beyanname.findFirst({
      where: { id: beyannameId, tenantId },
    });
    if (!beyanname) throw new Error("Beyanname bulunamadı");

    // Parse period
    const [year, periodPart] = beyanname.period.split("-");
    let startDate: Date;
    let endDate: Date;

    if (periodPart.startsWith("Q")) {
      const quarter = parseInt(periodPart.substring(1));
      startDate = new Date(parseInt(year), (quarter - 1) * 3, 1);
      endDate = new Date(parseInt(year), quarter * 3, 0, 23, 59, 59);
    } else if (periodPart.length === 2) {
      const month = parseInt(periodPart);
      startDate = new Date(parseInt(year), month - 1, 1);
      endDate = new Date(parseInt(year), month, 0, 23, 59, 59);
    } else {
      startDate = new Date(parseInt(year), 0, 1);
      endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
    }

    // Get invoices for the period
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientCompanyId: beyanname.clientCompanyId,
        issueDate: { gte: startDate, lte: endDate },
      },
    });

    let calculatedAmount = new Decimal(0);
    let deductibleAmount = new Decimal(0);
    let netPayable = new Decimal(0);
    let carryForward = new Decimal(0);
    const calculationData: any = {};

    switch (beyanname.type) {
      case "KDV": {
        // KDV beyannamesi - VAT declaration
        const salesVat = invoices
          .filter((i) => i.type === "SATIŞ")
          .reduce((sum, i) => sum.add(i.taxAmount || 0), new Decimal(0));

        const purchaseVat = invoices
          .filter((i) => i.type === "ALIŞ")
          .reduce((sum, i) => sum.add(i.taxAmount || 0), new Decimal(0));

        // Get previous month's carry forward
        const prevBeyanname = await this.getPreviousPeriodBeyanname(
          tenantId, beyanname.clientCompanyId, "KDV", beyanname.period
        );
        const prevCarryForward = prevBeyanname?.carryForward || new Decimal(0);

        calculatedAmount = salesVat;
        deductibleAmount = purchaseVat.add(prevCarryForward);
        netPayable = calculatedAmount.sub(deductibleAmount);

        if (netPayable.lessThan(0)) {
          carryForward = netPayable.abs();
          netPayable = new Decimal(0);
        }

        calculationData.salesVat = salesVat.toString();
        calculationData.purchaseVat = purchaseVat.toString();
        calculationData.previousCarryForward = prevCarryForward.toString();
        calculationData.salesInvoiceCount = invoices.filter((i) => i.type === "SATIŞ").length;
        calculationData.purchaseInvoiceCount = invoices.filter((i) => i.type === "ALIŞ").length;
        break;
      }

      case "MUHTASAR": {
        // Withholding tax declaration
        const totalPayments = invoices
          .filter((i) => i.type === "ALIŞ")
          .reduce((sum, i) => sum.add(i.totalAmount), new Decimal(0));

        calculatedAmount = totalPayments.mul(WITHHOLDING_RATE);
        netPayable = calculatedAmount;
        calculationData.totalPayments = totalPayments.toString();
        calculationData.withholdingRate = WITHHOLDING_RATE;
        break;
      }

      case "GECICI_VERGI": {
        // Quarterly advance tax
        const quarterlyIncome = invoices
          .filter((i) => i.type === "SATIŞ")
          .reduce((sum, i) => sum.add(i.totalAmount).sub(i.taxAmount || 0), new Decimal(0));

        const quarterlyExpense = invoices
          .filter((i) => i.type === "ALIŞ")
          .reduce((sum, i) => sum.add(i.totalAmount).sub(i.taxAmount || 0), new Decimal(0));

        const profit = quarterlyIncome.sub(quarterlyExpense);
        calculatedAmount = profit.greaterThan(0) ? profit.mul(QUARTERLY_TAX_RATE) : new Decimal(0);
        netPayable = calculatedAmount;
        calculationData.quarterlyIncome = quarterlyIncome.toString();
        calculationData.quarterlyExpense = quarterlyExpense.toString();
        calculationData.profit = profit.toString();
        break;
      }

      case "KURUMLAR": {
        // Corporate tax - annual
        const annualIncome = invoices
          .filter((i) => i.type === "SATIŞ")
          .reduce((sum, i) => sum.add(i.totalAmount).sub(i.taxAmount || 0), new Decimal(0));

        const annualExpense = invoices
          .filter((i) => i.type === "ALIŞ")
          .reduce((sum, i) => sum.add(i.totalAmount).sub(i.taxAmount || 0), new Decimal(0));

        const annualProfit = annualIncome.sub(annualExpense);
        calculatedAmount = annualProfit.greaterThan(0) ? annualProfit.mul(CORPORATE_TAX_RATE) : new Decimal(0);

        // Deduct quarterly advance taxes paid
        const quarterlyTaxesPaid = await prisma.beyanname.findMany({
          where: {
            tenantId,
            clientCompanyId: beyanname.clientCompanyId,
            type: "GECICI_VERGI",
            period: { startsWith: year },
            status: "submitted",
          },
        });
        deductibleAmount = quarterlyTaxesPaid.reduce(
          (sum, q) => sum.add(q.netPayable || 0),
          new Decimal(0)
        );

        netPayable = calculatedAmount.sub(deductibleAmount);
        if (netPayable.lessThan(0)) netPayable = new Decimal(0);

        calculationData.annualIncome = annualIncome.toString();
        calculationData.annualExpense = annualExpense.toString();
        calculationData.annualProfit = annualProfit.toString();
        calculationData.quarterlyTaxesPaid = deductibleAmount.toString();
        break;
      }

      default:
        // Generic calculation
        const totalRevenue = invoices
          .filter((i) => i.type === "SATIŞ")
          .reduce((sum, i) => sum.add(i.totalAmount), new Decimal(0));
        calculatedAmount = totalRevenue;
        netPayable = totalRevenue;
        break;
    }

    const updated = await prisma.beyanname.update({
      where: { id: beyannameId },
      data: {
        status: "calculated",
        calculatedAmount,
        deductibleAmount,
        netPayable,
        carryForward,
        calculationData,
      },
      include: { clientCompany: { select: { name: true } } },
    });

    logger.info("Beyanname calculated", undefined, { id: beyannameId, netPayable: netPayable.toString() });
    return updated;
  }

  /**
   * List beyannameler
   */
  async listBeyannameler(tenantId: string, params: ListBeyannameParams) {
    const { clientCompanyId, type, status, period, page = 1, pageSize = 20 } = params;
    const where: any = { tenantId };
    if (clientCompanyId) where.clientCompanyId = clientCompanyId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (period) where.period = period;

    const [beyannameler, total] = await Promise.all([
      prisma.beyanname.findMany({
        where,
        orderBy: { dueDate: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          clientCompany: { select: { name: true } },
          preparedBy: { select: { fullName: true } },
          reviewedBy: { select: { fullName: true } },
        },
      }),
      prisma.beyanname.count({ where }),
    ]);

    return {
      beyannameler,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Get a single beyanname
   */
  async getBeyanname(tenantId: string, beyannameId: string) {
    const beyanname = await prisma.beyanname.findFirst({
      where: { id: beyannameId, tenantId },
      include: {
        clientCompany: { select: { name: true, taxNumber: true } },
        preparedBy: { select: { fullName: true, email: true } },
        reviewedBy: { select: { fullName: true, email: true } },
      },
    });
    if (!beyanname) throw new Error("Beyanname bulunamadı");
    return beyanname;
  }

  /**
   * Update beyanname status
   */
  async updateBeyannameStatus(
    tenantId: string,
    beyannameId: string,
    userId: string,
    status: string,
    notes?: string
  ) {
    const beyanname = await prisma.beyanname.findFirst({
      where: { id: beyannameId, tenantId },
    });
    if (!beyanname) throw new Error("Beyanname bulunamadı");

    const updateData: any = { status };
    if (status === "reviewed") {
      updateData.reviewedByUserId = userId;
    }
    if (status === "submitted") {
      updateData.submittedAt = new Date();
    }
    if (notes) {
      updateData.notes = notes;
    }

    return prisma.beyanname.update({
      where: { id: beyannameId },
      data: updateData,
      include: { clientCompany: { select: { name: true } } },
    });
  }

  /**
   * Get previous period beyanname for carry forward calculations
   */
  private async getPreviousPeriodBeyanname(
    tenantId: string,
    clientCompanyId: string,
    type: string,
    currentPeriod: string
  ) {
    const [year, month] = currentPeriod.split("-").map(Number);
    let prevPeriod: string;
    if (month === 1) {
      prevPeriod = `${year - 1}-12`;
    } else {
      prevPeriod = `${year}-${String(month - 1).padStart(2, "0")}`;
    }

    return prisma.beyanname.findUnique({
      where: {
        tenantId_clientCompanyId_type_period: {
          tenantId,
          clientCompanyId,
          type,
          period: prevPeriod,
        },
      },
    });
  }
}

export const beyannameService = new BeyannameService();
