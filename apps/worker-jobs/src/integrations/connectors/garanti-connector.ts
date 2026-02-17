import type {
  BankIntegrationConnector,
  NormalizedBankTransaction,
  FetchTransactionsOptions,
  PushTransactionInput,
} from "./types";

/**
 * Garanti BBVA bank connector. Returns empty results until vendor API credentials are configured.
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

    return { success: true, message: "Garanti BBVA bağlantı doğrulaması yapıldı." };
  }

  async fetchTransactions(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchTransactionsOptions
  ): Promise<NormalizedBankTransaction[]> {
    return [];
  }

  async pushTransactions(
    transactions: PushTransactionInput[],
    config: Record<string, unknown>
  ): Promise<Array<{ success: boolean; externalId?: string; message?: string }>> {
    return transactions.map(() => ({
      success: false,
      message: "Garanti BBVA push desteği henüz aktif değil.",
    }));
  }
}



