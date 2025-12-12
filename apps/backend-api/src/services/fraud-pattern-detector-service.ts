import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import { riskAlertService } from "./risk-alert-service";

export interface FraudPatternResult {
  benfordsLawViolation: boolean;
  roundNumberSuspicious: boolean;
  unusualTiming: boolean;
  patterns: Array<{
    type: "benfords_law" | "round_number" | "unusual_timing" | "circular_transaction" | "vat_pattern" | "invoice_anomaly" | "date_manipulation" | "related_party" | "cross_company";
    severity: "low" | "medium" | "high";
    description: string;
    value?: number;
  }>;
}

export class FraudPatternDetectorService {
  /**
   * Analyze transaction amounts using Benford's Law
   * Benford's Law states that in many naturally occurring collections of numbers,
   * the leading digit is likely to be small (1 appears ~30% of the time)
   */
  analyzeBenfordsLaw(amounts: number[]): {
    violation: boolean;
    chiSquare: number;
    expectedDistribution: Record<number, number>;
    actualDistribution: Record<number, number>;
  } {
    if (amounts.length < 20) {
      // Need at least 20 values for meaningful analysis
      return {
        violation: false,
        chiSquare: 0,
        expectedDistribution: {},
        actualDistribution: {},
      };
    }

    // Get first digit of each amount
    const firstDigits = amounts.map((amount) => {
      const absAmount = Math.abs(amount);
      if (absAmount === 0) return 0;
      return Math.floor(absAmount / Math.pow(10, Math.floor(Math.log10(absAmount))));
    });

    // Count occurrences of each first digit (1-9)
    const actualCounts: Record<number, number> = {};
    for (let i = 1; i <= 9; i++) {
      actualCounts[i] = 0;
    }

    firstDigits.forEach((digit) => {
      if (digit >= 1 && digit <= 9) {
        actualCounts[digit]++;
      }
    });

    // Expected distribution according to Benford's Law
    const expectedDistribution: Record<number, number> = {};
    const total = amounts.length;
    for (let i = 1; i <= 9; i++) {
      expectedDistribution[i] = total * Math.log10(1 + 1 / i);
    }

    // Calculate actual distribution percentages
    const actualDistribution: Record<number, number> = {};
    for (let i = 1; i <= 9; i++) {
      actualDistribution[i] = (actualCounts[i] / total) * 100;
    }

    // Calculate chi-square statistic
    let chiSquare = 0;
    for (let i = 1; i <= 9; i++) {
      const expected = expectedDistribution[i];
      const actual = actualCounts[i];
      if (expected > 0) {
        chiSquare += Math.pow(actual - expected, 2) / expected;
      }
    }

    // Critical value for chi-square with 8 degrees of freedom at 0.05 significance level is ~15.51
    // Higher chi-square indicates greater deviation from Benford's Law
    const violation = chiSquare > 15.51;

    return {
      violation,
      chiSquare,
      expectedDistribution,
      actualDistribution,
    };
  }

  /**
   * Detect suspiciously round numbers
   * Round numbers (ending in 00, 000, etc.) are more common in fraudulent transactions
   */
  detectRoundNumbers(amounts: number[]): Array<{
    amount: number;
    roundness: "high" | "medium" | "low";
    suspicious: boolean;
  }> {
    const results: Array<{
      amount: number;
      roundness: "high" | "medium" | "low";
      suspicious: boolean;
    }> = [];

    for (const amount of amounts) {
      const absAmount = Math.abs(amount);
      let roundness: "high" | "medium" | "low" = "low";
      let suspicious = false;

      // Check if amount ends in multiple zeros
      const amountStr = absAmount.toFixed(2);
      const decimalPart = amountStr.split(".")[1];
      const integerPart = amountStr.split(".")[0];

      // High roundness: ends in 000 or more
      if (integerPart.endsWith("000") && decimalPart === "00") {
        roundness = "high";
        suspicious = absAmount >= 1000; // Suspicious if >= 1000
      }
      // Medium roundness: ends in 00
      else if (integerPart.endsWith("00") && decimalPart === "00") {
        roundness = "medium";
        suspicious = absAmount >= 100; // Suspicious if >= 100
      }
      // Low roundness: ends in 0
      else if (integerPart.endsWith("0") && decimalPart === "00") {
        roundness = "low";
        suspicious = absAmount >= 1000; // Only suspicious for larger amounts
      }

      if (suspicious) {
        results.push({ amount, roundness, suspicious: true });
      }
    }

    return results;
  }

