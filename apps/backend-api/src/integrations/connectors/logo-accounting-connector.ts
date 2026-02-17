import {
  BaseRESTAccountingConnector,
  type FieldMapping,
  type RESTAccountingConfig,
  type GenericAPIResponse,
} from "./base-rest-accounting-connector";
import type { NormalizedInvoice, FetchInvoicesOptions, PushInvoiceInput } from "./types";
import { logger } from "@repo/shared-utils";

/**
 * Logo Accounting Configuration
 */
interface LogoConfig extends RESTAccountingConfig {
  // Logo-specific fields
  firmNumber: string; // Firma numarası (required)
  periodNumber?: string; // Dönem numarası
  warehouseNumber?: string; // Depo numarası
  divisionNumber?: string; // Bölüm numarası
  factoryNumber?: string; // Fabrika numarası

  // Logo API specific
  logoVersion?: "tiger" | "go" | "wings" | "netsis"; // Logo ürün ailesi
}

/**
 * Logo Invoice Format
 */
interface LogoInvoice {
  LOGICALREF?: number; // Dahili referans
  FICHENO?: string; // Fiş numarası
  DATE_?: string; // Tarih
  DOCODE?: string; // Belge kodu
  TRCODE?: number; // İşlem kodu (1=Alış, 2=Satış, 3=İade, etc.)
  GROESSION?: number; // Brüt tutar
  TOTALDISCOUNT?: number; // Toplam iskonto
  NETTOTAL?: number; // Net toplam
  TOTALVAT?: number; // Toplam KDV
  GROSSTOTAL?: number; // Genel toplam
  TRCURR?: number; // Döviz türü (0=TRY, 1=USD, 2=EUR, etc.)
  TRRATE?: number; // Döviz kuru
  CLIENTREF?: number; // Cari hesap referansı
  CLIENTCODE?: string; // Cari hesap kodu
  CLIENTNAME?: string; // Cari hesap adı
  TAXNR?: string; // Vergi numarası
  TAXOFFICE?: string; // Vergi dairesi
  STATUS?: number; // Durum (0=Taslak, 1=Onaylı, 2=İptal)
  EINVOICE?: number; // E-Fatura mı? (0=Hayır, 1=Evet)
  EINVOICESTATUS?: number; // E-Fatura durumu
  TRANSACTIONS?: LogoInvoiceLine[];
}

/**
 * Logo Invoice Line Format
 */
interface LogoInvoiceLine {
  LINENO_?: number;
  STOCKREF?: number;
  STOCKCODE?: string;
  STOCKNAME?: string;
  AMOUNT?: number;
  PRICE?: number;
  TOTAL?: number;
  DISCPER?: number;
  DISCAMOUNT?: number;
  VATRATE?: number;
  VATAMOUNT?: number;
  LINENET?: number;
  UOMREF?: number;
  UOMCODE?: string;
}

/**
 * Logo API Response Format
 */
interface LogoResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
  };
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

/**
 * Logo Accounting Integration Connector
 *
 * Integrates with Logo Yazılım accounting products:
 * - Logo Tiger (Enterprise)
 * - Logo Go (SMB)
 * - Logo Wings (Cloud)
 * - Netsis (Legacy ERP)
 *
 * Logo API Documentation: https://docs.logo.com.tr
 *
 * Features:
 * - Invoice fetching and creation
 * - Customer/Supplier management
 * - Stock/Product sync
 * - Financial reports
 * - E-Fatura integration
 *
 * Logo Specifics:
 * - Uses firm number and period for data isolation
 * - TRCODE determines invoice type
 * - LOGICALREF is internal reference ID
 */
export class LogoAccountingConnector extends BaseRESTAccountingConnector {
  protected connectorName = "Logo Muhasebe";
  protected defaultBaseUrl = "https://api.logo.com.tr/v1";

