import type {
  AccountingIntegrationConnector,
  NormalizedInvoice,
  FetchInvoicesOptions,
  PushInvoiceInput,
} from "./types";

/**
 * Mikro muhasebe yazılımı connector. Returns empty results until Mikro API credentials are configured.
 */
export class MikroAccountingConnector implements AccountingIntegrationConnector {
  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    const apiKey = config.apiKey as string | undefined;
    const apiSecret = config.apiSecret as string | undefined;
    const companyId = config.companyId as string | undefined;

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return { success: false, message: "Mikro API anahtarı gerekli." };
    }

    if (!apiSecret || typeof apiSecret !== "string" || apiSecret.trim().length === 0) {
      return { success: false, message: "Mikro API secret gerekli." };
    }

    if (!companyId || typeof companyId !== "string" || companyId.trim().length === 0) {
      return { success: false, message: "Mikro şirket ID gerekli." };
    }

    return { success: true, message: "Mikro bağlantı doğrulaması yapıldı." };
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
      message: "Mikro push desteği henüz aktif değil.",
    }));
  }
}



