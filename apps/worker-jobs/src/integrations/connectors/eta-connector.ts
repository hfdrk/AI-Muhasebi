import type {
  AccountingIntegrationConnector,
  NormalizedInvoice,
  FetchInvoicesOptions,
  PushInvoiceInput,
} from "./types";

/**
 * ETA (Electronic Invoice) Integration Connector
 * 
 * This connector integrates with the Turkish E-Invoice (E-Fatura) system.
 * 
 * TODO: Review ETA API documentation and implement actual API calls.
 * This is a stub implementation that follows the connector pattern.
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

    // TODO: Implement actual API connection test
    return { success: true, message: "ETA bağlantısı başarılı (stub)." };
  }

  async fetchInvoices(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchInvoicesOptions
  ): Promise<NormalizedInvoice[]> {
    // TODO: Implement actual API call to fetch invoices from ETA
    console.warn(
      "ETAConnector.fetchInvoices() is using stub implementation. " +
      "Please implement actual API calls when ETA API documentation is available."
    );

    return [];
  }

  async pushInvoices(
    invoices: PushInvoiceInput[],
    config: Record<string, unknown>
  ): Promise<Array<{ success: boolean; externalId?: string; message?: string }>> {
    console.warn("ETAConnector.pushInvoices() is using stub implementation.");
    return invoices.map((invoice) => ({
      success: false,
      message: "Push işlemi henüz implement edilmedi.",
    }));
  }
}