  protected fieldMapping: FieldMapping = {
    externalId: "LOGICALREF",
    invoiceNumber: "FICHENO",
    issueDate: "DATE_",
    totalAmount: "GROSSTOTAL",
    netAmount: "NETTOTAL",
    taxAmount: "TOTALVAT",
    status: "STATUS",
    type: "TRCODE",
    customerName: "CLIENTNAME",
    customerTaxNumber: "TAXNR",
    lines: "TRANSACTIONS",
    lineFields: {
      lineNumber: "LINENO_",
      description: "STOCKNAME",
      quantity: "AMOUNT",
      unitPrice: "PRICE",
      lineTotal: "LINENET",
      vatRate: "VATRATE",
      vatAmount: "VATAMOUNT",
    },
  };

  private logoConfig: LogoConfig | null = null;
  protected accessToken: string | null = null;
  protected tokenExpiresAt: Date | null = null;

  /**
   * Parse Logo-specific configuration
   */
  protected override parseConfig(config: Record<string, unknown>): RESTAccountingConfig {
    const baseConfig = super.parseConfig(config);

    const firmNumber = config.firmNumber as string | undefined;
    if (!firmNumber) {
      throw new Error("Logo firma numarası gerekli.");
    }

    this.logoConfig = {
      ...baseConfig,
      firmNumber,
      periodNumber: config.periodNumber as string | undefined || "01",
      warehouseNumber: config.warehouseNumber as string | undefined || "0",
      divisionNumber: config.divisionNumber as string | undefined,
      factoryNumber: config.factoryNumber as string | undefined,
      logoVersion: config.logoVersion as "tiger" | "go" | "wings" | "netsis" | undefined || "tiger",
    };

    return this.logoConfig;
  }

  /**
   * Get invoices endpoint
   */
  protected getInvoicesEndpoint(): string {
    // Logo uses different endpoints based on version
    switch (this.logoConfig?.logoVersion) {
      case "go":
        return "/go/invoices";
      case "wings":
        return "/wings/invoices";
      case "netsis":
        return "/netsis/fatura";
      case "tiger":
      default:
        return "/tiger/invoices";
    }
  }

  /**
   * Override headers for Logo-specific authentication
   */
  protected override async getHeaders(): Promise<Record<string, string>> {
    const headers = await super.getHeaders();

    // Ensure we have a valid access token
    await this.ensureAuthenticated();

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    // Logo-specific headers
    if (this.logoConfig?.firmNumber) {
      headers["X-Logo-Firm"] = this.logoConfig.firmNumber;
    }
    if (this.logoConfig?.periodNumber) {
      headers["X-Logo-Period"] = this.logoConfig.periodNumber;
    }
    if (this.logoConfig?.warehouseNumber) {
      headers["X-Logo-Warehouse"] = this.logoConfig.warehouseNumber;
    }
    if (this.logoConfig?.divisionNumber) {
      headers["X-Logo-Division"] = this.logoConfig.divisionNumber;
    }

    return headers;
  }

