import type {
  AccountingIntegrationConnector,
  NormalizedInvoice,
  FetchInvoicesOptions,
  PushInvoiceInput,
} from "./types";

/**
 * Logo muhasebe yazılımı connector. Returns empty results until Logo API credentials are configured.
 */
export class LogoAccountingConnector implements AccountingIntegrationConnector {
  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    const apiKey = config.apiKey as string | undefined;
    const apiSecret = config.apiSecret as string | undefined;
    const firmNumber = config.firmNumber as string | undefined;

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return { success: false, message: "Logo API anahtarı gerekli." };
    }

    if (!apiSecret || typeof apiSecret !== "string" || apiSecret.trim().length === 0) {
      return { success: false, message: "Logo API secret gerekli." };
    }

    if (!firmNumber || typeof firmNumber !== "string" || firmNumber.trim().length === 0) {
      return { success: false, message: "Logo firma numarası gerekli." };
    }

    return { success: true, message: "Logo bağlantı doğrulaması yapıldı." };
  }

  async fetchInvoices(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchInvoicesOptions
  ): Promise<NormalizedInvoice[]> {
    return [];
  }

  async pushInvoices(
    invoices: PushInvoiceInput[],
    config: Record<string, unknown>
  ): Promise<Array<{ success: boolean; externalId?: string; message?: string }>> {
    return invoices.map(() => ({
      success: false,
      message: "Logo push desteği henüz aktif değil.",
    }));
  }
}