  /**
   * Analyze timing patterns
   * Unusual timing (e.g., transactions at odd hours, weekends, end of month) can indicate fraud
   */
  analyzeTimingPatterns(dates: Date[]): {
    unusualTiming: boolean;
    patterns: Array<{
      type: "odd_hours" | "weekend" | "end_of_month" | "holiday";
      count: number;
      percentage: number;
    }>;
  } {
    const patterns: Array<{
      type: "odd_hours" | "weekend" | "end_of_month" | "holiday";
      count: number;
      percentage: number;
    }> = [];

    let oddHoursCount = 0;
    let weekendCount = 0;
    let endOfMonthCount = 0;

    for (const date of dates) {
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate();
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

      // Odd hours: outside business hours (before 9 AM or after 6 PM)
      if (hour < 9 || hour >= 18) {
        oddHoursCount++;
      }

      // Weekend
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendCount++;
      }

      // End of month (last 3 days)
      if (dayOfMonth > daysInMonth - 3) {
        endOfMonthCount++;
      }
    }

    const total = dates.length;
    const oddHoursPercentage = (oddHoursCount / total) * 100;
    const weekendPercentage = (weekendCount / total) * 100;
    const endOfMonthPercentage = (endOfMonthCount / total) * 100;

    if (oddHoursPercentage > 30) {
      patterns.push({
        type: "odd_hours",
        count: oddHoursCount,
        percentage: oddHoursPercentage,
      });
    }

    if (weekendPercentage > 20) {
      patterns.push({
        type: "weekend",
        count: weekendCount,
        percentage: weekendPercentage,
      });
    }

    if (endOfMonthPercentage > 40) {
      patterns.push({
        type: "end_of_month",
        count: endOfMonthCount,
        percentage: endOfMonthPercentage,
      });
    }

    const unusualTiming = patterns.length > 0;