  /**
   * Ensure we have a valid authentication token
   */
  private async ensureAuthenticated(): Promise<void> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return;
    }

    // Need to authenticate
    if (!this.logoConfig?.apiKey || !this.logoConfig?.apiSecret) {
      throw new Error("Logo API anahtarı ve secret gerekli.");
    }

    try {
      const authUrl = `${this.getBaseUrl()}/auth/token`;
      const response = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.logoConfig.apiKey,
          client_secret: this.logoConfig.apiSecret,
          scope: "invoices customers products reports",
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Kimlik doğrulama başarısız: ${response.status}`);
      }

      const data: any = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);

    } catch (error: unknown) {
      logger.error("[LogoConnector] Authentication error:", { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Build Logo-specific fetch parameters
   */
  protected override buildFetchParams(
    sinceDate: Date,
    untilDate: Date,
    page: number,
    pageSize: number,
    options?: FetchInvoicesOptions
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {
      startDate: this.formatLogoDate(sinceDate),
      endDate: this.formatLogoDate(untilDate),
      page,
      pageSize,
      firmNo: this.logoConfig?.firmNumber,
      periodNo: this.logoConfig?.periodNumber,
    };

    // Add type filter if specified
    if (options?.type) {
      // Logo TRCODE: 1=Purchase, 2=Sales, 3=Purchase Return, 4=Sales Return
      params.trCode = options.type === "SATIŞ" ? 2 : 1;
    }

    // Add status filter if specified
    if (options?.status) {
      params.status = this.mapStatusToLogo(options.status as string);
    }

    // Add E-Invoice filter
    if (options?.eInvoice !== undefined) {
      params.eInvoice = options.eInvoice ? 1 : 0;
    }

    return params;
  }

  /**
   * Format date for Logo API (YYYY-MM-DD)
   */
  private formatLogoDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Parse Logo date format
   */
  private parseLogoDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    return new Date(dateStr);
  }

  /**
   * Extract invoices from Logo response
   */
  protected override extractInvoices(response: GenericAPIResponse<unknown[]>): Record<string, unknown>[] {
    const logoResponse = response as unknown as LogoResponse<LogoInvoice[]>;

    if (!logoResponse.success || logoResponse.error) {
      logger.error(`[LogoConnector] API Error: ${logoResponse.error?.message}`);
      return [];
    }

    return (logoResponse.data || []) as unknown as Record<string, unknown>[];
  }

  /**
   * Map Logo invoice to normalized format
   */
  protected override mapToNormalizedInvoice(inv: Record<string, unknown>): NormalizedInvoice {
    const logo = inv as unknown as LogoInvoice;

    // Map lines
    const lines = (logo.TRANSACTIONS || []).map((line, index) => ({
      lineNumber: line.LINENO_ || index + 1,
      description: line.STOCKNAME || line.STOCKCODE || "",
      quantity: line.AMOUNT || 1,
      unitPrice: line.PRICE || 0,
      lineTotal: line.LINENET || line.TOTAL || 0,
      vatRate: (line.VATRATE || 18) / 100, // Logo uses percentage
      vatAmount: line.VATAMOUNT || 0,
    }));

    // Determine type from TRCODE
    const type = this.mapTRCodeToType(logo.TRCODE);

    return {
      externalId: logo.LOGICALREF?.toString() || logo.FICHENO || "",
      clientCompanyName: logo.CLIENTNAME,
      clientCompanyTaxNumber: logo.TAXNR,
      issueDate: this.parseLogoDate(logo.DATE_ || ""),
      dueDate: null, // Logo stores due date separately
      totalAmount: logo.GROSSTOTAL || 0,
      currency: this.mapLogoCurrency(logo.TRCURR),
      taxAmount: logo.TOTALVAT || 0,
      netAmount: logo.NETTOTAL,
      counterpartyName: logo.CLIENTNAME,
      counterpartyTaxNumber: logo.TAXNR,
      status: this.mapLogoStatus(logo.STATUS, logo.EINVOICESTATUS),
      type,
      lines,
    };
  }

  /**
   * Map Logo TRCODE to invoice type
   */
  private mapTRCodeToType(trCode?: number): "SATIŞ" | "ALIŞ" {
    // Logo TRCODE:
    // 1 = Alış Faturası (Purchase Invoice)
    // 2 = Satış Faturası (Sales Invoice)
    // 3 = Alış İade Faturası (Purchase Return)
    // 4 = Satış İade Faturası (Sales Return)
    // 5 = Alış Fatura İrsaliyesi
    // 6 = Satış Fatura İrsaliyesi
    // etc.

    switch (trCode) {
      case 1:
      case 3:
      case 5:
        return "ALIŞ";
      case 2:
      case 4:
      case 6:
      default:
        return "SATIŞ";
    }
  }

  /**
   * Map Logo currency code to ISO
   */
  private mapLogoCurrency(trcurr?: number): string {
    // Logo currency codes
    const currencyMap: Record<number, string> = {
      0: "TRY",
      1: "USD",
      2: "EUR",
      3: "GBP",
      4: "JPY",
      5: "CHF",
      20: "TRY", // New Turkish Lira
    };

    return currencyMap[trcurr || 0] || "TRY";
  }

  /**
   * Map Logo status to normalized status
   */
  private mapLogoStatus(status?: number, eInvoiceStatus?: number): string {
    // If E-Invoice, check E-Invoice status
    if (eInvoiceStatus !== undefined) {
      const eStatusMap: Record<number, string> = {
        0: "taslak",
        1: "gönderildi",
        2: "teslim edildi",
        3: "kabul edildi",
        4: "reddedildi",
        5: "iptal",
      };
      return eStatusMap[eInvoiceStatus] || "beklemede";
    }

    // Regular status
    const statusMap: Record<number, string> = {
      0: "taslak",
      1: "kesildi",
      2: "iptal",
    };

    return statusMap[status || 0] || "kesildi";
  }

  /**
   * Map status string to Logo status code
   */
  private mapStatusToLogo(status: string): number {
    const statusMap: Record<string, number> = {
      "taslak": 0,
      "kesildi": 1,
      "iptal": 2,
    };
    return statusMap[status.toLowerCase()] ?? 1;
  }

  /**
   * Map normalized invoice to Logo format
   */
  protected override mapToExternalInvoice(invoice: PushInvoiceInput): Record<string, unknown> {
    return {
      FICHENO: invoice.externalId,
      DATE_: this.formatLogoDate(invoice.issueDate),
      TRCODE: invoice.type === "SATIŞ" ? 2 : 1,
      GROSSTOTAL: invoice.totalAmount,
      TOTALVAT: invoice.taxAmount,
      NETTOTAL: invoice.netAmount || (invoice.totalAmount - invoice.taxAmount),
      TRCURR: this.reverseCurrencyMap(invoice.currency),
      CLIENTNAME: invoice.clientCompanyName || invoice.counterpartyName,
      TAXNR: invoice.clientCompanyTaxNumber || invoice.counterpartyTaxNumber,
      TRANSACTIONS: invoice.lines.map((line, index) => ({
        LINENO_: line.lineNumber || index + 1,
        STOCKNAME: line.description,
        AMOUNT: line.quantity,
        PRICE: line.unitPrice,
        LINENET: line.lineTotal,
        VATRATE: line.vatRate * 100, // Convert to percentage
        VATAMOUNT: line.vatAmount,
      })),
    };
  }

  /**
   * Reverse map currency ISO to Logo code
   */
  private reverseCurrencyMap(currency?: string): number {
    const map: Record<string, number> = {
      "TRY": 0,
      "USD": 1,
      "EUR": 2,
      "GBP": 3,
    };
    return map[currency || ""] ?? 0;
  }

  /**
   * Fetch customers (Cari Hesap)
   */
  async fetchCustomers(options?: {
    type?: "customer" | "supplier" | "both";
    searchTerm?: string;
  }): Promise<LogoCustomer[]> {
    if (!this.config) {
      logger.warn("[LogoConnector] Config bulunamadı.");
      return [];
    }

    try {
      const params: Record<string, unknown> = {
        firmNo: this.logoConfig?.firmNumber,
        page: 1,
        pageSize: 1000,
      };

      if (options?.type && options.type !== "both") {
        // Logo uses ACCTYPE: 1=Customer, 2=Supplier, 3=Both
        params.accType = options.type === "customer" ? 1 : 2;
      }

      if (options?.searchTerm) {
        params.search = options.searchTerm;
      }

      const endpoint = this.logoConfig?.logoVersion === "netsis"
        ? "/netsis/cari"
        : `/${this.logoConfig?.logoVersion || "tiger"}/customers`;

      const response = await this.makeRequest<LogoResponse<LogoCustomer[]>>(
        "GET",
        endpoint,
        params
      );

      if (!response.success || response.error) {
        logger.error(`[LogoConnector] Customer fetch error: ${response.error?.message}`);
        return [];
      }

      return response.data || [];

    } catch (error: unknown) {
      logger.error("[LogoConnector] fetchCustomers error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Fetch products (Stok)
   */
  async fetchProducts(options?: { searchTerm?: string }): Promise<LogoProduct[]> {
    if (!this.config) {
      logger.warn("[LogoConnector] Config bulunamadı.");
      return [];
    }

    try {
      const params: Record<string, unknown> = {
        firmNo: this.logoConfig?.firmNumber,
        page: 1,
        pageSize: 1000,
      };

      if (options?.searchTerm) {
        params.search = options.searchTerm;
      }

      const endpoint = this.logoConfig?.logoVersion === "netsis"
        ? "/netsis/stok"
        : `/${this.logoConfig?.logoVersion || "tiger"}/products`;

      const response = await this.makeRequest<LogoResponse<LogoProduct[]>>(
        "GET",
        endpoint,
        params
      );

      if (!response.success || response.error) {
        logger.error(`[LogoConnector] Product fetch error: ${response.error?.message}`);
        return [];
      }

      return response.data || [];

    } catch (error: unknown) {
      logger.error("[LogoConnector] fetchProducts error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Fetch account balances (Cari Bakiye)
   */
  async fetchAccountBalances(options?: {
    customerCode?: string;
    asOfDate?: Date;
  }): Promise<LogoAccountBalance[]> {
    if (!this.config) {
      logger.warn("[LogoConnector] Config bulunamadı.");
      return [];
    }

    try {
      const params: Record<string, unknown> = {
        firmNo: this.logoConfig?.firmNumber,
        periodNo: this.logoConfig?.periodNumber,
      };

      if (options?.customerCode) {
        params.clientCode = options.customerCode;
      }

      if (options?.asOfDate) {
        params.asOfDate = this.formatLogoDate(options.asOfDate);
      }

      const response = await this.makeRequest<LogoResponse<LogoAccountBalance[]>>(
        "GET",
        `/${this.logoConfig?.logoVersion || "tiger"}/balances`,
        params
      );

      if (!response.success || response.error) {
        logger.error(`[LogoConnector] Balance fetch error: ${response.error?.message}`);
        return [];
      }

      return response.data || [];

    } catch (error: unknown) {
      logger.error("[LogoConnector] fetchAccountBalances error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Get E-Invoice status from Logo
   */
  async getEInvoiceStatus(logicalRef: number): Promise<LogoEInvoiceStatus | null> {
    if (!this.config) {
      logger.warn("[LogoConnector] Config bulunamadı.");
      return null;
    }

    try {
      const response = await this.makeRequest<LogoResponse<LogoEInvoiceStatus>>(
        "GET",
        `/${this.logoConfig?.logoVersion || "tiger"}/einvoice/${logicalRef}/status`,
        { firmNo: this.logoConfig?.firmNumber }
      );

      if (!response.success || response.error) {
        logger.error(`[LogoConnector] E-Invoice status error: ${response.error?.message}`);
        return null;
      }

      return response.data || null;

    } catch (error: unknown) {
      logger.error("[LogoConnector] getEInvoiceStatus error:", { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }
}

/**
 * Logo Customer (Cari Hesap)
 */
interface LogoCustomer {
  LOGICALREF?: number;
  CODE?: string;
  DEFINITION_?: string;
  TAXNR?: string;
  TAXOFFICE?: string;
  ADDR1?: string;
  CITY?: string;
  TOWN?: string;
  COUNTRY?: string;
  TELNRS1?: string;
  EMAILADDR?: string;
  ACCTYPE?: number; // 1=Customer, 2=Supplier, 3=Both
  CREDITLIMIT?: number;
  DEBIT?: number;
  CREDIT?: number;
}

/**
 * Logo Product (Stok Kartı)
 */
interface LogoProduct {
  LOGICALREF?: number;
  CODE?: string;
  DEFINITION_?: string;
  AUXILCODE?: string;
  PRODUCERCODE?: string;
  UNITCODE?: string;
  VAT?: number;
  PURCHPRICE?: number;
  SALEPRICE?: number;
  ONHAND?: number; // Stok miktarı
  RESERVED?: number;
  AVAILABLE?: number;
}

/**
 * Logo Account Balance
 */
interface LogoAccountBalance {
  CLIENTREF?: number;
  CLIENTCODE?: string;
  CLIENTNAME?: string;
  DEBIT?: number;
  CREDIT?: number;
  BALANCE?: number;
  CURRSEL?: number;
  CURRDEBIT?: number;
  CURRCREDIT?: number;
  CURRBALANCE?: number;
}

/**
 * Logo E-Invoice Status
 */
interface LogoEInvoiceStatus {
  LOGICALREF?: number;
  FICHENO?: string;
  UUID?: string;
  ETTN?: string;
  STATUS?: number;
  STATUSTEXT?: string;
  GIBCODE?: string;
  ERRORMESSAGE?: string;
  SENTDATE?: string;
  DELIVERYDATE?: string;
  RESPONSEDATE?: string;
}
