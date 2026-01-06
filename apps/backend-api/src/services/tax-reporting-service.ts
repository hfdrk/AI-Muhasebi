import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";
import { vatOptimizationService } from "./vat-optimization-service";

/**
 * Tax Reporting Service
 * 
 * Generates tax reports and declarations for Turkish tax compliance.
 * Supports KDV (VAT), corporate tax, withholding tax, and social security reports.
 */
export interface TaxReport {
  type: "vat" | "corporate_tax" | "withholding" | "social_security";
  period: {
    start: Date;
    end: Date;
    label: string; // "2024-01" or "2024-Q1" or "2024"
  };
  clientCompanyId: string;
  clientCompanyName: string;
  data: Record<string, unknown>;
  totals: {
    taxableAmount: number;
    taxAmount: number;
    netAmount: number;
  };
  lineItems: Array<{
    date: Date;
    description: string;
    amount: number;
    taxAmount: number;
    taxRate: number;
  }>;
  generatedAt: Date;
}

export interface TaxDeclaration {
  type: "vat" | "corporate_tax" | "withholding";
  period: string;
  clientCompanyId: string;
  data: Record<string, unknown>;
  status: "draft" | "ready" | "submitted";
  submittedAt?: Date;
  submissionReference?: string;
}

export class TaxReportingService {
  /**
   * Generate VAT declaration (KDV Beyannamesi)
   */
  async generateVATDeclaration(
    tenantId: string,
    clientCompanyId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<TaxDeclaration> {
    // Verify company belongs to tenant
    const company = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });

    if (!company || company.tenantId !== tenantId) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    // Get VAT return data
    const vatReturn = await vatOptimizationService.prepareVATReturn(
      tenantId,
      clientCompanyId,
      periodStart,
      periodEnd
    );

    // Format period label
    const periodLabel = this.formatPeriodLabel(periodStart, periodEnd, "monthly");

    // Build declaration data
    const declarationData: Record<string, unknown> = {
      period: periodLabel,
      company: {
        name: company.name,
        taxNumber: company.taxNumber,
      },
      inputVAT: vatReturn.inputVAT,
      outputVAT: vatReturn.outputVAT,
      netVAT: vatReturn.netVAT,
      breakdown: vatReturn.breakdown,
      invoiceCounts: vatReturn.invoiceCounts,
    };