    return {
      unusualTiming,
      patterns,
    };
  }

  /**
   * Detect fraud patterns for a client company
   */
  async detectFraudPatterns(
    tenantId: string,
    clientCompanyId: string
  ): Promise<FraudPatternResult> {
    // Verify company belongs to tenant
    const company = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });

    if (!company || company.tenantId !== tenantId) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    // Get transactions for last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const transactions = await prisma.transaction.findMany({
      where: {
        tenantId,
        clientCompanyId,
        date: {
          gte: twelveMonthsAgo,
        },
      },
      include: {
        lines: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    if (transactions.length === 0) {
      return {
        benfordsLawViolation: false,
        roundNumberSuspicious: false,
        unusualTiming: false,
        patterns: [],
      };
    }

    // Extract amounts and dates
    const amounts: number[] = [];
    const dates: Date[] = [];

    transactions.forEach((txn) => {
      dates.push(txn.date);
      const txnAmount = txn.lines.reduce(
        (sum, line) => sum + Number(line.debitAmount) + Number(line.creditAmount),
        0
      );
      amounts.push(txnAmount);
    });

    const patterns: Array<{
      type: "benfords_law" | "round_number" | "unusual_timing" | "circular_transaction" | "vat_pattern" | "invoice_anomaly" | "date_manipulation" | "related_party" | "cross_company";
      severity: "low" | "medium" | "high";
      description: string;
      value?: number;
    }> = [];

    // Benford's Law analysis
    const benfordsResult = this.analyzeBenfordsLaw(amounts);
    if (benfordsResult.violation) {
      patterns.push({
        type: "benfords_law",
        severity: benfordsResult.chiSquare > 25 ? "high" : "medium",
        description: `Benford Yasası ihlali tespit edildi (Chi-square: ${benfordsResult.chiSquare.toFixed(2)})`,
        value: benfordsResult.chiSquare,
      });
    }

    // Round number detection
    const roundNumbers = this.detectRoundNumbers(amounts);
    if (roundNumbers.length > amounts.length * 0.3) {
      // More than 30% are suspiciously round
      patterns.push({
        type: "round_number",
        severity: roundNumbers.length > amounts.length * 0.5 ? "high" : "medium",
        description: `${roundNumbers.length} adet şüpheli yuvarlak sayı tespit edildi (${((roundNumbers.length / amounts.length) * 100).toFixed(1)}%)`,
        value: roundNumbers.length,
      });
    }

    // Timing pattern analysis
    const timingResult = this.analyzeTimingPatterns(dates);
    if (timingResult.unusualTiming) {
      for (const pattern of timingResult.patterns) {
        patterns.push({
          type: "unusual_timing",
          severity: pattern.percentage > 50 ? "high" : pattern.percentage > 30 ? "medium" : "low",
          description: `${pattern.type === "odd_hours" ? "İş saatleri dışı" : pattern.type === "weekend" ? "Hafta sonu" : "Ay sonu"} işlemler: ${pattern.count} adet (${pattern.percentage.toFixed(1)}%)`,
          value: pattern.percentage,
        });
      }
    }

    // Enhanced government-style fraud detection patterns
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientCompanyId,
        issueDate: {
          gte: twelveMonthsAgo,
        },
      },
      include: {
        counterparty: true,
      },
    });

    // Circular transaction detection (A→B→C→A)
    const circularPatterns = await this.detectCircularTransactions(tenantId, clientCompanyId, transactions);
    patterns.push(...circularPatterns);

    // VAT pattern anomalies
    const vatPatterns = this.detectVATPatternAnomalies(invoices);
    patterns.push(...vatPatterns);

    // Invoice number sequence anomalies
    const invoiceAnomalies = this.detectInvoiceNumberAnomalies(invoices);
    patterns.push(...invoiceAnomalies);

    // Date manipulation detection
    const dateManipulation = this.detectDateManipulation(invoices, transactions);
    patterns.push(...dateManipulation);

    // Related party transaction analysis
    const relatedPartyPatterns = await this.detectRelatedPartyTransactions(tenantId, clientCompanyId, transactions, invoices);
    patterns.push(...relatedPartyPatterns);

    // Cross-company pattern matching
    const crossCompanyPatterns = await this.detectCrossCompanyPatterns(tenantId, clientCompanyId, invoices);
    patterns.push(...crossCompanyPatterns);

    return {
      benfordsLawViolation: benfordsResult.violation,
      roundNumberSuspicious: roundNumbers.length > amounts.length * 0.3,
      unusualTiming: timingResult.unusualTiming,
      patterns,
    };
  }

  /**
   * Detect circular transactions (A→B→C→A pattern)
   */
  private async detectCircularTransactions(
    tenantId: string,
    clientCompanyId: string,
    transactions: Array<{ id: string; counterpartyId: string | null; date: Date; lines: Array<{ debitAmount: number; creditAmount: number }> }>
  ): Promise<Array<{
    type: "circular_transaction";
    severity: "low" | "medium" | "high";
    description: string;
    value?: number;
  }>> {
    const patterns: Array<{
      type: "circular_transaction";
      severity: "low" | "medium" | "high";
      description: string;
      value?: number;
    }> = [];

    // Group transactions by counterparty
    const counterpartyMap = new Map<string, Array<{ date: Date; amount: number }>>();

    for (const txn of transactions) {
      if (!txn.counterpartyId) continue;

      const amount = txn.lines.reduce(
        (sum, line) => sum + Number(line.debitAmount) + Number(line.creditAmount),
        0
      );

      if (!counterpartyMap.has(txn.counterpartyId)) {
        counterpartyMap.set(txn.counterpartyId, []);
      }
      counterpartyMap.get(txn.counterpartyId)!.push({ date: txn.date, amount });
    }

    // Check for circular patterns (simplified: same counterparty with back-and-forth transactions)
    const counterparties = Array.from(counterpartyMap.entries());
    for (let i = 0; i < counterparties.length; i++) {
      const [counterpartyId1, txns1] = counterparties[i];
      for (let j = i + 1; j < counterparties.length; j++) {
        const [counterpartyId2, txns2] = counterparties[j];

        // Check if there are transactions between these two counterparties within short time
        for (const txn1 of txns1) {
          for (const txn2 of txns2) {
            const daysDiff = Math.abs((txn1.date.getTime() - txn2.date.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 7 && Math.abs(txn1.amount - txn2.amount) < txn1.amount * 0.1) {
              // Similar amounts within 7 days - potential circular transaction
              patterns.push({
                type: "circular_transaction",
                severity: "high",
                description: `Dairesel işlem deseni tespit edildi: Benzer tutarlı işlemler ${daysDiff.toFixed(0)} gün arayla`,
                value: txn1.amount,
              });
            }
          }
        }
      }
    }

    return patterns;
  }

  /**
   * Detect VAT pattern anomalies
   */
  private detectVATPatternAnomalies(
    invoices: Array<{ taxAmount: number | null; totalAmount: number; issueDate: Date }>
  ): Array<{
    type: "vat_pattern";
    severity: "low" | "medium" | "high";
    description: string;
    value?: number;
  }> {
    const patterns: Array<{
      type: "vat_pattern";
      severity: "low" | "medium" | "high";
      description: string;
      value?: number;
    }> = [];

    // Check for unusual VAT rates (Turkish rates: 0%, 1%, 10%, 18%, 20%)
    const validVATRates = [0, 0.01, 0.10, 0.18, 0.20];
    const suspiciousVATs: number[] = [];

    for (const invoice of invoices) {
      if (!invoice.taxAmount || !invoice.totalAmount) continue;

      const netAmount = invoice.totalAmount - invoice.taxAmount;
      if (netAmount <= 0) continue;

      const vatRate = invoice.taxAmount / netAmount;

      // Check if VAT rate is close to valid rates (within 0.5%)
      const isValidRate = validVATRates.some((rate) => Math.abs(vatRate - rate) < 0.005);

      if (!isValidRate) {
        suspiciousVATs.push(vatRate);
      }
    }

    if (suspiciousVATs.length > invoices.length * 0.1) {
      patterns.push({
        type: "vat_pattern",
        severity: suspiciousVATs.length > invoices.length * 0.2 ? "high" : "medium",
        description: `${suspiciousVATs.length} faturada şüpheli KDV oranı tespit edildi (${((suspiciousVATs.length / invoices.length) * 100).toFixed(1)}%)`,
        value: suspiciousVATs.length,
      });
    }

    // Check for consistent rounding patterns (government flag)
    const roundedAmounts = invoices.filter((inv) => {
      if (!inv.totalAmount) return false;
      const rounded = Math.round(inv.totalAmount);
      return Math.abs(inv.totalAmount - rounded) < 0.01;
    });

    if (roundedAmounts.length > invoices.length * 0.4) {
      patterns.push({
        type: "vat_pattern",
        severity: "medium",
        description: `Yüksek oranda yuvarlak tutarlı faturalar tespit edildi (${((roundedAmounts.length / invoices.length) * 100).toFixed(1)}%) - Devlet kontrolü gerektirebilir`,
        value: roundedAmounts.length,
      });
    }

    return patterns;
  }

  /**
   * Detect invoice number sequence anomalies
   */
  private detectInvoiceNumberAnomalies(
    invoices: Array<{ invoiceNumber: string | null; issueDate: Date }>
  ): Array<{
    type: "invoice_anomaly";
    severity: "low" | "medium" | "high";
    description: string;
    value?: number;
  }> {
    const patterns: Array<{
      type: "invoice_anomaly";
      severity: "low" | "medium" | "high";
      description: string;
      value?: number;
    }> = [];

    // Sort invoices by date
    const sortedInvoices = invoices
      .filter((inv) => inv.invoiceNumber)
      .sort((a, b) => a.issueDate.getTime() - b.issueDate.getTime());

    if (sortedInvoices.length < 2) return patterns;

    // Check for gaps in invoice number sequences
    const gaps: number[] = [];
    for (let i = 1; i < sortedInvoices.length; i++) {
      const prevNum = this.extractInvoiceNumber(sortedInvoices[i - 1].invoiceNumber!);
      const currNum = this.extractInvoiceNumber(sortedInvoices[i].invoiceNumber!);

      if (prevNum !== null && currNum !== null && currNum - prevNum > 10) {
        gaps.push(currNum - prevNum);
      }
    }

    if (gaps.length > sortedInvoices.length * 0.1) {
      patterns.push({
        type: "invoice_anomaly",
        severity: "medium",
        description: `Fatura numarası sırasında ${gaps.length} adet büyük boşluk tespit edildi`,
        value: gaps.length,
      });
    }

    // Check for duplicate invoice numbers
    const invoiceNumbers = new Map<string, number>();
    for (const invoice of sortedInvoices) {
      const num = invoice.invoiceNumber!;
      invoiceNumbers.set(num, (invoiceNumbers.get(num) || 0) + 1);
    }

    const duplicates = Array.from(invoiceNumbers.entries()).filter(([, count]) => count > 1);
    if (duplicates.length > 0) {
      patterns.push({
        type: "invoice_anomaly",
        severity: "high",
        description: `${duplicates.length} adet tekrar eden fatura numarası tespit edildi`,
        value: duplicates.length,
      });
    }

    return patterns;
  }

  /**
   * Extract numeric part from invoice number
   */
  private extractInvoiceNumber(invoiceNumber: string): number | null {
    const match = invoiceNumber.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  /**
   * Detect date manipulation
   */
  private detectDateManipulation(
    invoices: Array<{ issueDate: Date; dueDate: Date | null }>,
    transactions: Array<{ date: Date }>
  ): Array<{
    type: "date_manipulation";
    severity: "low" | "medium" | "high";
    description: string;
    value?: number;
  }> {
    const patterns: Array<{
      type: "date_manipulation";
      severity: "low" | "medium" | "high";
      description: string;
      value?: number;
    }> = [];

    // Check for invoices dated in the future
    const now = new Date();
    const futureInvoices = invoices.filter((inv) => inv.issueDate > now);
    if (futureInvoices.length > 0) {
      patterns.push({
        type: "date_manipulation",
        severity: "high",
        description: `${futureInvoices.length} adet gelecek tarihli fatura tespit edildi`,
        value: futureInvoices.length,
      });
    }

    // Check for transactions with dates far in the past (potential backdating)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oldTransactions = transactions.filter((txn) => txn.date < oneYearAgo);
    if (oldTransactions.length > transactions.length * 0.1) {
      patterns.push({
        type: "date_manipulation",
        severity: "medium",
        description: `${oldTransactions.length} adet eski tarihli işlem tespit edildi (potansiyel geriye dönük kayıt)`,
        value: oldTransactions.length,
      });
    }

    // Check for invoices with due dates before issue dates
    const invalidDueDates = invoices.filter(
      (inv) => inv.dueDate && inv.dueDate < inv.issueDate
    );
    if (invalidDueDates.length > 0) {
      patterns.push({
        type: "date_manipulation",
        severity: "high",
        description: `${invalidDueDates.length} adet faturada vade tarihi, fatura tarihinden önce`,
        value: invalidDueDates.length,
      });
    }

    return patterns;
  }

  /**
   * Detect related party transactions
   */
  private async detectRelatedPartyTransactions(
    tenantId: string,
    clientCompanyId: string,
    transactions: Array<{ counterpartyId: string | null; date: Date }>,
    invoices: Array<{ counterpartyId: string | null }>
  ): Promise<Array<{
    type: "related_party";
    severity: "low" | "medium" | "high";
    description: string;
    value?: number;
  }>> {
    const patterns: Array<{
      type: "related_party";
      severity: "low" | "medium" | "high";
      description: string;
      value?: number;
    }> = [];

    // Get client company
    const company = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });

    if (!company) return patterns;

    // Check for transactions with counterparties that share similar tax numbers or names
    const counterpartyIds = new Set<string>();
    transactions.forEach((txn) => {
      if (txn.counterpartyId) counterpartyIds.add(txn.counterpartyId);
    });
    invoices.forEach((inv) => {
      if (inv.counterpartyId) counterpartyIds.add(inv.counterpartyId);
    });

    // Check for similar tax numbers (potential related parties)
    const counterparties = await prisma.counterparty.findMany({
      where: {
        id: { in: Array.from(counterpartyIds) },
        tenantId,
      },
    });

    const companyTaxNumber = company.taxNumber || "";
    const suspiciousCounterparties = counterparties.filter((cp) => {
      if (!cp.taxNumber) return false;
      // Check if tax numbers are similar (first 6 digits match - potential related company)
      return (
        cp.taxNumber.substring(0, 6) === companyTaxNumber.substring(0, 6) &&
        cp.taxNumber !== companyTaxNumber
      );
    });

    if (suspiciousCounterparties.length > 0) {
      patterns.push({
        type: "related_party",
        severity: "medium",
        description: `${suspiciousCounterparties.length} adet ilişkili taraf işlemi tespit edildi (benzer vergi numarası)`,
        value: suspiciousCounterparties.length,
      });
    }

    return patterns;
  }

  /**
   * Detect cross-company pattern matching
   */
  private async detectCrossCompanyPatterns(
    tenantId: string,
    clientCompanyId: string,
    invoices: Array<{ counterpartyId: string | null; totalAmount: number; issueDate: Date }>
  ): Promise<Array<{
    type: "cross_company";
    severity: "low" | "medium" | "high";
    description: string;
    value?: number;
  }>> {
    const patterns: Array<{
      type: "cross_company";
      severity: "low" | "medium" | "high";
      description: string;
      value?: number;
    }> = [];

    // Group invoices by counterparty and check for patterns
    const counterpartyInvoices = new Map<string, Array<{ amount: number; date: Date }>>();

    for (const invoice of invoices) {
      if (!invoice.counterpartyId) continue;
      const key = invoice.counterpartyId;
      if (!counterpartyInvoices.has(key)) {
        counterpartyInvoices.set(key, []);
      }
      counterpartyInvoices.get(key)!.push({
        amount: Number(invoice.totalAmount),
        date: invoice.issueDate,
      });
    }

    // Check for counterparties with suspicious patterns (e.g., all invoices same amount)
    for (const [counterpartyId, invs] of counterpartyInvoices.entries()) {
      if (invs.length < 3) continue;

      // Check if all amounts are identical (suspicious)
      const amounts = invs.map((inv) => inv.amount);
      const uniqueAmounts = new Set(amounts);
      if (uniqueAmounts.size === 1 && amounts.length >= 5) {
        patterns.push({
          type: "cross_company",
          severity: "high",
          description: `Aynı tarafla ${amounts.length} adet aynı tutarlı fatura tespit edildi`,
          value: amounts.length,
        });
      }

      // Check for round number pattern
      const roundAmounts = amounts.filter((amt) => Math.abs(amt - Math.round(amt)) < 0.01);
      if (roundAmounts.length === amounts.length && amounts.length >= 10) {
        patterns.push({
          type: "cross_company",
          severity: "medium",
          description: `Tüm faturalar yuvarlak tutarlı (${amounts.length} adet)`,
          value: amounts.length,
        });
      }
    }

    return patterns;
  }

  /**
   * Check fraud patterns and create alerts
   */
  async checkAndAlertFraudPatterns(
    tenantId: string,
    clientCompanyId: string
  ): Promise<void> {
    const result = await this.detectFraudPatterns(tenantId, clientCompanyId);

    if (result.patterns.length > 0) {
      const highSeverityPatterns = result.patterns.filter((p) => p.severity === "high");
      const severity = highSeverityPatterns.length > 0 ? "high" : "medium";

      const descriptions = result.patterns.map((p) => p.description).join("; ");

      await riskAlertService.createAlert({
        tenantId,
        clientCompanyId,
        documentId: null,
        type: "FRAUD_PATTERN",
        title: "Dolandırıcılık Deseni Tespit Edildi",
        message: `Şüpheli işlem desenleri tespit edildi: ${descriptions}`,
        severity,
        status: "open",
      });
    }
  }
}

export const fraudPatternDetectorService = new FraudPatternDetectorService();


