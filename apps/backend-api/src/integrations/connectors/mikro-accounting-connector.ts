import {
  BaseRESTAccountingConnector,
  type FieldMapping,
  type RESTAccountingConfig,
  type GenericAPIResponse,
} from "./base-rest-accounting-connector";
import type { NormalizedInvoice, FetchInvoicesOptions, PushInvoiceInput } from "./types";
import { logger } from "@repo/shared-utils";

/**
 * Mikro Accounting Configuration
 */
interface MikroConfig extends RESTAccountingConfig {
  // Mikro-specific fields
  licenseKey?: string;
  databaseName?: string;
  period?: string; // Dönem (e.g., "2024")
  firmCode?: string; // Firma kodu
}

/**
 * Mikro Invoice Response Format
 */
interface MikroInvoice {
  EVRAK_NO?: string; // Evrak numarası
  FATURA_NO?: string; // Fatura numarası
  TARIH?: string; // Tarih
  VADE_TARIHI?: string; // Vade tarihi
  TOPLAM_TUTAR?: number; // Toplam tutar
  KDV_TUTARI?: number; // KDV tutarı
  NET_TUTAR?: number; // Net tutar
  DOVIZ_CINSI?: string; // Döviz cinsi
  CARI_HESAP_KODU?: string; // Cari hesap kodu
  CARI_HESAP_ADI?: string; // Cari hesap adı
  VERGI_NO?: string; // Vergi numarası
  EVRAK_TIPI?: string; // Evrak tipi (SATIS/ALIS)
  DURUM?: string; // Durum
  SATIRLAR?: MikroInvoiceLine[]; // Satırlar
}

/**
 * Mikro Invoice Line Format
 */
interface MikroInvoiceLine {
  SATIR_NO?: number;
  STOK_KODU?: string;
  STOK_ADI?: string;
  MIKTAR?: number;
  BIRIM?: string;
  BIRIM_FIYAT?: number;
  TUTAR?: number;
  KDV_ORANI?: number;
  KDV_TUTARI?: number;
  ISKONTO_ORANI?: number;
  ISKONTO_TUTARI?: number;
}

/**
 * Mikro API Response
 */
interface MikroResponse<T> {
  HATA_KODU?: number;
  HATA_MESAJI?: string;
  SONUC?: T;
  SAYFA?: number;
  TOPLAM_SAYFA?: number;
  TOPLAM_KAYIT?: number;
}

/**
 * Mikro Accounting Integration Connector
 *
 * Integrates with Mikro Yazılım accounting software.
 *
 * Mikro API Documentation: https://www.mikro.com.tr/entegrasyon
 *
 * Features:
 * - Invoice fetching and creation
 * - Customer/Supplier sync
 * - Stock/Product management
 * - Journal entry support
 *
 * Mikro Specifics:
 * - Uses firm code and period-based data isolation
 * - Turkish field names in API
 * - License key based authentication
 */
export class MikroAccountingConnector extends BaseRESTAccountingConnector {
  protected connectorName = "Mikro Muhasebe";
  protected defaultBaseUrl = "https://api.mikro.com.tr";

  protected fieldMapping: FieldMapping = {
    externalId: "EVRAK_NO",
    invoiceNumber: "FATURA_NO",
    issueDate: "TARIH",
    dueDate: "VADE_TARIHI",
    totalAmount: "TOPLAM_TUTAR",
    netAmount: "NET_TUTAR",
    taxAmount: "KDV_TUTARI",
    currency: "DOVIZ_CINSI",
    status: "DURUM",
    type: "EVRAK_TIPI",
    customerName: "CARI_HESAP_ADI",
    customerTaxNumber: "VERGI_NO",
    lines: "SATIRLAR",
    lineFields: {
      lineNumber: "SATIR_NO",
      description: "STOK_ADI",
      quantity: "MIKTAR",
      unitPrice: "BIRIM_FIYAT",
      lineTotal: "TUTAR",
      vatRate: "KDV_ORANI",
      vatAmount: "KDV_TUTARI",
    },
  };

  private mikroConfig: MikroConfig | null = null;