    return {
      type: "vat",
      period: periodLabel,
      clientCompanyId,
      data: declarationData,
      status: "ready",
    };
  }

  /**
   * Generate corporate tax report
   */
  async generateCorporateTaxReport(
    tenantId: string,
    clientCompanyId: string,
    year: number
  ): Promise<TaxReport> {
    // Verify company belongs to tenant
    const company = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });

    if (!company || company.tenantId !== tenantId) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    const periodStart = new Date(year, 0, 1);
    const periodEnd = new Date(year, 11, 31, 23, 59, 59);

    // Get all transactions for the year
    const transactions = await prisma.transaction.findMany({
      where: {
        tenantId,
        clientCompanyId,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        lines: {
          include: {
            ledgerAccount: true,
          },
        },
      },
    });

    // Calculate revenue and expenses
    let revenue = 0;
    let expenses = 0;

    for (const txn of transactions) {
      for (const line of txn.lines) {
        const amount = Number(line.debitAmount || 0) + Number(line.creditAmount || 0);
        const accountCode = line.ledgerAccount?.code || "";

        // Revenue accounts typically start with 6
        if (accountCode.startsWith("6")) {
          revenue += amount;
        }
        // Expense accounts typically start with 7
        else if (accountCode.startsWith("7")) {
          expenses += amount;
        }
      }
    }

    const profit = revenue - expenses;
    const corporateTaxRate = 0.25; // 25% corporate tax rate in Turkey
    const corporateTax = Math.max(0, profit * corporateTaxRate);

    const lineItems = transactions.map((txn) => ({
      date: txn.date,
      description: txn.description || "",
      amount: txn.lines.reduce(
        (sum, line) => sum + Number(line.debitAmount || 0) + Number(line.creditAmount || 0),
        0
      ),
      taxAmount: 0, // Corporate tax is calculated on profit, not per transaction
      taxRate: 0,
    }));

    return {
      type: "corporate_tax",
      period: {
        start: periodStart,
        end: periodEnd,
        label: year.toString(),
      },
      clientCompanyId,
      clientCompanyName: company.name,
      data: {
        revenue,
        expenses,
        profit,
        corporateTaxRate,
        corporateTax,
      },
      totals: {
        taxableAmount: profit,
        taxAmount: corporateTax,
        netAmount: profit - corporateTax,
      },
      lineItems,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate withholding tax report (Stopaj)
   */
  async generateWithholdingTaxReport(
    tenantId: string,
    clientCompanyId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<TaxReport> {
    // Verify company belongs to tenant
    const company = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });

    if (!company || company.tenantId !== tenantId) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    // Get invoices with withholding tax
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientCompanyId,
        issueDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        type: "ALIŞ", // Withholding typically applies to purchases
      },
      include: {
        counterparty: true,
      },
    });

    // Calculate withholding tax (typically 20% on services, 10% on goods)
    let totalWithholding = 0;
    const lineItems: TaxReport["lineItems"] = [];

    for (const invoice of invoices) {
      const netAmount = Number(invoice.netAmount || invoice.totalAmount - (invoice.taxAmount || 0));
      // Simplified: assume 20% withholding on services
      const withholdingRate = 0.20;
      const withholdingAmount = netAmount * withholdingRate;

      totalWithholding += withholdingAmount;

      lineItems.push({
        date: invoice.issueDate,
        description: `Fatura: ${invoice.invoiceNumber || invoice.id}`,
        amount: netAmount,
        taxAmount: withholdingAmount,
        taxRate: withholdingRate,
      });
    }

    return {
      type: "withholding",
      period: {
        start: periodStart,
        end: periodEnd,
        label: this.formatPeriodLabel(periodStart, periodEnd, "monthly"),
      },
      clientCompanyId,
      clientCompanyName: company.name,
      data: {
        totalWithholding,
        invoiceCount: invoices.length,
      },
      totals: {
        taxableAmount: lineItems.reduce((sum, item) => sum + item.amount, 0),
        taxAmount: totalWithholding,
        netAmount: lineItems.reduce((sum, item) => sum + item.amount, 0) - totalWithholding,
      },
      lineItems,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate monthly tax summary report
   */
  async generateMonthlyTaxSummary(
    tenantId: string,
    clientCompanyId: string,
    year: number,
    month: number
  ): Promise<{
    month: string;
    vat: {
      input: number;
      output: number;
      net: number;
    };
    withholding: number;
    corporateTax: number;
    totalTaxLiability: number;
  }> {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    const [vatReturn, withholdingReport] = await Promise.all([
      vatOptimizationService.prepareVATReturn(tenantId, clientCompanyId, periodStart, periodEnd),
      this.generateWithholdingTaxReport(tenantId, clientCompanyId, periodStart, periodEnd),
    ]);

    // Corporate tax is annual, so monthly is 0 or prorated
    const corporateTax = 0; // Would need annual calculation and proration

    const totalTaxLiability = vatReturn.netVAT + withholdingReport.totals.taxAmount + corporateTax;

    return {
      month: `${year}-${String(month).padStart(2, "0")}`,
      vat: {
        input: vatReturn.inputVAT,
        output: vatReturn.outputVAT,
        net: vatReturn.netVAT,
      },
      withholding: withholdingReport.totals.taxAmount,
      corporateTax,
      totalTaxLiability,
    };
  }

  /**
   * Format period label
   */
  private formatPeriodLabel(start: Date, end: Date, type: "monthly" | "quarterly" | "yearly"): string {
    if (type === "yearly") {
      return start.getFullYear().toString();
    } else if (type === "quarterly") {
      const quarter = Math.floor(start.getMonth() / 3) + 1;
      return `${start.getFullYear()}-Q${quarter}`;
    } else {
      return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    }
  }
}

export const taxReportingService = new TaxReportingService();

