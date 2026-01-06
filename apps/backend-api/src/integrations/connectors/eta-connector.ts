import {
  BaseEFaturaProviderConnector,
  type UBLInvoice,
  type EFaturaResponse,
  type EFaturaStatus,
} from "./base-efatura-provider-connector";
import type { FetchInvoicesOptions } from "./types";
import { logger } from "@repo/shared-utils";

/**
 * Supported E-Fatura Providers
 */
export type EFaturaProvider = "foriba" | "logo" | "uyumsoft" | "edm" | "turksat" | "qnb" | "custom";

/**
 * Provider-specific configuration
 */
interface ProviderEndpoints {
  baseUrl: string;
  testUrl: string;
  authPath: string;
  invoicePath: string;
  statusPath: string;
  cancelPath: string;
}

/**
 * Provider endpoints configuration
 */
const PROVIDER_ENDPOINTS: Record<EFaturaProvider, ProviderEndpoints> = {
  foriba: {
    baseUrl: "https://efatura.foriba.com/api/v1",
    testUrl: "https://efaturatest.foriba.com/api/v1",
    authPath: "/auth/login",
    invoicePath: "/invoices",
    statusPath: "/invoices/{uuid}/status",
    cancelPath: "/invoices/{uuid}/cancel",
  },
  logo: {
    baseUrl: "https://connect.logo.com.tr/api/v1",
    testUrl: "https://connecttest.logo.com.tr/api/v1",
    authPath: "/auth/token",
    invoicePath: "/efatura/invoices",
    statusPath: "/efatura/invoices/{uuid}/status",
    cancelPath: "/efatura/invoices/{uuid}/cancel",
  },
  uyumsoft: {
    baseUrl: "https://efatura.uyumsoft.com.tr/api/v2",
    testUrl: "https://efaturatest.uyumsoft.com.tr/api/v2",
    authPath: "/auth",
    invoicePath: "/invoice",
    statusPath: "/invoice/{uuid}/status",
    cancelPath: "/invoice/{uuid}/cancel",
  },
  edm: {
    baseUrl: "https://portal.edm.com.tr/api/v1",
    testUrl: "https://portaltest.edm.com.tr/api/v1",
    authPath: "/security/login",
    invoicePath: "/einvoice/send",
    statusPath: "/einvoice/{uuid}/status",
    cancelPath: "/einvoice/{uuid}/cancel",
  },
  turksat: {
    baseUrl: "https://efatura.turksat.com.tr/api",
    testUrl: "https://efaturatest.turksat.com.tr/api",
    authPath: "/auth/token",
    invoicePath: "/invoice/outgoing",
    statusPath: "/invoice/{uuid}/status",
    cancelPath: "/invoice/{uuid}/cancel",
  },
  qnb: {
    baseUrl: "https://efatura.qnbfinansbank.com/api/v1",
    testUrl: "https://efaturatest.qnbfinansbank.com/api/v1",
    authPath: "/oauth/token",
    invoicePath: "/invoices/send",
    statusPath: "/invoices/{uuid}",
    cancelPath: "/invoices/{uuid}/cancel",
  },
  custom: {
    baseUrl: "",
    testUrl: "",
    authPath: "/auth",
    invoicePath: "/invoices",
    statusPath: "/invoices/{uuid}/status",
    cancelPath: "/invoices/{uuid}/cancel",
  },
};

/**
 * ETA (E-Fatura) Integration Connector
 *
 * Supports multiple Turkish E-Fatura providers through a unified interface.
 * All providers submit invoices to GİB (Gelir İdaresi Başkanlığı) using UBL-TR format.
 *
 * Supported Providers:
 * - Foriba (İzibiz) - https://www.foriba.com
 * - Logo Connect - https://connect.logo.com.tr
 * - Uyumsoft - https://www.uyumsoft.com.tr
 * - EDM - https://www.edm.com.tr
 * - Türksat - https://efatura.turksat.com.tr
 * - QNB Finansbank - https://www.qnbfinansbank.com
 *
 * Features:
 * - E-Fatura (Electronic Invoice) sending and receiving
 * - E-Arşiv (Electronic Archive) for non-registered recipients
 * - Invoice status tracking
 * - Invoice cancellation
 * - Bulk invoice operations
 */
export class ETAConnector extends BaseEFaturaProviderConnector {
  protected providerName: string;
  protected baseUrl: string;
  protected testUrl: string;

