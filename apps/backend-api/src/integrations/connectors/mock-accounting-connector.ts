import type {
  AccountingIntegrationConnector,
  NormalizedInvoice,
  FetchInvoicesOptions,
} from "./types";

export class MockAccountingConnector implements AccountingIntegrationConnector {
  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    // Simple validation: check if apiKey exists and is non-empty
    if (config.apiKey && typeof config.apiKey === "string" && config.apiKey.trim().length > 0) {
      return { success: true, message: "Bağlantı başarılı." };
    }
    return { success: false, message: "API anahtarı gerekli." };
  }

  async fetchInvoices(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchInvoicesOptions
  ): Promise<NormalizedInvoice[]> {
    // Return deterministic mock invoices for testing
    const mockInvoices: NormalizedInvoice[] = [
      {
        externalId: "INV-2024-001",
        clientCompanyName: "Örnek Müşteri A.Ş.",
        clientCompanyTaxNumber: "1234567890",
        issueDate: new Date("2024-01-15"),
        dueDate: new Date("2024-02-15"),
        totalAmount: 11800.0,
        currency: "TRY",
        taxAmount: 1800.0,
        netAmount: 10000.0,
        counterpartyName: "Örnek Müşteri A.Ş.",
        counterpartyTaxNumber: "1234567890",
        status: "kesildi",
        type: "SATIŞ",
        lines: [
          {
            lineNumber: 1,
            description: "Hizmet Bedeli",
            quantity: 1,
            unitPrice: 10000.0,
            lineTotal: 10000.0,
            vatRate: 0.18,
            vatAmount: 1800.0,
          },
        ],
      },
      {
        externalId: "INV-2024-002",
        clientCompanyName: "Test Şirketi Ltd.",
        clientCompanyTaxNumber: "9876543210",
        issueDate: new Date("2024-01-20"),
        dueDate: new Date("2024-02-20"),
        totalAmount: 5900.0,
        currency: "TRY",
        taxAmount: 900.0,
        netAmount: 5000.0,
        counterpartyName: "Test Şirketi Ltd.",
        counterpartyTaxNumber: "9876543210",
        status: "kesildi",
        type: "SATIŞ",
        lines: [
          {
            lineNumber: 1,
            description: "Danışmanlık Hizmeti",
            quantity: 1,
            unitPrice: 5000.0,
            lineTotal: 5000.0,
            vatRate: 0.18,
            vatAmount: 900.0,
          },
        ],
      },
      {
        externalId: "INV-2024-003",
        clientCompanyName: "Demo Firma",
        clientCompanyTaxNumber: "5555555555",
        issueDate: new Date("2024-01-25"),
        dueDate: new Date("2024-02-25"),
        totalAmount: 23600.0,
        currency: "TRY",
        taxAmount: 3600.0,
        netAmount: 20000.0,
        counterpartyName: "Demo Firma",
        counterpartyTaxNumber: "5555555555",
        status: "taslak",
        type: "ALIŞ",
        lines: [
          {
            lineNumber: 1,
            description: "Mal Alımı",
            quantity: 10,
            unitPrice: 2000.0,
            lineTotal: 20000.0,
            vatRate: 0.18,
            vatAmount: 3600.0,
          },
        ],
      },
      {
        externalId: "INV-2024-004",
        clientCompanyName: "Örnek Müşteri A.Ş.",
        clientCompanyTaxNumber: "1234567890",
        issueDate: new Date("2024-02-01"),
        dueDate: new Date("2024-03-01"),
        totalAmount: 35400.0,
        currency: "TRY",
        taxAmount: 5400.0,
        netAmount: 30000.0,
        counterpartyName: "Örnek Müşteri A.Ş.",
        counterpartyTaxNumber: "1234567890",
        status: "kesildi",
        type: "SATIŞ",
        lines: [
          {
            lineNumber: 1,
            description: "Ürün Satışı",
            quantity: 5,
            unitPrice: 6000.0,
            lineTotal: 30000.0,
            vatRate: 0.18,
            vatAmount: 5400.0,
          },
        ],
      },
      {
        externalId: "INV-2024-005",
        clientCompanyName: "Test Şirketi Ltd.",
        clientCompanyTaxNumber: "9876543210",
        issueDate: new Date("2024-02-10"),
        dueDate: new Date("2024-03-10"),
        totalAmount: 11800.0,
        currency: "TRY",
        taxAmount: 1800.0,
        netAmount: 10000.0,
        counterpartyName: "Test Şirketi Ltd.",
        counterpartyTaxNumber: "9876543210",
        status: "kesildi",
        type: "SATIŞ",
        lines: [
          {
            lineNumber: 1,
            description: "Yazılım Lisansı",
            quantity: 1,
            unitPrice: 10000.0,
            lineTotal: 10000.0,
            vatRate: 0.18,
            vatAmount: 1800.0,
          },
        ],
      },
    ];

    // Filter by date range
    return mockInvoices.filter(
      (inv) => inv.issueDate >= sinceDate && inv.issueDate <= untilDate
    );
  }
}