  /**
   * Parse Mikro-specific configuration
   */
  protected override parseConfig(config: Record<string, unknown>): RESTAccountingConfig {
    const baseConfig = super.parseConfig(config);

    this.mikroConfig = {
      ...baseConfig,
      licenseKey: config.licenseKey as string | undefined,
      databaseName: config.databaseName as string | undefined,
      period: config.period as string | undefined || new Date().getFullYear().toString(),
      firmCode: config.firmCode as string | undefined || config.companyId as string | undefined,
    };

    // Validate Mikro-specific requirements
    if (!this.mikroConfig.apiKey && !this.mikroConfig.licenseKey) {
      throw new Error("Mikro API anahtarı veya lisans anahtarı gerekli.");
    }

    return this.mikroConfig;
  }

  /**
   * Get invoices endpoint
   */
  protected getInvoicesEndpoint(): string {
    return "/fatura/liste";
  }

  /**
   * Override headers for Mikro-specific authentication
   */
  protected override async getHeaders(): Promise<Record<string, string>> {
    const headers = await super.getHeaders();

    // Mikro-specific headers
    if (this.mikroConfig?.licenseKey) {
      headers["X-Mikro-License"] = this.mikroConfig.licenseKey;
    }
    if (this.mikroConfig?.firmCode) {
      headers["X-Mikro-Firma"] = this.mikroConfig.firmCode;
    }
    if (this.mikroConfig?.period) {
      headers["X-Mikro-Donem"] = this.mikroConfig.period;
    }
    if (this.mikroConfig?.databaseName) {
      headers["X-Mikro-Database"] = this.mikroConfig.databaseName;
    }

    return headers;
  }

  /**
   * Build Mikro-specific fetch parameters
   */
  protected override buildFetchParams(
    sinceDate: Date,
    untilDate: Date,
    page: number,
    pageSize: number,
    options?: FetchInvoicesOptions
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {
      BASLANGIC_TARIHI: this.formatMikroDate(sinceDate),
      BITIS_TARIHI: this.formatMikroDate(untilDate),
      SAYFA: page,
      SAYFA_BOYUTU: pageSize,
    };

    // Add type filter if specified
    if (options?.type) {
      params.EVRAK_TIPI = options.type === "SATIŞ" ? "SATIS" : "ALIS";
    }

    // Add status filter if specified
    if (options?.status) {
      params.DURUM = options.status;
    }

    return params;
  }