  private provider: EFaturaProvider;
  private endpoints: ProviderEndpoints;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(provider: EFaturaProvider = "foriba") {
    super();
    this.provider = provider;
    this.endpoints = PROVIDER_ENDPOINTS[provider];
    this.providerName = this.getProviderDisplayName(provider);
    this.baseUrl = this.endpoints.baseUrl;
    this.testUrl = this.endpoints.testUrl;
  }

  /**
   * Get display name for provider
   */
  private getProviderDisplayName(provider: EFaturaProvider): string {
    const names: Record<EFaturaProvider, string> = {
      foriba: "Foriba E-Fatura",
      logo: "Logo Connect E-Fatura",
      uyumsoft: "Uyumsoft E-Fatura",
      edm: "EDM E-Fatura",
      turksat: "Türksat E-Fatura",
      qnb: "QNB E-Fatura",
      custom: "Custom E-Fatura Provider",
    };
    return names[provider];
  }

  /**
   * Get headers for API requests
   */
  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    // Provider-specific headers
    if (this.config?.apiKey) {
      headers["X-API-Key"] = this.config.apiKey;
    }

    return headers;
  }

  /**
   * Authenticate with the provider
   */
  protected async authenticate(): Promise<boolean> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return true;
    }

    const authUrl = `${this.getApiUrl()}${this.endpoints.authPath}`;

    try {
      let response: Response;
      let body: Record<string, string>;

      // Different providers use different auth methods
      switch (this.provider) {
        case "foriba":
        case "edm":
          body = {
            username: this.config!.username,
            password: this.config!.password,
            vkn: this.config!.vkn,
          };
          response = await fetch(authUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          break;

        case "logo":
        case "qnb":
          // OAuth2 client credentials flow
          const params = new URLSearchParams({
            grant_type: "client_credentials",
            client_id: this.config!.username,
            client_secret: this.config!.password,
          });
          response = await fetch(authUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
          });
          break;

        case "uyumsoft":
        case "turksat":
        default:
          body = {
            kullaniciAdi: this.config!.username,
            sifre: this.config!.password,
            vkn: this.config!.vkn,
          };
          response = await fetch(authUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          break;
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[${this.providerName}] Auth failed: ${response.status} - ${errorText}`);
        return false;
      }

      const data = await response.json();

      // Extract token based on provider response format
      this.accessToken = data.access_token || data.token || data.accessToken || data.Token;

      // Set token expiry (default 1 hour if not provided)
      const expiresIn = data.expires_in || data.expiresIn || 3600;
      this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      return !!this.accessToken;

    } catch (error) {
      logger.error(`[${this.providerName}] Auth error:`, error);
      return false;
    }
  }

  /**
   * Fetch invoices from provider
   */
  protected async fetchInvoicesFromProvider(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchInvoicesOptions
  ): Promise<UBLInvoice[]> {
    // Ensure we're authenticated
    const isAuth = await this.authenticate();
    if (!isAuth) {
      logger.warn(`[${this.providerName}] Authentication failed, cannot fetch invoices.`);
      return [];
    }

    const invoiceUrl = `${this.getApiUrl()}${this.endpoints.invoicePath}`;
    const params = new URLSearchParams({
      startDate: sinceDate.toISOString().split("T")[0],
      endDate: untilDate.toISOString().split("T")[0],
      limit: String(options?.limit || 100),
      offset: String(options?.offset || 0),
    });

    // Add direction filter if specified
    const direction = options?.direction as string | undefined;
    if (direction) {
      params.set("direction", direction); // "incoming" or "outgoing"
    }

    try {
      const response = await fetch(`${invoiceUrl}?${params.toString()}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[${this.providerName}] Fetch invoices failed: ${response.status} - ${errorText}`);
        return [];
      }

      const data = await response.json();

      // Handle different response formats
      const invoices = data.invoices || data.faturalar || data.data || data.items || [];

      // Map provider-specific format to UBL
      return invoices.map((inv: ProviderInvoice) => this.mapProviderToUBL(inv));

    } catch (error) {
      logger.error(`[${this.providerName}] Fetch invoices error:`, error);
      return [];
    }
  }

  /**
   * Send invoice to provider
   */
  protected async sendInvoice(invoice: UBLInvoice): Promise<EFaturaResponse> {
    // Ensure we're authenticated
    const isAuth = await this.authenticate();
    if (!isAuth) {
      throw new Error("Kimlik doğrulama başarısız.");
    }

    const invoiceUrl = `${this.getApiUrl()}${this.endpoints.invoicePath}`;

    try {
      // Convert UBL to provider-specific format
      const providerInvoice = this.mapUBLToProvider(invoice);

      const response = await fetch(invoiceUrl, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(providerInvoice),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          uuid: invoice.uuid,
          invoiceNumber: invoice.id,
          status: "ERROR",
          errorMessage: `Gönderim hatası: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();

      return {
        uuid: data.uuid || data.UUID || invoice.uuid,
        invoiceNumber: data.invoiceNumber || data.faturaNo || invoice.id,
        status: this.mapProviderStatus(data.status || data.durum || "SENT"),
        ettn: data.ettn || data.ETTN,
        gibCode: data.gibCode || data.gibKodu,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      return {
        uuid: invoice.uuid,
        invoiceNumber: invoice.id,
        status: "ERROR",
        errorMessage: `Gönderim hatası: ${errorMessage}`,
      };
    }
  }

  /**
   * Get invoice status from provider
   */
  async getInvoiceStatus(uuid: string): Promise<EFaturaResponse> {
    // Ensure we're authenticated
    const isAuth = await this.authenticate();
    if (!isAuth) {
      throw new Error("Kimlik doğrulama başarısız.");
    }

    const statusUrl = `${this.getApiUrl()}${this.endpoints.statusPath.replace("{uuid}", uuid)}`;

    try {
      const response = await fetch(statusUrl, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Durum sorgusu başarısız: ${response.status}`);
      }

      const data = await response.json();

      return {
        uuid: data.uuid || uuid,
        invoiceNumber: data.invoiceNumber || data.faturaNo || "",
        status: this.mapProviderStatus(data.status || data.durum),
        statusDate: data.statusDate ? new Date(data.statusDate) : undefined,
        ettn: data.ettn || data.ETTN,
        gibCode: data.gibCode || data.gibKodu,
        errorMessage: data.errorMessage || data.hataMesaji,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      throw new Error(`Durum sorgulama hatası: ${errorMessage}`);
    }
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(uuid: string, reason: string): Promise<EFaturaResponse> {
    // Ensure we're authenticated
    const isAuth = await this.authenticate();
    if (!isAuth) {
      throw new Error("Kimlik doğrulama başarısız.");
    }

    const cancelUrl = `${this.getApiUrl()}${this.endpoints.cancelPath.replace("{uuid}", uuid)}`;

    try {
      const response = await fetch(cancelUrl, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          reason,
          iptalNedeni: reason,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`İptal işlemi başarısız: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return {
        uuid: data.uuid || uuid,
        invoiceNumber: data.invoiceNumber || "",
        status: "CANCELLED",
        statusDate: new Date(),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      throw new Error(`İptal hatası: ${errorMessage}`);
    }
  }

  /**
   * Send E-Arşiv invoice (for non-registered recipients)
   */
  async sendEArsivInvoice(invoice: UBLInvoice, recipientEmail?: string): Promise<EFaturaResponse> {
    // Ensure we're authenticated
    const isAuth = await this.authenticate();
    if (!isAuth) {
      throw new Error("Kimlik doğrulama başarısız.");
    }

    const earsivUrl = `${this.getApiUrl()}/earsiv/invoices`;

    try {
      const providerInvoice = this.mapUBLToProvider(invoice);

      // Add E-Arşiv specific fields
      const earsivInvoice = {
        ...providerInvoice,
        invoiceType: "EARSIV",
        recipientEmail,
        sendEmail: !!recipientEmail,
      };

      const response = await fetch(earsivUrl, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(earsivInvoice),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          uuid: invoice.uuid,
          invoiceNumber: invoice.id,
          status: "ERROR",
          errorMessage: `E-Arşiv gönderim hatası: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();

      return {
        uuid: data.uuid || data.UUID || invoice.uuid,
        invoiceNumber: data.invoiceNumber || data.faturaNo || invoice.id,
        status: this.mapProviderStatus(data.status || data.durum || "SENT"),
        ettn: data.ettn || data.ETTN,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      return {
        uuid: invoice.uuid,
        invoiceNumber: invoice.id,
        status: "ERROR",
        errorMessage: `E-Arşiv gönderim hatası: ${errorMessage}`,
      };
    }
  }

  /**
   * Check if recipient is E-Fatura registered (GİB lookup)
   */
  async checkEFaturaRegistration(vkn: string): Promise<{
    isRegistered: boolean;
    alias?: string;
    title?: string;
  }> {
    // Ensure we're authenticated
    const isAuth = await this.authenticate();
    if (!isAuth) {
      throw new Error("Kimlik doğrulama başarısız.");
    }

    const checkUrl = `${this.getApiUrl()}/gib/check-registration`;

    try {
      const response = await fetch(`${checkUrl}?vkn=${vkn}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        // Not found means not registered
        if (response.status === 404) {
          return { isRegistered: false };
        }
        throw new Error(`Kayıt sorgusu başarısız: ${response.status}`);
      }

      const data = await response.json();

      return {
        isRegistered: data.isRegistered || data.kayitli || false,
        alias: data.alias || data.etiket,
        title: data.title || data.unvan,
      };

    } catch (error) {
      logger.error(`[${this.providerName}] Check registration error:`, error);
      return { isRegistered: false };
    }
  }

  /**
   * Map provider-specific invoice format to UBL
   */
  private mapProviderToUBL(inv: ProviderInvoice): UBLInvoice {
    return {
      ublVersionID: "2.1",
      customizationID: "TR1.2",
      profileID: inv.profilID || "TICARIFATURA",
      id: inv.faturaNo || inv.invoiceNumber || "",
      copyIndicator: false,
      uuid: inv.uuid || inv.UUID || "",
      issueDate: inv.faturaTarihi || inv.issueDate || "",
      invoiceTypeCode: inv.faturaTipi || inv.invoiceType || "SATIS",
      documentCurrencyCode: inv.paraBirimi || inv.currency || "TRY",
      lineCountNumeric: inv.satirSayisi || inv.lineCount || 0,

      accountingSupplierParty: {
        party: {
          partyIdentification: [{
            id: inv.saticiVkn || inv.supplierVkn || "",
            schemeID: "VKN",
          }],
          partyName: {
            name: inv.saticiUnvan || inv.supplierName || "",
          },
        },
      },

      accountingCustomerParty: {
        party: {
          partyIdentification: [{
            id: inv.aliciVkn || inv.customerVkn || "",
            schemeID: "VKN",
          }],
          partyName: {
            name: inv.aliciUnvan || inv.customerName || "",
          },
        },
      },

      taxTotal: {
        taxAmount: {
          value: inv.kdvTutari || inv.taxAmount || 0,
          currencyID: inv.paraBirimi || inv.currency || "TRY",
        },
      },

      legalMonetaryTotal: {
        lineExtensionAmount: {
          value: inv.malHizmetTutari || inv.netAmount || 0,
          currencyID: inv.paraBirimi || inv.currency || "TRY",
        },
        taxExclusiveAmount: {
          value: inv.malHizmetTutari || inv.netAmount || 0,
          currencyID: inv.paraBirimi || inv.currency || "TRY",
        },
        taxInclusiveAmount: {
          value: inv.toplamTutar || inv.totalAmount || 0,
          currencyID: inv.paraBirimi || inv.currency || "TRY",
        },
        payableAmount: {
          value: inv.odenecekTutar || inv.payableAmount || inv.toplamTutar || inv.totalAmount || 0,
          currencyID: inv.paraBirimi || inv.currency || "TRY",
        },
      },

      invoiceLine: (inv.satirlar || inv.lines || []).map((line: ProviderInvoiceLine, index: number) => ({
        id: String(line.satirNo || index + 1),
        invoicedQuantity: {
          value: line.miktar || line.quantity || 1,
          unitCode: line.birim || line.unit || "C62",
        },
        lineExtensionAmount: {
          value: line.satirTutari || line.lineAmount || 0,
          currencyID: inv.paraBirimi || inv.currency || "TRY",
        },
        item: {
          name: line.malHizmet || line.description || "",
        },
        price: {
          priceAmount: {
            value: line.birimFiyat || line.unitPrice || 0,
            currencyID: inv.paraBirimi || inv.currency || "TRY",
          },
        },
      })),
    };
  }

  /**
   * Map UBL invoice to provider-specific format
   */
  private mapUBLToProvider(ubl: UBLInvoice): Record<string, unknown> {
    // Common structure for most providers
    return {
      uuid: ubl.uuid,
      faturaNo: ubl.id,
      invoiceNumber: ubl.id,
      faturaTarihi: ubl.issueDate,
      issueDate: ubl.issueDate,
      faturaTipi: ubl.invoiceTypeCode,
      invoiceType: ubl.invoiceTypeCode,
      profilID: ubl.profileID,
      paraBirimi: ubl.documentCurrencyCode,
      currency: ubl.documentCurrencyCode,

      saticiVkn: ubl.accountingSupplierParty.party.partyIdentification?.[0]?.id,
      supplierVkn: ubl.accountingSupplierParty.party.partyIdentification?.[0]?.id,
      saticiUnvan: ubl.accountingSupplierParty.party.partyName?.name,
      supplierName: ubl.accountingSupplierParty.party.partyName?.name,

      aliciVkn: ubl.accountingCustomerParty.party.partyIdentification?.[0]?.id,
      customerVkn: ubl.accountingCustomerParty.party.partyIdentification?.[0]?.id,
      aliciUnvan: ubl.accountingCustomerParty.party.partyName?.name,
      customerName: ubl.accountingCustomerParty.party.partyName?.name,

      kdvTutari: ubl.taxTotal.taxAmount.value,
      taxAmount: ubl.taxTotal.taxAmount.value,
      malHizmetTutari: ubl.legalMonetaryTotal.taxExclusiveAmount.value,
      netAmount: ubl.legalMonetaryTotal.taxExclusiveAmount.value,
      toplamTutar: ubl.legalMonetaryTotal.taxInclusiveAmount.value,
      totalAmount: ubl.legalMonetaryTotal.taxInclusiveAmount.value,
      odenecekTutar: ubl.legalMonetaryTotal.payableAmount.value,
      payableAmount: ubl.legalMonetaryTotal.payableAmount.value,

      satirlar: ubl.invoiceLine.map((line) => ({
        satirNo: line.id,
        malHizmet: line.item.name,
        description: line.item.name,
        miktar: line.invoicedQuantity.value,
        quantity: line.invoicedQuantity.value,
        birim: line.invoicedQuantity.unitCode,
        unit: line.invoicedQuantity.unitCode,
        birimFiyat: line.price.priceAmount.value,
        unitPrice: line.price.priceAmount.value,
        satirTutari: line.lineExtensionAmount.value,
        lineAmount: line.lineExtensionAmount.value,
      })),
      lines: ubl.invoiceLine.map((line) => ({
        lineNumber: line.id,
        description: line.item.name,
        quantity: line.invoicedQuantity.value,
        unit: line.invoicedQuantity.unitCode,
        unitPrice: line.price.priceAmount.value,
        lineAmount: line.lineExtensionAmount.value,
      })),
    };
  }

  /**
   * Map provider status to standard status
   */
  private mapProviderStatus(status: string): EFaturaStatus {
    const statusMap: Record<string, EFaturaStatus> = {
      // Turkish status names
      "TASLAK": "DRAFT",
      "KUYRUKTA": "QUEUED",
      "ISLENIYOR": "PROCESSING",
      "GONDERILDI": "SENT",
      "TESLIM_EDILDI": "DELIVERED",
      "KABUL_EDILDI": "ACCEPTED",
      "REDDEDILDI": "REJECTED",
      "IPTAL_EDILDI": "CANCELLED",
      "HATA": "ERROR",
      // English status names
      "DRAFT": "DRAFT",
      "QUEUED": "QUEUED",
      "PROCESSING": "PROCESSING",
      "SENT": "SENT",
      "DELIVERED": "DELIVERED",
      "ACCEPTED": "ACCEPTED",
      "REJECTED": "REJECTED",
      "CANCELLED": "CANCELLED",
      "ERROR": "ERROR",
      // Provider-specific
      "WAITING": "QUEUED",
      "SUCCESS": "DELIVERED",
      "FAILED": "ERROR",
      "PENDING": "PROCESSING",
    };

    return statusMap[status.toUpperCase()] || "PROCESSING";
  }
}

/**
 * Provider-specific invoice format
 */
interface ProviderInvoice {
  uuid?: string;
  UUID?: string;
  faturaNo?: string;
  invoiceNumber?: string;
  faturaTarihi?: string;
  issueDate?: string;
  faturaTipi?: string;
  invoiceType?: string;
  profilID?: string;
  paraBirimi?: string;
  currency?: string;
  satirSayisi?: number;
  lineCount?: number;

  saticiVkn?: string;
  supplierVkn?: string;
  saticiUnvan?: string;
  supplierName?: string;

  aliciVkn?: string;
  customerVkn?: string;
  aliciUnvan?: string;
  customerName?: string;

  kdvTutari?: number;
  taxAmount?: number;
  malHizmetTutari?: number;
  netAmount?: number;
  toplamTutar?: number;
  totalAmount?: number;
  odenecekTutar?: number;
  payableAmount?: number;

  satirlar?: ProviderInvoiceLine[];
  lines?: ProviderInvoiceLine[];
}

/**
 * Provider-specific invoice line format
 */
interface ProviderInvoiceLine {
  satirNo?: number;
  lineNumber?: number;
  malHizmet?: string;
  description?: string;
  miktar?: number;
  quantity?: number;
  birim?: string;
  unit?: string;
  birimFiyat?: number;
  unitPrice?: number;
  satirTutari?: number;
  lineAmount?: number;
}
