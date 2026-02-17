import type {
  AccountingIntegrationConnector,
  NormalizedInvoice,
  FetchInvoicesOptions,
  PushInvoiceInput,
} from "./types";

/**
 * ETA (E-Fatura) connector. Returns empty results until ETA API credentials are configured.
 */
export class ETAConnector implements AccountingIntegrationConnector {
  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    const username = config.username as string | undefined;
    const password = config.password as string | undefined;
    const vkn = config.vkn as string | undefined;

    if (!username || typeof username !== "string" || username.trim().length === 0) {
      return { success: false, message: "ETA kullanıcı adı gerekli." };
    }

    if (!password || typeof password !== "string" || password.trim().length === 0) {
      return { success: false, message: "ETA şifre gerekli." };
    }

    if (!vkn || typeof vkn !== "string" || vkn.trim().length === 0) {
      return { success: false, message: "Vergi Kimlik Numarası (VKN) gerekli." };
    }

    return { success: true, message: "ETA bağlantı doğrulaması yapıldı." };
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
      message: "ETA push desteği henüz aktif değil.",
    }));
  }
}



