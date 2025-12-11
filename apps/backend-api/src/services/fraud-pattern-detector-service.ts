import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import { riskAlertService } from "./risk-alert-service";

export interface FraudPatternResult {
  benfordsLawViolation: boolean;
  roundNumberSuspicious: boolean;
  unusualTiming: boolean;
  patterns: Array<{
    type: "benfords_law" | "round_number" | "unusual_timing";
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
      type: "benfords_law" | "round_number" | "unusual_timing";
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

    return {
      benfordsLawViolation: benfordsResult.violation,
      roundNumberSuspicious: roundNumbers.length > amounts.length * 0.3,
      unusualTiming: timingResult.unusualTiming,
      patterns,
    };
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

