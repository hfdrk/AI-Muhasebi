import { prisma } from "../lib/prisma";

export interface AnomalyFlag {
  type: "EXPENSE_SPIKE" | "LARGE_TRANSACTION" | "UNUSUAL_ACCOUNT";
  description: string;
  severity: "low" | "medium" | "high";
  value: number;
  threshold: number;
  accountCode?: string;
  accountName?: string;
}

export interface AnomalyDetectionResult {
  anomalies: AnomalyFlag[];
  hasAnomalies: boolean;
}

export class AnomalyDetectorService {
  private readonly ANOMALY_THRESHOLD_FACTOR = 2.5; // Flag if value > mean * 2.5

  /**
   * Detect anomalies for a client company
   */
  async detectAnomalies(tenantId: string, clientCompanyId: string): Promise<AnomalyDetectionResult> {
    // Verify company belongs to tenant
    const company = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });

    if (!company || company.tenantId !== tenantId) {
      throw new Error("Client company not found");
    }

    const anomalies: AnomalyFlag[] = [];

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
        lines: {
          include: {
            ledgerAccount: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    if (transactions.length === 0) {
      return {
        anomalies: [],
        hasAnomalies: false,
      };
    }

    // Group transactions by month and ledger account
    const monthlyData = this.groupByMonthAndAccount(transactions);

    // Get latest month
    const latestMonth = Array.from(monthlyData.keys()).sort().reverse()[0];
    if (!latestMonth) {
      return {
        anomalies: [],
        hasAnomalies: false,
      };
    }

    const latestMonthData = monthlyData.get(latestMonth)!;

    // Calculate historical mean (excluding latest month)
    const historicalMonths = Array.from(monthlyData.keys())
      .filter((month) => month !== latestMonth)
      .sort();

    if (historicalMonths.length === 0) {
      return {
        anomalies: [],
        hasAnomalies: false,
      };
    }

    // Check for expense spikes per account
    for (const [accountCode, latestAmount] of latestMonthData.entries()) {
      const historicalAmounts = historicalMonths
        .map((month) => monthlyData.get(month)?.get(accountCode) || 0)
        .filter((amount) => amount > 0);

      if (historicalAmounts.length === 0) continue;

      const historicalMean = historicalAmounts.reduce((sum, val) => sum + val, 0) / historicalAmounts.length;
      const threshold = historicalMean * this.ANOMALY_THRESHOLD_FACTOR;

      if (latestAmount > threshold) {
        const account = await prisma.ledgerAccount.findFirst({
          where: {
            tenantId,
            code: accountCode,
          },
        });

        anomalies.push({
          type: "EXPENSE_SPIKE",
          description: `${account?.name || accountCode} hesabında anormal harcama artışı tespit edildi`,
          severity: this.determineAnomalySeverity(latestAmount, threshold),
          value: latestAmount,
          threshold,
          accountCode,
          accountName: account?.name || undefined,
        });
      }
    }

    // Check for unusually large single transactions
    const historicalAvgTransaction = this.calculateAverageTransactionAmount(transactions.slice(1)); // Exclude latest
    const latestTransactions = transactions.filter((t) => {
      const tMonth = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
      return tMonth === latestMonth;
    });

    for (const transaction of latestTransactions) {
      const transactionTotal = transaction.lines.reduce((sum, line) => {
        return sum + Number(line.debitAmount) + Number(line.creditAmount);
      }, 0);

      const threshold = historicalAvgTransaction * this.ANOMALY_THRESHOLD_FACTOR;

      if (transactionTotal > threshold) {
        anomalies.push({
          type: "LARGE_TRANSACTION",
          description: `Anormal derecede büyük işlem tespit edildi: ${transaction.referenceNo || transaction.id.substring(0, 8)}`,
          severity: this.determineAnomalySeverity(transactionTotal, threshold),
          value: transactionTotal,
          threshold,
        });
      }
    }

    // Check for transactions in unusual accounts
    const commonAccounts = this.getCommonAccounts(historicalMonths, monthlyData);
    const latestMonthAccounts = new Set(latestMonthData.keys());

    for (const accountCode of latestMonthAccounts) {
      if (!commonAccounts.has(accountCode)) {
        const account = await prisma.ledgerAccount.findFirst({
          where: {
            tenantId,
            code: accountCode,
          },
        });

        anomalies.push({
          type: "UNUSUAL_ACCOUNT",
          description: `Bu müşteri için alışılmadık hesap kullanımı: ${account?.name || accountCode}`,
          severity: "medium",
          value: latestMonthData.get(accountCode) || 0,
          threshold: 0,
          accountCode,
          accountName: account?.name || undefined,
        });
      }
    }

    return {
      anomalies,
      hasAnomalies: anomalies.length > 0,
    };
  }

  /**
   * Group transactions by month and account
   */
  private groupByMonthAndAccount(transactions: any[]): Map<string, Map<string, number>> {
    const monthlyData = new Map<string, Map<string, number>>();

    for (const transaction of transactions) {
      const month = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData.has(month)) {
        monthlyData.set(month, new Map<string, number>());
      }

      const monthData = monthlyData.get(month)!;

      for (const line of transaction.lines) {
        const accountCode = line.ledgerAccount.code;
        const amount = Number(line.debitAmount) + Number(line.creditAmount);

        monthData.set(accountCode, (monthData.get(accountCode) || 0) + amount);
      }
    }

    return monthlyData;
  }

  /**
   * Calculate average transaction amount
   */
  private calculateAverageTransactionAmount(transactions: any[]): number {
    if (transactions.length === 0) return 0;

    const total = transactions.reduce((sum, t) => {
      const transactionTotal = t.lines.reduce((lineSum: number, line: any) => {
        return lineSum + Number(line.debitAmount) + Number(line.creditAmount);
      }, 0);
      return sum + transactionTotal;
    }, 0);

    return total / transactions.length;
  }

  /**
   * Get common accounts (accounts used in at least 50% of historical months)
   */
  private getCommonAccounts(historicalMonths: string[], monthlyData: Map<string, Map<string, number>>): Set<string> {
    const accountUsage = new Map<string, number>();

    for (const month of historicalMonths) {
      const monthData = monthlyData.get(month);
      if (!monthData) continue;

      for (const accountCode of monthData.keys()) {
        accountUsage.set(accountCode, (accountUsage.get(accountCode) || 0) + 1);
      }
    }

    const threshold = Math.ceil(historicalMonths.length * 0.5); // At least 50% of months
    const commonAccounts = new Set<string>();

    for (const [accountCode, usageCount] of accountUsage.entries()) {
      if (usageCount >= threshold) {
        commonAccounts.add(accountCode);
      }
    }

    return commonAccounts;
  }

  /**
   * Determine anomaly severity based on how much it exceeds threshold
   */
  private determineAnomalySeverity(value: number, threshold: number): "low" | "medium" | "high" {
    const ratio = value / threshold;
    if (ratio >= 3) return "high";
    if (ratio >= 2) return "medium";
    return "low";
  }
}

export const anomalyDetectorService = new AnomalyDetectorService();

