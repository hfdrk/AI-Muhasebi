import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import { riskAlertService } from "./risk-alert-service";

export interface CounterpartyHistory {
  counterpartyName: string;
  counterpartyTaxNumber: string | null;
  firstSeenDate: Date;
  lastSeenDate: Date;
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
}

export interface CounterpartyAnalysisResult {
  isNewCounterparty: boolean;
  isUnusualCounterparty: boolean;
  counterpartyHistory: CounterpartyHistory | null;
  unusualPatterns: string[];
}

export class CounterpartyAnalysisService {
  /**
   * Analyze counterparty for a transaction or invoice
   */
  async analyzeCounterparty(
    tenantId: string,
    clientCompanyId: string,
    counterpartyName: string,
    counterpartyTaxNumber: string | null,
    amount: number,
    date: Date
  ): Promise<CounterpartyAnalysisResult> {
    // Get counterparty history for this client company
    const history = await this.getCounterpartyHistory(
      tenantId,
      clientCompanyId,
      counterpartyName,
      counterpartyTaxNumber
    );

    const isNewCounterparty = !history;
    const unusualPatterns: string[] = [];

    if (isNewCounterparty) {
      unusualPatterns.push("Yeni karşı taraf - ilk kez görülüyor");
    } else {
      // Check for unusual patterns
      const daysSinceLastSeen = Math.floor(
        (date.getTime() - history.lastSeenDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Unusual if not seen in last 90 days
      if (daysSinceLastSeen > 90) {
        unusualPatterns.push(`Uzun süre görülmeyen karşı taraf (${daysSinceLastSeen} gün)`);
      }

      // Unusual if amount is significantly higher than average
      if (history.averageAmount > 0 && amount > history.averageAmount * 3) {
        unusualPatterns.push(
          `Anormal derecede yüksek tutar (ortalama: ${history.averageAmount.toFixed(2)}, mevcut: ${amount.toFixed(2)})`
        );
      }

      // Unusual if sudden change in transaction frequency
      const expectedFrequency = history.transactionCount / Math.max(
        1,
        Math.floor((date.getTime() - history.firstSeenDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      if (expectedFrequency > 0 && daysSinceLastSeen < 7 && expectedFrequency < 0.1) {
        unusualPatterns.push("Ani işlem sıklığı değişikliği");
      }
    }

    const isUnusualCounterparty = unusualPatterns.length > 0;

    return {
      isNewCounterparty,
      isUnusualCounterparty,
      counterpartyHistory: history,
      unusualPatterns,
    };
  }

  /**
   * Get counterparty history for a client company
   */
  async getCounterpartyHistory(
    tenantId: string,
    clientCompanyId: string,
    counterpartyName: string,
    counterpartyTaxNumber: string | null
  ): Promise<CounterpartyHistory | null> {
    // Get all invoices and transactions with this counterparty
    const [invoices, transactions] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          tenantId,
          clientCompanyId,
          OR: [
            { counterpartyName },
            ...(counterpartyTaxNumber ? [{ counterpartyTaxNumber }] : []),
          ],
        },
        select: {
          issueDate: true,
          totalAmount: true,
        },
        orderBy: { issueDate: "asc" },
      }),
      prisma.transaction.findMany({
        where: {
          tenantId,
          clientCompanyId,
          description: {
            contains: counterpartyName,
          },
        },
        select: {
          date: true,
          lines: {
            select: {
              debitAmount: true,
              creditAmount: true,
            },
          },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    if (invoices.length === 0 && transactions.length === 0) {
      return null;
    }

    // Combine dates and amounts
    const allDates: Date[] = [];
    const allAmounts: number[] = [];

    invoices.forEach((inv) => {
      allDates.push(inv.issueDate);
      allAmounts.push(Number(inv.totalAmount));
    });

    transactions.forEach((txn) => {
      allDates.push(txn.date);
      const txnAmount = txn.lines.reduce(
        (sum, line) => sum + Number(line.debitAmount) + Number(line.creditAmount),
        0
      );
      allAmounts.push(txnAmount);
    });

    if (allDates.length === 0) {
      return null;
    }

    const sortedDates = allDates.sort((a, b) => a.getTime() - b.getTime());
    const totalAmount = allAmounts.reduce((sum, amt) => sum + amt, 0);
    const averageAmount = totalAmount / allAmounts.length;

    return {
      counterpartyName,
      counterpartyTaxNumber,
      firstSeenDate: sortedDates[0],
      lastSeenDate: sortedDates[sortedDates.length - 1],
      transactionCount: allDates.length,
      totalAmount,
      averageAmount,
    };
  }

  /**
   * Check and create alerts for unusual counterparties
   */
  async checkAndAlertUnusualCounterparty(
    tenantId: string,
    clientCompanyId: string,
    counterpartyName: string,
    counterpartyTaxNumber: string | null,
    amount: number,
    date: Date,
    invoiceId?: string,
    transactionId?: string
  ): Promise<void> {
    const analysis = await this.analyzeCounterparty(
      tenantId,
      clientCompanyId,
      counterpartyName,
      counterpartyTaxNumber,
      amount,
      date
    );

    if (analysis.isUnusualCounterparty) {
      const severity = analysis.isNewCounterparty ? "high" : "medium";
      const title = analysis.isNewCounterparty
        ? "Yeni Karşı Taraf Tespit Edildi"
        : "Alışılmadık Karşı Taraf Tespit Edildi";

      await riskAlertService.createAlert({
        tenantId,
        clientCompanyId,
        documentId: null,
        type: "UNUSUAL_COUNTERPARTY",
        title,
        message: `${counterpartyName} için alışılmadık bir işlem tespit edildi: ${analysis.unusualPatterns.join(", ")}`,
        severity,
        status: "open",
      });
    }
  }

  /**
   * Get all counterparties for a client company
   */
  async listCounterparties(
    tenantId: string,
    clientCompanyId: string
  ): Promise<CounterpartyHistory[]> {
    // Get unique counterparties from invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientCompanyId,
        counterpartyName: { not: null },
      },
      select: {
        counterpartyName: true,
        counterpartyTaxNumber: true,
      },
      distinct: ["counterpartyName", "counterpartyTaxNumber"],
    });

    const counterparties: CounterpartyHistory[] = [];

    for (const inv of invoices) {
      if (inv.counterpartyName) {
        const history = await this.getCounterpartyHistory(
          tenantId,
          clientCompanyId,
          inv.counterpartyName,
          inv.counterpartyTaxNumber
        );
        if (history) {
          counterparties.push(history);
        }
      }
    }

    return counterparties.sort((a, b) => b.lastSeenDate.getTime() - a.lastSeenDate.getTime());
  }
}

export const counterpartyAnalysisService = new CounterpartyAnalysisService();

