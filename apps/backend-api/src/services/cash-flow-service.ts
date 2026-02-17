import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";

interface MonthlyForecast {
  month: string;
  inflows: number;
  outflows: number;
  net: number;
  runningBalance: number;
}

interface ForecastSummary {
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  lowestBalance: number;
  lowestBalanceMonth: string;
}

export class CashFlowService {
  /**
   * List cash flow entries with filters
   */
  async list(
    tenantId: string,
    params: {
      page?: number;
      pageSize?: number;
      type?: string;
      category?: string;
      source?: string;
      dateStart?: string;
      dateEnd?: string;
      clientCompanyId?: string;
    }
  ) {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const where: any = { tenantId };
    if (params.type) where.type = params.type;
    if (params.category) where.category = params.category;
    if (params.source) where.source = params.source;
    if (params.clientCompanyId) where.clientCompanyId = params.clientCompanyId;
    if (params.dateStart || params.dateEnd) {
      where.entryDate = {};
      if (params.dateStart) where.entryDate.gte = new Date(params.dateStart);
      if (params.dateEnd) where.entryDate.lte = new Date(params.dateEnd);
    }

    const [items, total] = await Promise.all([
      prisma.cashFlowEntry.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { entryDate: "desc" },
        include: { clientCompany: { select: { id: true, name: true } } },
      }),
      prisma.cashFlowEntry.count({ where }),
    ]);

    return {
      data: items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Create manual cash flow entry
   */
  async create(
    tenantId: string,
    data: {
      type: string;
      category: string;
      source?: string;
      amount: number;
      currency?: string;
      entryDate: string;
      description?: string;
      clientCompanyId?: string;
      isRecurring?: boolean;
    }
  ) {
    return prisma.cashFlowEntry.create({
      data: {
        tenantId,
        type: data.type,
        category: data.category,
        source: data.source || "actual",
        amount: data.amount,
        currency: data.currency || "TRY",
        entryDate: new Date(data.entryDate),
        description: data.description,
        clientCompanyId: data.clientCompanyId,
        isRecurring: data.isRecurring || false,
      },
      include: { clientCompany: { select: { id: true, name: true } } },
    });
  }

  /**
   * Update entry
   */
  async update(tenantId: string, id: string, data: Record<string, any>) {
    const existing = await prisma.cashFlowEntry.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Nakit akış kaydı bulunamadı.");

    const updateData: any = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.entryDate !== undefined) updateData.entryDate = new Date(data.entryDate);
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;

    return prisma.cashFlowEntry.update({ where: { id }, data: updateData });
  }

  /**
   * Delete entry
   */
  async delete(tenantId: string, id: string) {
    const existing = await prisma.cashFlowEntry.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Nakit akış kaydı bulunamadı.");
    await prisma.cashFlowEntry.delete({ where: { id } });
  }

  /**
   * Cash flow forecast for next N months
   */
  async getForecast(tenantId: string, months: number = 12): Promise<{
    monthly: MonthlyForecast[];
    summary: ForecastSummary;
  }> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // 1. Get actual cash flow entries
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + months, 0);

    const entries = await prisma.cashFlowEntry.findMany({
      where: { tenantId, entryDate: { gte: startDate, lte: endDate } },
    });

    // 2. Get unpaid invoices (forecast based on due dates)
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ["kesildi", "taslak"] },
        dueDate: { gte: startDate, lte: endDate },
      },
      select: { type: true, totalAmount: true, dueDate: true },
    });

    // 3. Get checks/notes in portfolio
    const pendingChecks = await prisma.checkNote.findMany({
      where: {
        tenantId,
        status: { in: ["portfoyde", "tahsile_verildi"] },
        dueDate: { gte: startDate, lte: endDate },
      },
      select: { direction: true, amount: true, dueDate: true },
    });

    // 4. Build monthly buckets
    const monthlyMap = new Map<string, { inflows: number; outflows: number }>();

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { inflows: 0, outflows: 0 });
    }

    // Add actual entries
    for (const entry of entries) {
      const d = new Date(entry.entryDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthlyMap.get(key);
      if (bucket) {
        if (entry.type === "INFLOW") {
          bucket.inflows += Number(entry.amount);
        } else {
          bucket.outflows += Number(entry.amount);
        }
      }
    }

    // Add invoice forecasts
    for (const inv of unpaidInvoices) {
      if (!inv.dueDate) continue;
      const d = new Date(inv.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthlyMap.get(key);
      if (bucket) {
        if (inv.type === "SATIŞ") {
          bucket.inflows += Number(inv.totalAmount);
        } else {
          bucket.outflows += Number(inv.totalAmount);
        }
      }
    }

    // Add check/note forecasts
    for (const cn of pendingChecks) {
      const d = new Date(cn.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthlyMap.get(key);
      if (bucket) {
        if (cn.direction === "ALACAK") {
          bucket.inflows += Number(cn.amount);
        } else {
          bucket.outflows += Number(cn.amount);
        }
      }
    }

    // 5. Calculate running balance and build response
    let runningBalance = 0;
    let totalInflows = 0;
    let totalOutflows = 0;
    let lowestBalance = Infinity;
    let lowestBalanceMonth = currentMonth;

    // Get current balance from actual entries before this period
    const priorEntries = await prisma.cashFlowEntry.findMany({
      where: { tenantId, entryDate: { lt: startDate }, source: "actual" },
    });
    for (const e of priorEntries) {
      if (e.type === "INFLOW") runningBalance += Number(e.amount);
      else runningBalance -= Number(e.amount);
    }

    const monthly: MonthlyForecast[] = [];

    for (const [month, data] of monthlyMap) {
      const net = data.inflows - data.outflows;
      runningBalance += net;
      totalInflows += data.inflows;
      totalOutflows += data.outflows;

      if (runningBalance < lowestBalance) {
        lowestBalance = runningBalance;
        lowestBalanceMonth = month;
      }

      monthly.push({
        month,
        inflows: Math.round(data.inflows * 100) / 100,
        outflows: Math.round(data.outflows * 100) / 100,
        net: Math.round(net * 100) / 100,
        runningBalance: Math.round(runningBalance * 100) / 100,
      });
    }

    return {
      monthly,
      summary: {
        totalInflows: Math.round(totalInflows * 100) / 100,
        totalOutflows: Math.round(totalOutflows * 100) / 100,
        netCashFlow: Math.round((totalInflows - totalOutflows) * 100) / 100,
        lowestBalance: lowestBalance === Infinity ? 0 : Math.round(lowestBalance * 100) / 100,
        lowestBalanceMonth,
      },
    };
  }

  /**
   * Current period summary
   */
  async getCurrentSummary(tenantId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const entries = await prisma.cashFlowEntry.findMany({
      where: { tenantId, entryDate: { gte: monthStart, lte: monthEnd } },
    });

    let totalInflows = 0;
    let totalOutflows = 0;
    const categoryMap = new Map<string, { amount: number; type: string }>();

    for (const entry of entries) {
      const amt = Number(entry.amount);
      if (entry.type === "INFLOW") {
        totalInflows += amt;
      } else {
        totalOutflows += amt;
      }
      const key = `${entry.category}-${entry.type}`;
      const existing = categoryMap.get(key) || { amount: 0, type: entry.type };
      existing.amount += amt;
      categoryMap.set(key, existing);
    }

    // Pending collections/payments from invoices
    const [pendingCollections, pendingPayments] = await Promise.all([
      prisma.invoice.aggregate({
        where: { tenantId, type: "SATIŞ", status: "kesildi", dueDate: { gte: now } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { tenantId, type: "ALIŞ", status: "kesildi", dueDate: { gte: now } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      currentMonth,
      totalInflows: Math.round(totalInflows * 100) / 100,
      totalOutflows: Math.round(totalOutflows * 100) / 100,
      netFlow: Math.round((totalInflows - totalOutflows) * 100) / 100,
      byCategory: Array.from(categoryMap.entries()).map(([key, val]) => {
        const [category] = key.split("-");
        return { category, amount: Math.round(val.amount * 100) / 100, type: val.type };
      }),
      pendingCollections: Number(pendingCollections._sum.totalAmount || 0),
      pendingPayments: Number(pendingPayments._sum.totalAmount || 0),
    };
  }

  /**
   * Daily breakdown for a month
   */
  async getDailyBreakdown(tenantId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const entries = await prisma.cashFlowEntry.findMany({
      where: { tenantId, entryDate: { gte: startDate, lte: endDate } },
      orderBy: { entryDate: "asc" },
    });

    const dailyMap = new Map<string, { inflows: number; outflows: number }>();
    const daysInMonth = endDate.getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      dailyMap.set(key, { inflows: 0, outflows: 0 });
    }

    for (const entry of entries) {
      const d = new Date(entry.entryDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const bucket = dailyMap.get(key);
      if (bucket) {
        if (entry.type === "INFLOW") bucket.inflows += Number(entry.amount);
        else bucket.outflows += Number(entry.amount);
      }
    }

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      inflows: Math.round(data.inflows * 100) / 100,
      outflows: Math.round(data.outflows * 100) / 100,
      net: Math.round((data.inflows - data.outflows) * 100) / 100,
    }));
  }

  /**
   * Sync cash flow entries from invoices
   */
  async syncFromInvoices(tenantId: string) {
    // Find paid/issued invoices not yet in cash flow
    const invoices = await prisma.invoice.findMany({
      where: { tenantId, status: { in: ["kesildi", "muhasebeleştirilmiş"] } },
      select: { id: true, type: true, totalAmount: true, issueDate: true, dueDate: true, clientCompanyId: true },
    });

    let synced = 0;

    for (const inv of invoices) {
      // Check if already synced
      const existing = await prisma.cashFlowEntry.findFirst({
        where: { tenantId, invoiceId: inv.id },
      });
      if (existing) continue;

      await prisma.cashFlowEntry.create({
        data: {
          tenantId,
          clientCompanyId: inv.clientCompanyId,
          type: inv.type === "SATIŞ" ? "INFLOW" : "OUTFLOW",
          category: "invoice",
          source: "actual",
          amount: inv.totalAmount,
          entryDate: inv.dueDate || inv.issueDate,
          description: `Fatura: ${inv.id}`,
          invoiceId: inv.id,
        },
      });
      synced++;
    }

    logger.info(`Synced ${synced} invoices to cash flow for tenant ${tenantId}`);
    return { synced };
  }

  /**
   * Dashboard stats
   */
  async getDashboardStats(tenantId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    const [thisMonthIn, thisMonthOut, nextMonthIn, nextMonthOut] = await Promise.all([
      prisma.cashFlowEntry.aggregate({
        where: { tenantId, type: "INFLOW", entryDate: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.cashFlowEntry.aggregate({
        where: { tenantId, type: "OUTFLOW", entryDate: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.cashFlowEntry.aggregate({
        where: { tenantId, type: "INFLOW", entryDate: { gte: nextMonthStart, lte: nextMonthEnd } },
        _sum: { amount: true },
      }),
      prisma.cashFlowEntry.aggregate({
        where: { tenantId, type: "OUTFLOW", entryDate: { gte: nextMonthStart, lte: nextMonthEnd } },
        _sum: { amount: true },
      }),
    ]);

    const thisIn = Number(thisMonthIn._sum.amount || 0);
    const thisOut = Number(thisMonthOut._sum.amount || 0);
    const nextIn = Number(nextMonthIn._sum.amount || 0);
    const nextOut = Number(nextMonthOut._sum.amount || 0);

    return {
      thisMonth: { inflows: thisIn, outflows: thisOut, net: thisIn - thisOut },
      nextMonth: { inflows: nextIn, outflows: nextOut, net: nextIn - nextOut },
    };
  }
}

export const cashFlowService = new CashFlowService();
