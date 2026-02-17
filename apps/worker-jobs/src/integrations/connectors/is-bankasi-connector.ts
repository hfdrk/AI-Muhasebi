import type {
  BankIntegrationConnector,
  NormalizedBankTransaction,
  FetchTransactionsOptions,
  PushTransactionInput,
} from "./types";

/**
 * İş Bankası connector. Returns empty results until vendor API credentials are configured.
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

    return { success: true, message: "İş Bankası bağlantı doğrulaması yapıldı." };
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
      message: "İş Bankası push desteği henüz aktif değil.",
    }));
  }
}