  /**
   * Format date for Mikro API (DD.MM.YYYY)
   */
  private formatMikroDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  /**
   * Parse Mikro date format (DD.MM.YYYY)
   */
  private parseMikroDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    // Handle DD.MM.YYYY format
    if (dateStr.includes(".")) {
      const [day, month, year] = dateStr.split(".");
      return new Date(`${year}-${month}-${day}`);
    }
    // Handle ISO format
    return new Date(dateStr);
  }

  /**
   * Extract invoices from Mikro response
   */
  protected override extractInvoices(response: GenericAPIResponse<unknown[]>): Record<string, unknown>[] {
    const mikroResponse = response as unknown as MikroResponse<MikroInvoice[]>;

    if (mikroResponse.HATA_KODU && mikroResponse.HATA_KODU !== 0) {
      logger.error(`[MikroConnector] API Error: ${mikroResponse.HATA_MESAJI}`);
      return [];
    }

    return (mikroResponse.SONUC || []) as unknown as Record<string, unknown>[];
  }

  /**
   * Map Mikro invoice to normalized format
   */
  protected override mapToNormalizedInvoice(inv: Record<string, unknown>): NormalizedInvoice {
    const mikro = inv as unknown as MikroInvoice;

    // Map lines
    const lines = (mikro.SATIRLAR || []).map((line, index) => ({
      lineNumber: line.SATIR_NO || index + 1,
      description: line.STOK_ADI || line.STOK_KODU || "",
      quantity: line.MIKTAR || 1,
      unitPrice: line.BIRIM_FIYAT || 0,
      lineTotal: line.TUTAR || 0,
      vatRate: (line.KDV_ORANI || 18) / 100, // Mikro uses percentage, we use decimal
      vatAmount: line.KDV_TUTARI || 0,
    }));

    // Determine type
    const type = mikro.EVRAK_TIPI?.toUpperCase() === "SATIS" ? "SATIŞ" as const : "ALIŞ" as const;

    return {
      externalId: mikro.EVRAK_NO || mikro.FATURA_NO || "",
      clientCompanyName: mikro.CARI_HESAP_ADI,
      clientCompanyTaxNumber: mikro.VERGI_NO,
      issueDate: this.parseMikroDate(mikro.TARIH || ""),
      dueDate: mikro.VADE_TARIHI ? this.parseMikroDate(mikro.VADE_TARIHI) : null,
      totalAmount: mikro.TOPLAM_TUTAR || 0,
      currency: this.mapMikroCurrency(mikro.DOVIZ_CINSI),
      taxAmount: mikro.KDV_TUTARI || 0,
      netAmount: mikro.NET_TUTAR,
      counterpartyName: mikro.CARI_HESAP_ADI,
      counterpartyTaxNumber: mikro.VERGI_NO,
      status: this.mapMikroStatus(mikro.DURUM),
      type,
      lines,
    };
  }

  /**
   * Map Mikro currency codes to ISO
   */
  private mapMikroCurrency(currency?: string): string {
    const currencyMap: Record<string, string> = {
      "TL": "TRY",
      "TRL": "TRY",
      "YTL": "TRY",
      "USD": "USD",
      "DOLAR": "USD",
      "EUR": "EUR",
      "EURO": "EUR",
      "GBP": "GBP",
      "STERLIN": "GBP",
    };

    return currencyMap[currency?.toUpperCase() || ""] || "TRY";
  }

  /**
   * Map Mikro status to normalized status
   */
  private mapMikroStatus(status?: string): string {
    const statusMap: Record<string, string> = {
      "TASLAK": "taslak",
      "KESILDI": "kesildi",
      "ONAYLANDI": "kesildi",
      "GONDERILDI": "gönderildi",
      "ODENDI": "ödendi",
      "IPTAL": "iptal",
      "BEKLEMEDE": "beklemede",
    };

    return statusMap[status?.toUpperCase() || ""] || status?.toLowerCase() || "kesildi";
  }

  /**
   * Map normalized invoice to Mikro format
   */
  protected override mapToExternalInvoice(invoice: PushInvoiceInput): Record<string, unknown> {
    return {
      FATURA_NO: invoice.externalId,
      TARIH: this.formatMikroDate(invoice.issueDate),
      VADE_TARIHI: invoice.dueDate ? this.formatMikroDate(invoice.dueDate) : null,
      TOPLAM_TUTAR: invoice.totalAmount,
      KDV_TUTARI: invoice.taxAmount,
      NET_TUTAR: invoice.netAmount || (invoice.totalAmount - invoice.taxAmount),
      DOVIZ_CINSI: this.reverseCurrencyMap(invoice.currency),
      CARI_HESAP_ADI: invoice.clientCompanyName || invoice.counterpartyName,
      VERGI_NO: invoice.clientCompanyTaxNumber || invoice.counterpartyTaxNumber,
      EVRAK_TIPI: invoice.type === "SATIŞ" ? "SATIS" : "ALIS",
      SATIRLAR: invoice.lines.map((line, index) => ({
        SATIR_NO: line.lineNumber || index + 1,
        STOK_ADI: line.description,
        MIKTAR: line.quantity,
        BIRIM: "ADET",
        BIRIM_FIYAT: line.unitPrice,
        TUTAR: line.lineTotal,
        KDV_ORANI: line.vatRate * 100, // Convert to percentage
        KDV_TUTARI: line.vatAmount,
      })),
    };
  }

  /**
   * Reverse map currency ISO to Mikro
   */
  private reverseCurrencyMap(currency?: string): string {
    const map: Record<string, string> = {
      "TRY": "TL",
      "USD": "USD",
      "EUR": "EUR",
      "GBP": "GBP",
    };
    return map[currency || ""] || "TL";
  }

  /**
   * Fetch customer/supplier (Cari Hesap) list
   */
  async fetchCustomers(options?: { type?: "customer" | "supplier" }): Promise<MikroCustomer[]> {
    if (!this.config) {
      logger.warn("[MikroConnector] Config bulunamadı.");
      return [];
    }

    try {
      const params: Record<string, unknown> = {
        SAYFA: 1,
        SAYFA_BOYUTU: 1000,
      };

      if (options?.type === "customer") {
        params.HESAP_TIPI = "MUSTERI";
      } else if (options?.type === "supplier") {
        params.HESAP_TIPI = "TEDARIKCI";
      }

      const response = await this.makeRequest<MikroResponse<MikroCustomer[]>>(
        "GET",
        "/cari/liste",
        params
      );

      if (response.HATA_KODU && response.HATA_KODU !== 0) {
        logger.error(`[MikroConnector] Customer fetch error: ${response.HATA_MESAJI}`);
        return [];
      }

      return response.SONUC || [];

    } catch (error) {
      logger.error("[MikroConnector] fetchCustomers error:", error);
      return [];
    }
  }

  /**
   * Fetch stock/product list
   */
  async fetchProducts(): Promise<MikroProduct[]> {
    if (!this.config) {
      logger.warn("[MikroConnector] Config bulunamadı.");
      return [];
    }

    try {
      const response = await this.makeRequest<MikroResponse<MikroProduct[]>>(
        "GET",
        "/stok/liste",
        { SAYFA: 1, SAYFA_BOYUTU: 1000 }
      );

      if (response.HATA_KODU && response.HATA_KODU !== 0) {
        logger.error(`[MikroConnector] Product fetch error: ${response.HATA_MESAJI}`);
        return [];
      }

      return response.SONUC || [];

    } catch (error) {
      logger.error("[MikroConnector] fetchProducts error:", error);
      return [];
    }
  }

  /**
   * Fetch journal entries (Muhasebe Fişi)
   */
  async fetchJournalEntries(
    sinceDate: Date,
    untilDate: Date
  ): Promise<MikroJournalEntry[]> {
    if (!this.config) {
      logger.warn("[MikroConnector] Config bulunamadı.");
      return [];
    }

    try {
      const response = await this.makeRequest<MikroResponse<MikroJournalEntry[]>>(
        "GET",
        "/muhasebe/fis/liste",
        {
          BASLANGIC_TARIHI: this.formatMikroDate(sinceDate),
          BITIS_TARIHI: this.formatMikroDate(untilDate),
          SAYFA: 1,
          SAYFA_BOYUTU: 1000,
        }
      );

      if (response.HATA_KODU && response.HATA_KODU !== 0) {
        logger.error(`[MikroConnector] Journal entry fetch error: ${response.HATA_MESAJI}`);
        return [];
      }

      return response.SONUC || [];

    } catch (error) {
      logger.error("[MikroConnector] fetchJournalEntries error:", error);
      return [];
    }
  }
}

