import type {
  AccountingIntegrationConnector,
  NormalizedInvoice,
  FetchInvoicesOptions,
  PushInvoiceInput,
} from "./types";

/**
 * Logo Accounting Integration Connector
 * 
 * This connector integrates with Logo (logo.com.tr) accounting software.
 * 
 * TODO: Review Logo API documentation and implement actual API calls.
 * This is a stub implementation that follows the connector pattern.
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

    // TODO: Implement actual API connection test
    return { success: true, message: "Logo bağlantısı başarılı (stub)." };
  }

  async fetchInvoices(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchInvoicesOptions
  ): Promise<NormalizedInvoice[]> {
    // TODO: Implement actual API call to fetch invoices from Logo
    console.warn(
      "LogoAccountingConnector.fetchInvoices() is using stub implementation. " +
      "Please implement actual API calls when Logo API documentation is available."
    );

    return [];
  }

  async pushInvoices(
    invoices: PushInvoiceInput[],
    config: Record<string, unknown>
  ): Promise<Array<{ success: boolean; externalId?: string; message?: string }>> {
    console.warn("LogoAccountingConnector.pushInvoices() is using stub implementation.");
    return invoices.map((invoice) => ({
      success: false,
      message: "Push işlemi henüz implement edilmedi.",
    }));
  }
}


