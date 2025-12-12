import type {
  AccountingIntegrationConnector,
  NormalizedInvoice,
  FetchInvoicesOptions,
  PushInvoiceInput,
} from "./types";

/**
 * Mikro Accounting Integration Connector
 * 
 * This connector integrates with Mikro (mikro.com.tr) accounting software.
 * 
 * TODO: Review Mikro API documentation and implement actual API calls.
 * This is a stub implementation that follows the connector pattern.
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

    // TODO: Implement actual API connection test
    return { success: true, message: "Mikro bağlantısı başarılı (stub)." };
  }

  async fetchInvoices(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchInvoicesOptions
  ): Promise<NormalizedInvoice[]> {
    // TODO: Implement actual API call to fetch invoices from Mikro
    console.warn(
      "MikroAccountingConnector.fetchInvoices() is using stub implementation. " +
      "Please implement actual API calls when Mikro API documentation is available."
    );

    return [];
  }

  async pushInvoices(
    invoices: PushInvoiceInput[],
    config: Record<string, unknown>
  ): Promise<Array<{ success: boolean; externalId?: string; message?: string }>> {
    console.warn("MikroAccountingConnector.pushInvoices() is using stub implementation.");
    return invoices.map((invoice) => ({
      success: false,
      message: "Push işlemi henüz implement edilmedi.",
    }));
  }
}


