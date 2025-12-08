import type {
  BankIntegrationConnector,
  NormalizedBankTransaction,
  FetchTransactionsOptions,
} from "./types";

export class MockBankConnector implements BankIntegrationConnector {
  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    if (config.apiKey && typeof config.apiKey === "string" && config.apiKey.trim().length > 0) {
      return { success: true, message: "Bağlantı başarılı." };
    }
    return { success: false, message: "API anahtarı gerekli." };
  }

  async fetchTransactions(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchTransactionsOptions
  ): Promise<NormalizedBankTransaction[]> {
    const mockTransactions: NormalizedBankTransaction[] = [
      {
        externalId: "TXN-2024-001",
        accountIdentifier: "TR330006100519786457841326",
        bookingDate: new Date("2024-01-15"),
        valueDate: new Date("2024-01-15"),
        description: "Fatura Ödemesi - INV-2024-001",
        amount: 11800.0,
        currency: "TRY",
        balanceAfter: 50000.0,
      },
      {
        externalId: "TXN-2024-002",
        accountIdentifier: "TR330006100519786457841326",
        bookingDate: new Date("2024-01-18"),
        valueDate: new Date("2024-01-18"),
        description: "Maaş Ödemesi",
        amount: -50000.0,
        currency: "TRY",
        balanceAfter: 0.0,
      },
      {
        externalId: "TXN-2024-003",
        accountIdentifier: "TR330006100519786457841326",
        bookingDate: new Date("2024-01-20"),
        valueDate: new Date("2024-01-20"),
        description: "Fatura Ödemesi - INV-2024-002",
        amount: 5900.0,
        currency: "TRY",
        balanceAfter: 5900.0,
      },
      {
        externalId: "TXN-2024-004",
        accountIdentifier: "TR330006100519786457841326",
        bookingDate: new Date("2024-01-22"),
        valueDate: new Date("2024-01-22"),
        description: "Kira Ödemesi",
        amount: -10000.0,
        currency: "TRY",
        balanceAfter: -4100.0,
      },
      {
        externalId: "TXN-2024-005",
        accountIdentifier: "TR330006100519786457841326",
        bookingDate: new Date("2024-02-01"),
        valueDate: new Date("2024-02-01"),
        description: "Fatura Ödemesi - INV-2024-004",
        amount: 35400.0,
        currency: "TRY",
        balanceAfter: 31300.0,
      },
      {
        externalId: "TXN-2024-006",
        accountIdentifier: "TR330006100519786457841326",
        bookingDate: new Date("2024-02-05"),
        valueDate: new Date("2024-02-05"),
        description: "Vergi Ödemesi",
        amount: -5000.0,
        currency: "TRY",
        balanceAfter: 26300.0,
      },
    ];

    let filtered = mockTransactions.filter(
      (txn) => txn.bookingDate >= sinceDate && txn.bookingDate <= untilDate
    );

    if (options?.accountIdentifier) {
      filtered = filtered.filter((txn) => txn.accountIdentifier === options.accountIdentifier);
    }

    return filtered;
  }
}




