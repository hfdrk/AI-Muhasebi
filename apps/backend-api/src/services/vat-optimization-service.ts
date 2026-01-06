import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";

/**
 * VAT Optimization Service
 * 
 * Handles VAT management and optimization for Turkish tax compliance.
 * Supports Turkish VAT rates: 0%, 1%, 10%, 18%, 20%
 */
export interface VATAnalysis {
  totalInputVAT: number;
  totalOutputVAT: number;
  netVAT: number; // Output - Input (amount to pay or refund)
  inputVATByRate: Record<string, number>;
  outputVATByRate: Record<string, number>;
  period: {
    startDate: Date;
    endDate: Date;
  };
  suggestions: Array<{
    type: "optimization" | "compliance" | "warning";
    title: string;
    description: string;
    impact: number; // Potential savings or cost
  }>;
}

export interface VATRate {
  rate: number; // 0, 0.01, 0.10, 0.18, 0.20
  label: string; // "0%", "1%", "10%", "18%", "20%"
}

export class VATOptimizationService {
  private readonly TURKISH_VAT_RATES: VATRate[] = [
    { rate: 0, label: "0%" },
    { rate: 0.01, label: "1%" },
    { rate: 0.10, label: "10%" },
    { rate: 0.18, label: "18%" },
    { rate: 0.20, label: "20%" },
  ];

  /**
   * Analyze VAT for a client company for a period
   */
  async analyzeVAT(
    tenantId: string,
    clientCompanyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VATAnalysis> {
    // Verify company belongs to tenant
    const company = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });

