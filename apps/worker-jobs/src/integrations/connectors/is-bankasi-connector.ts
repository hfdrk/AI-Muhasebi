import type {
  BankIntegrationConnector,
  NormalizedBankTransaction,
  FetchTransactionsOptions,
  PushTransactionInput,
} from "./types";

/**
 * İş Bankası (Isbank) Integration Connector
 * 
 * This connector integrates with İş Bankası (isbank.com.tr) bank API.
 * 
 * TODO: Review İş Bankası API documentation and implement actual API calls.
 * This is a stub implementation that follows the connector pattern.
 */
export class IsBankasiConnector implements BankIntegrationConnector {
  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    const clientId = config.clientId as string | undefined;
    const clientSecret = config.clientSecret as string | undefined;
    const accountNumber = config.accountNumber as string | undefined;

    if (!clientId || typeof clientId !== "string" || clientId.trim().length === 0) {
      return { success: false, message: "İş Bankası client ID gerekli." };
    }

    if (!clientSecret || typeof clientSecret !== "string" || clientSecret.trim().length === 0) {
      return { success: false, message: "İş Bankası client secret gerekli." };
    }

    if (!accountNumber || typeof accountNumber !== "string" || accountNumber.trim().length === 0) {
      return { success: false, message: "Hesap numarası gerekli." };
    }

    // TODO: Implement actual API connection test
    return { success: true, message: "İş Bankası bağlantısı başarılı (stub)." };
  }

  async fetchTransactions(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchTransactionsOptions
  ): Promise<NormalizedBankTransaction[]> {
    // TODO: Implement actual API call to fetch transactions from İş Bankası
    console.warn(
      "IsBankasiConnector.fetchTransactions() is using stub implementation. " +
      "Please implement actual API calls when İş Bankası API documentation is available."
    );

    return [];
  }

  async pushTransactions(
    transactions: PushTransactionInput[],
    config: Record<string, unknown>
  ): Promise<Array<{ success: boolean; externalId?: string; message?: string }>> {
    console.warn("IsBankasiConnector.pushTransactions() is using stub implementation.");
    return transactions.map((transaction) => ({
      success: false,
      message: "Push işlemi henüz implement edilmedi.",
    }));
  }
}