/**
 * Mikro Customer/Supplier (Cari Hesap)
 */
interface MikroCustomer {
  CARI_KOD?: string;
  CARI_ADI?: string;
  VERGI_NO?: string;
  VERGI_DAIRESI?: string;
  ADRES?: string;
  IL?: string;
  ILCE?: string;
  TELEFON?: string;
  EMAIL?: string;
  HESAP_TIPI?: string;
  BAKIYE?: number;
  DOVIZ_BAKIYE?: number;
}

/**
 * Mikro Product (Stok)
 */
interface MikroProduct {
  STOK_KODU?: string;
  STOK_ADI?: string;
  BIRIM?: string;
  KDV_ORANI?: number;
  ALIS_FIYATI?: number;
  SATIS_FIYATI?: number;
  STOK_MIKTARI?: number;
  KATEGORI?: string;
}

/**
 * Mikro Journal Entry (Muhasebe Fişi)
 */
interface MikroJournalEntry {
  FIS_NO?: string;
  FIS_TARIHI?: string;
  FIS_TIPI?: string;
  ACIKLAMA?: string;
  TOPLAM_BORC?: number;
  TOPLAM_ALACAK?: number;
  SATIRLAR?: Array<{
    SATIR_NO?: number;
    HESAP_KODU?: string;
    HESAP_ADI?: string;
    BORC?: number;
    ALACAK?: number;
    ACIKLAMA?: string;
  }>;
}