    if (!company || company.tenantId !== tenantId) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    // Get invoices for the period
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientCompanyId,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        lines: true,
      },
    });

    // Calculate input VAT (purchases - ALIŞ)
    const inputInvoices = invoices.filter((inv) => inv.type === "ALIŞ");
    const inputVATByRate: Record<string, number> = {};
    let totalInputVAT = 0;

    for (const invoice of inputInvoices) {
      for (const line of invoice.lines) {
        const vatRate = Number(line.vatRate || 0);
        const vatAmount = Number(line.vatAmount || 0);
        const rateKey = this.getVATRateKey(vatRate);

        if (!inputVATByRate[rateKey]) {
          inputVATByRate[rateKey] = 0;
        }
        inputVATByRate[rateKey] += vatAmount;
        totalInputVAT += vatAmount;
      }
    }

    // Calculate output VAT (sales - SATIŞ)
    const outputInvoices = invoices.filter((inv) => inv.type === "SATIŞ");
    const outputVATByRate: Record<string, number> = {};
    let totalOutputVAT = 0;

    for (const invoice of outputInvoices) {
      for (const line of invoice.lines) {
        const vatRate = Number(line.vatRate || 0);
        const vatAmount = Number(line.vatAmount || 0);
        const rateKey = this.getVATRateKey(vatRate);

        if (!outputVATByRate[rateKey]) {
          outputVATByRate[rateKey] = 0;
        }
        outputVATByRate[rateKey] += vatAmount;
        totalOutputVAT += vatAmount;
      }
    }

    // Net VAT (amount to pay)
    const netVAT = totalOutputVAT - totalInputVAT;

    // Generate suggestions
    const suggestions = this.generateVATSuggestions(
      totalInputVAT,
      totalOutputVAT,
      netVAT,
      inputVATByRate,
      outputVATByRate,
      invoices
    );

    return {
      totalInputVAT,
      totalOutputVAT,
      netVAT,
      inputVATByRate,
      outputVATByRate,
      period: {
        startDate,
        endDate,
      },
      suggestions,
    };
  }

  /**
   * Validate VAT rate (must be valid Turkish rate)
   */
  validateVATRate(rate: number): { valid: boolean; message?: string } {
    const validRates = this.TURKISH_VAT_RATES.map((r) => r.rate);
    const isValid = validRates.includes(rate);

    if (!isValid) {
      return {
        valid: false,
        message: `Geçersiz KDV oranı: ${rate}. Türkiye'de geçerli oranlar: ${validRates.map((r) => `${r * 100}%`).join(", ")}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check for VAT inconsistencies
   */
  async checkVATInconsistencies(
    tenantId: string,
    clientCompanyId: string
  ): Promise<Array<{
    invoiceId: string;
    invoiceNumber: string | null;
    issueDate: Date;
    issue: string;
    severity: "low" | "medium" | "high";
  }>> {
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientCompanyId,
      },
      include: {
        lines: true,
      },
      orderBy: {
        issueDate: "desc",
      },
      take: 100, // Check last 100 invoices
    });

    const inconsistencies: Array<{
      invoiceId: string;
      invoiceNumber: string | null;
      issueDate: Date;
      issue: string;
      severity: "low" | "medium" | "high";
    }> = [];

    for (const invoice of invoices) {
      // Check each line for VAT inconsistencies
      for (const line of invoice.lines) {
        const vatRate = Number(line.vatRate || 0);
        const lineTotal = Number(line.lineTotal || 0);
        const vatAmount = Number(line.vatAmount || 0);

        // Validate VAT rate
        const rateValidation = this.validateVATRate(vatRate);
        if (!rateValidation.valid) {
          inconsistencies.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            issueDate: invoice.issueDate,
            issue: rateValidation.message || "Geçersiz KDV oranı",
            severity: "high",
          });
        }

        // Check if VAT amount matches calculated VAT
        const expectedVAT = lineTotal * vatRate;
        const difference = Math.abs(vatAmount - expectedVAT);
        if (difference > 0.01) {
          inconsistencies.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            issueDate: invoice.issueDate,
            issue: `KDV tutarı uyuşmuyor. Beklenen: ${expectedVAT.toFixed(2)}, Gerçek: ${vatAmount.toFixed(2)}`,
            severity: difference > 1 ? "high" : "medium",
          });
        }
      }

      // Check if total VAT matches sum of line VATs
      const totalLineVAT = invoice.lines.reduce((sum, line) => sum + Number(line.vatAmount || 0), 0);
      const invoiceVAT = Number(invoice.taxAmount || 0);
      const totalDifference = Math.abs(totalLineVAT - invoiceVAT);
      if (totalDifference > 0.01) {
        inconsistencies.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
          issue: `Fatura toplam KDV'si satır KDV'leriyle uyuşmuyor. Fark: ${totalDifference.toFixed(2)}`,
          severity: totalDifference > 1 ? "high" : "medium",
        });
      }
    }

    return inconsistencies;
  }

  /**
   * Prepare VAT return data
   */
  async prepareVATReturn(
    tenantId: string,
    clientCompanyId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    period: { start: Date; end: Date };
    inputVAT: number;
    outputVAT: number;
    netVAT: number;
    breakdown: Array<{
      rate: string;
      inputAmount: number;
      outputAmount: number;
      netAmount: number;
    }>;
    invoiceCounts: {
      input: number;
      output: number;
      total: number;
    };
  }> {
    const analysis = await this.analyzeVAT(tenantId, clientCompanyId, periodStart, periodEnd);

    // Get invoice counts
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientCompanyId,
        issueDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const inputCount = invoices.filter((inv) => inv.type === "ALIŞ").length;
    const outputCount = invoices.filter((inv) => inv.type === "SATIŞ").length;

    // Build breakdown by rate
    const allRates = new Set([
      ...Object.keys(analysis.inputVATByRate),
      ...Object.keys(analysis.outputVATByRate),
    ]);

    const breakdown = Array.from(allRates).map((rateKey) => {
      const inputAmount = analysis.inputVATByRate[rateKey] || 0;
      const outputAmount = analysis.outputVATByRate[rateKey] || 0;
      return {
        rate: rateKey,
        inputAmount,
        outputAmount,
        netAmount: outputAmount - inputAmount,
      };
    });

    return {
      period: {
        start: periodStart,
        end: periodEnd,
      },
      inputVAT: analysis.totalInputVAT,
      outputVAT: analysis.totalOutputVAT,
      netVAT: analysis.netVAT,
      breakdown,
      invoiceCounts: {
        input: inputCount,
        output: outputCount,
        total: invoices.length,
      },
    };
  }

  /**
   * Get VAT rate key for grouping
   */
  private getVATRateKey(rate: number): string {
    const rateObj = this.TURKISH_VAT_RATES.find((r) => Math.abs(r.rate - rate) < 0.001);
    return rateObj ? rateObj.label : `${(rate * 100).toFixed(0)}%`;
  }

  /**
   * Generate VAT optimization suggestions
   */
  private generateVATSuggestions(
    totalInputVAT: number,
    totalOutputVAT: number,
    netVAT: number,
    inputVATByRate: Record<string, number>,
    outputVATByRate: Record<string, number>,
    invoices: Array<{ type: string | null; issueDate: Date }>
  ): Array<{
    type: "optimization" | "compliance" | "warning";
    title: string;
    description: string;
    impact: number;
  }> {
    const suggestions: Array<{
      type: "optimization" | "compliance" | "warning";
      title: string;
      description: string;
      impact: number;
    }> = [];

    // Check for reverse charge VAT opportunities
    if (netVAT > 10000) {
      suggestions.push({
        type: "optimization",
        title: "Ters KDV Fırsatı",
        description: "Yüksek KDV ödemesi var. Ters KDV uygulanabilir işlemler için değerlendirme yapılabilir.",
        impact: netVAT * 0.1, // Potential 10% savings
      });
    }

    // Check for VAT exemption opportunities
    const exemptInvoices = invoices.filter((inv) => {
      // Check if invoice might qualify for exemption
      return false; // Simplified - would need business logic
    });

    if (exemptInvoices.length > 0) {
      suggestions.push({
        type: "optimization",
        title: "KDV İstisnası Kontrolü",
        description: `${exemptInvoices.length} fatura için KDV istisnası değerlendirilebilir.`,
        impact: 0, // Would need calculation
      });
    }

    // Check for input VAT optimization
    if (totalInputVAT < totalOutputVAT * 0.3) {
      suggestions.push({
        type: "warning",
        title: "Düşük Girdi KDV",
        description: "Girdi KDV'si çıktı KDV'sinin %30'undan az. Girdi faturalarını kontrol edin.",
        impact: 0,
      });
    }

    // Check for cross-border VAT handling
    const hasCrossBorder = invoices.some((inv) => {
      // Simplified check - would need actual cross-border detection
      return false;
    });

    if (hasCrossBorder) {
      suggestions.push({
        type: "compliance",
        title: "Sınır Ötesi KDV Kontrolü",
        description: "Sınır ötesi işlemler için özel KDV kuralları uygulanabilir.",
        impact: 0,
      });
    }

    return suggestions;
  }
}

export const vatOptimizationService = new VATOptimizationService();

