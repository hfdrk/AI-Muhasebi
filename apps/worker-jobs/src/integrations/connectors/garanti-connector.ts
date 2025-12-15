import type {
  BankIntegrationConnector,
  NormalizedBankTransaction,
  FetchTransactionsOptions,
  PushTransactionInput,
} from "./types";

/**
 * Garanti BBVA Integration Connector
 * 
 * This connector integrates with Garanti BBVA (garantibbva.com.tr) bank API.
 * 
 * TODO: Review Garanti BBVA API documentation and implement actual API calls.
 * This is a stub implementation that follows the connector pattern.
 */
export class GarantiConnector implements BankIntegrationConnector {
  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    const apiKey = config.apiKey as string | undefined;
    const apiSecret = config.apiSecret as string | undefined;
    const customerNumber = config.customerNumber as string | undefined;

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return { success: false, message: "Garanti BBVA API anahtarı gerekli." };
    }

    if (!apiSecret || typeof apiSecret !== "string" || apiSecret.trim().length === 0) {
      return { success: false, message: "Garanti BBVA API secret gerekli." };
    }

    if (!customerNumber || typeof customerNumber !== "string" || customerNumber.trim().length === 0) {
      return { success: false, message: "Müşteri numarası gerekli." };
    }

    // TODO: Implement actual API connection test
    return { success: true, message: "Garanti BBVA bağlantısı başarılı (stub)." };
  }

  async fetchTransactions(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchTransactionsOptions
  ): Promise<NormalizedBankTransaction[]> {
    // TODO: Implement actual API call to fetch transactions from Garanti BBVA
    console.warn(
      "GarantiConnector.fetchTransactions() is using stub implementation. " +
      "Please implement actual API calls when Garanti BBVA API documentation is available."
    );

    return [];
  }

  async pushTransactions(
    transactions: PushTransactionInput[],
    config: Record<string, unknown>
  ): Promise<Array<{ success: boolean; externalId?: string; message?: string }>> {
    console.warn("GarantiConnector.pushTransactions() is using stub implementation.");
    return transactions.map((transaction) => ({
      success: false,
      message: "Push işlemi henüz implement edilmedi.",
    }));
  }
}



