import type {
  AccountingIntegrationConnector,
  NormalizedInvoice,
  NormalizedInvoiceLine,
  FetchInvoicesOptions,
  PushInvoiceInput,
} from "./types";
import { logger } from "@repo/shared-utils";

/**
 * E-Fatura Provider Configuration
 */
export interface EFaturaProviderConfig {
  // Authentication
  username: string;
  password: string;
  apiKey?: string;

  // Company Information
  vkn: string; // Vergi Kimlik Numarası (Tax ID)
  companyName?: string;
  companyTitle?: string; // Ticari Unvan

  // Provider-specific
  providerId?: string;
  environment?: "production" | "test";

  // API URLs
  baseUrl?: string;

  // Certificate-based auth (optional)
  certificate?: string;
  privateKey?: string;
}

/**
 * UBL Invoice Format (Universal Business Language)
 * Used by Turkish E-Fatura system
 */
export interface UBLInvoice {
  // UBL Header
  ublVersionID: string;
  customizationID: string;
  profileID: string;
  id: string;
  copyIndicator: boolean;
  uuid: string;
  issueDate: string;
  issueTime?: string;
  invoiceTypeCode: string; // SATIS, IADE, TEVKIFAT, ISTISNA, OZELMATRAH, IHRAC
  documentCurrencyCode: string;
  lineCountNumeric: number;

  // Supplier (Satıcı)
  accountingSupplierParty: UBLParty;

  // Customer (Alıcı)
  accountingCustomerParty: UBLParty;

  // Payment
  paymentMeans?: UBLPaymentMeans;
  paymentTerms?: UBLPaymentTerms;

  // Tax
  taxTotal: UBLTaxTotal;
  withholdingTaxTotal?: UBLTaxTotal[];

  // Totals
  legalMonetaryTotal: UBLMonetaryTotal;

  // Lines
  invoiceLine: UBLInvoiceLine[];

  // Notes
  note?: string[];
}

/**
 * UBL Party (Supplier or Customer)
 */
export interface UBLParty {
  party: {
    websiteURI?: string;
    partyIdentification?: Array<{
      id: string;
      schemeID?: string; // VKN, TCKN, MERSISNO, etc.
    }>;
    partyName?: {
      name: string;
    };
    postalAddress?: {
      streetName?: string;
      buildingNumber?: string;
      citySubdivisionName?: string; // İlçe
      cityName?: string; // İl
      postalZone?: string;
      country?: {
        name: string;
      };
    };
    partyTaxScheme?: {
      taxScheme?: {
        name: string; // Vergi Dairesi
      };
    };
    contact?: {
      telephone?: string;
      electronicMail?: string;
    };
  };
}

/**
 * UBL Invoice Line
 */
export interface UBLInvoiceLine {
  id: string;
  invoicedQuantity: {
    value: number;
    unitCode: string;
  };
  lineExtensionAmount: {
    value: number;
    currencyID: string;
  };
  allowanceCharge?: Array<{
    chargeIndicator: boolean;
    multiplierFactorNumeric?: number;
    amount: {
      value: number;
      currencyID: string;
    };
    baseAmount?: {
      value: number;
      currencyID: string;
    };
  }>;
  taxTotal?: {
    taxAmount: {
      value: number;
      currencyID: string;
    };
    taxSubtotal?: Array<{
      taxableAmount: {
        value: number;
        currencyID: string;
      };
      taxAmount: {
        value: number;
        currencyID: string;
      };
      percent: number;
      taxCategory?: {
        taxScheme?: {
          name: string;
          taxTypeCode: string;
        };
      };
    }>;
  };
  item: {
    name: string;
    description?: string;
    sellersItemIdentification?: {
      id: string;
    };
  };
  price: {
    priceAmount: {
      value: number;
      currencyID: string;
    };
  };
}

/**
 * UBL Tax Total
 */
export interface UBLTaxTotal {
  taxAmount: {
    value: number;
    currencyID: string;
  };
  taxSubtotal?: Array<{
    taxableAmount: {
      value: number;
      currencyID: string;
    };
    taxAmount: {
      value: number;
      currencyID: string;
    };
    percent: number;
    taxCategory?: {
      taxScheme?: {
        name: string;
        taxTypeCode: string; // 0015 = KDV
      };
    };
  }>;
}

/**
 * UBL Monetary Total
 */
export interface UBLMonetaryTotal {
  lineExtensionAmount: {
    value: number;
    currencyID: string;
  };
  taxExclusiveAmount: {
    value: number;
    currencyID: string;
  };
  taxInclusiveAmount: {
    value: number;
    currencyID: string;
  };
  allowanceTotalAmount?: {
    value: number;
    currencyID: string;
  };
  chargeTotalAmount?: {
    value: number;
    currencyID: string;
  };
  payableAmount: {
    value: number;
    currencyID: string;
  };
}

/**
 * UBL Payment Means
 */
export interface UBLPaymentMeans {
  paymentMeansCode: string;
  paymentDueDate?: string;
  paymentChannelCode?: string;
  payeeFinancialAccount?: {
    id: string;
    currencyCode?: string;
    financialInstitutionBranch?: {
      name?: string;
    };
  };
}

/**
 * UBL Payment Terms
 */
export interface UBLPaymentTerms {
  note?: string;
  penaltySurchargePercent?: number;
  amount?: {
    value: number;
    currencyID: string;
  };
}

/**
 * E-Fatura Status
 */
export type EFaturaStatus =
  | "DRAFT"       // Taslak
  | "QUEUED"      // Kuyruğa Alındı
  | "PROCESSING"  // İşleniyor
  | "SENT"        // Gönderildi
  | "DELIVERED"   // Teslim Edildi
  | "ACCEPTED"    // Kabul Edildi
  | "REJECTED"    // Reddedildi
  | "CANCELLED"   // İptal Edildi
  | "ERROR";      // Hata

/**
 * E-Fatura Response
 */
export interface EFaturaResponse {
  uuid: string;
  invoiceNumber: string;
  status: EFaturaStatus;
  statusDate?: Date;
  ettn?: string; // E-Fatura Tekil Tanımlama Numarası
  gibCode?: string;
  errorMessage?: string;
}

/**
 * Base E-Fatura Provider Connector
 *
 * Base class for integrating with Turkish E-Fatura providers like:
 * - Foriba (İzibiz)
 * - Logo Connect
 * - Uyumsoft
 * - EDM
 * - Türksat
 * - QNB E-Fatura
 *
 * All providers must submit invoices to GİB (Gelir İdaresi Başkanlığı)
 * using UBL-TR format.
 */
export abstract class BaseEFaturaProviderConnector implements AccountingIntegrationConnector {
  protected abstract providerName: string;
  protected abstract baseUrl: string;
  protected abstract testUrl: string;

  protected config: EFaturaProviderConfig | null = null;

  /**
   * Get the API base URL based on environment
   */
  protected getApiUrl(): string {
    return this.config?.environment === "test" ? this.testUrl : this.baseUrl;
  }

  /**
   * Standard HTTP headers
   */
  protected abstract getHeaders(): Record<string, string>;

  /**
   * Parse and validate configuration
   */
  protected parseConfig(config: Record<string, unknown>): EFaturaProviderConfig {
    const username = config.username as string | undefined;
    const password = config.password as string | undefined;
    const vkn = config.vkn as string | undefined;

    if (!username || typeof username !== "string" || username.trim().length === 0) {
      throw new Error(`${this.providerName} kullanıcı adı gerekli.`);
    }

    if (!password || typeof password !== "string" || password.trim().length === 0) {
      throw new Error(`${this.providerName} şifre gerekli.`);
    }

    if (!vkn || typeof vkn !== "string" || vkn.trim().length === 0) {
      throw new Error("Vergi Kimlik Numarası (VKN) gerekli.");
    }

    // Validate VKN format (10 or 11 digits)
    if (!/^\d{10,11}$/.test(vkn.trim())) {
      throw new Error("Geçersiz VKN formatı. 10 veya 11 haneli olmalıdır.");
    }

    return {
      username: username.trim(),
      password: password.trim(),
      vkn: vkn.trim(),
      apiKey: config.apiKey as string | undefined,
      companyName: config.companyName as string | undefined,
      companyTitle: config.companyTitle as string | undefined,
      providerId: config.providerId as string | undefined,
      environment: (config.environment as "production" | "test") ||
                   (process.env.NODE_ENV === "production" ? "production" : "test"),
      baseUrl: config.baseUrl as string | undefined,
      certificate: config.certificate as string | undefined,
      privateKey: config.privateKey as string | undefined,
    };
  }

  /**
   * Test connection to the provider API
   */
  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    try {
      this.config = this.parseConfig(config);

      // Verify authentication
      const isAuthenticated = await this.authenticate();

      if (isAuthenticated) {
        return {
          success: true,
          message: `${this.providerName} bağlantısı başarılı.`
        };
      }

      return {
        success: false,
        message: `${this.providerName} kimlik doğrulama başarısız.`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      logger.error(`[${this.providerName}] testConnection error:`, error);
      return { success: false, message: `${this.providerName} bağlantı hatası: ${errorMessage}` };
    }
  }

  /**
   * Authenticate with the provider
   */
  protected abstract authenticate(): Promise<boolean>;

  /**
   * Fetch invoices from the provider
   */
  async fetchInvoices(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchInvoicesOptions
  ): Promise<NormalizedInvoice[]> {
    if (!this.config) {
      logger.warn(`[${this.providerName}] Config bulunamadı.`);
      return [];
    }

    try {
      const invoices = await this.fetchInvoicesFromProvider(sinceDate, untilDate, options);
      return invoices.map((inv) => this.mapToNormalizedInvoice(inv));
    } catch (error) {
      logger.error(`[${this.providerName}] fetchInvoices error:`, error);
      return [];
    }
  }

  /**
   * Provider-specific invoice fetching
   */
  protected abstract fetchInvoicesFromProvider(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchInvoicesOptions
  ): Promise<UBLInvoice[]>;

  /**
   * Push invoices to the provider
   */
  async pushInvoices(
    invoices: PushInvoiceInput[],
    config: Record<string, unknown>
  ): Promise<Array<{ success: boolean; externalId?: string; message?: string }>> {
    this.config = this.parseConfig(config);

    const results: Array<{ success: boolean; externalId?: string; message?: string }> = [];

    for (const invoice of invoices) {
      try {
        // Convert to UBL format
        const ublInvoice = this.mapToUBLInvoice(invoice);

        // Send to provider
        const response = await this.sendInvoice(ublInvoice);

        if (response.status === "ERROR" || response.status === "REJECTED") {
          results.push({
            success: false,
            externalId: response.uuid,
            message: response.errorMessage || `Fatura gönderimi başarısız: ${response.status}`,
          });
        } else {
          results.push({
            success: true,
            externalId: response.uuid || response.ettn,
            message: `Fatura başarıyla gönderildi. ETTN: ${response.ettn || response.uuid}`,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
        results.push({
          success: false,
          message: `Fatura gönderim hatası: ${errorMessage}`,
        });
      }
    }

    return results;
  }

  /**
   * Send invoice to provider
   */
  protected abstract sendInvoice(invoice: UBLInvoice): Promise<EFaturaResponse>;

  /**
   * Get invoice status from provider
   */
  abstract getInvoiceStatus(uuid: string): Promise<EFaturaResponse>;

  /**
   * Cancel invoice
   */
  abstract cancelInvoice(uuid: string, reason: string): Promise<EFaturaResponse>;

  /**
   * Map UBL invoice to normalized format
   */
  protected mapToNormalizedInvoice(ubl: UBLInvoice): NormalizedInvoice {
    // Get customer info
    const customerParty = ubl.accountingCustomerParty.party;
    const customerVkn = customerParty.partyIdentification?.find(
      (id) => id.schemeID === "VKN" || id.schemeID === "TCKN"
    )?.id;

    // Get supplier info
    const supplierParty = ubl.accountingSupplierParty.party;
    const supplierVkn = supplierParty.partyIdentification?.find(
      (id) => id.schemeID === "VKN" || id.schemeID === "TCKN"
    )?.id;

    // Map lines
    const lines: NormalizedInvoiceLine[] = ubl.invoiceLine.map((line, index) => ({
      lineNumber: index + 1,
      description: line.item.name || line.item.description || "",
      quantity: line.invoicedQuantity.value,
      unitPrice: line.price.priceAmount.value,
      lineTotal: line.lineExtensionAmount.value,
      vatRate: line.taxTotal?.taxSubtotal?.[0]?.percent || 18,
      vatAmount: line.taxTotal?.taxAmount.value || 0,
    }));

    return {
      externalId: ubl.uuid,
      clientCompanyName: customerParty.partyName?.name,
      clientCompanyTaxNumber: customerVkn,
      issueDate: new Date(ubl.issueDate),
      dueDate: ubl.paymentMeans?.paymentDueDate
        ? new Date(ubl.paymentMeans.paymentDueDate)
        : null,
      totalAmount: ubl.legalMonetaryTotal.payableAmount.value,
      currency: ubl.documentCurrencyCode || "TRY",
      taxAmount: ubl.taxTotal.taxAmount.value,
      netAmount: ubl.legalMonetaryTotal.taxExclusiveAmount.value,
      counterpartyName: supplierParty.partyName?.name,
      counterpartyTaxNumber: supplierVkn,
      status: this.mapInvoiceTypeToStatus(ubl.invoiceTypeCode),
      type: ubl.invoiceTypeCode === "SATIS" ? "SATIŞ" : "ALIŞ",
      lines,
    };
  }

  /**
   * Map normalized invoice to UBL format
   */
  protected mapToUBLInvoice(invoice: PushInvoiceInput): UBLInvoice {
    const uuid = this.generateUUID();
    const invoiceNumber = invoice.externalId || `INV-${Date.now()}`;

    // Determine invoice type
    const invoiceTypeCode = invoice.type === "SATIŞ" ? "SATIS" : "ALIS";

    // Map lines
    const ublLines: UBLInvoiceLine[] = invoice.lines.map((line, index) => ({
      id: String(line.lineNumber || index + 1),
      invoicedQuantity: {
        value: line.quantity,
        unitCode: "C62", // Unit (Adet)
      },
      lineExtensionAmount: {
        value: line.lineTotal,
        currencyID: invoice.currency || "TRY",
      },
      taxTotal: {
        taxAmount: {
          value: line.vatAmount,
          currencyID: invoice.currency || "TRY",
        },
        taxSubtotal: [{
          taxableAmount: {
            value: line.lineTotal,
            currencyID: invoice.currency || "TRY",
          },
          taxAmount: {
            value: line.vatAmount,
            currencyID: invoice.currency || "TRY",
          },
          percent: line.vatRate * 100, // Convert to percentage
          taxCategory: {
            taxScheme: {
              name: "KDV",
              taxTypeCode: "0015",
            },
          },
        }],
      },
      item: {
        name: line.description,
      },
      price: {
        priceAmount: {
          value: line.unitPrice,
          currencyID: invoice.currency || "TRY",
        },
      },
    }));

    // Calculate totals
    const netAmount = invoice.netAmount || (invoice.totalAmount - invoice.taxAmount);

    return {
      ublVersionID: "2.1",
      customizationID: "TR1.2",
      profileID: "TICARIFATURA",
      id: invoiceNumber,
      copyIndicator: false,
      uuid,
      issueDate: invoice.issueDate.toISOString().split("T")[0],
      issueTime: invoice.issueDate.toISOString().split("T")[1]?.split(".")[0],
      invoiceTypeCode,
      documentCurrencyCode: invoice.currency || "TRY",
      lineCountNumeric: ublLines.length,

      accountingSupplierParty: {
        party: {
          partyIdentification: [{
            id: this.config!.vkn,
            schemeID: this.config!.vkn.length === 11 ? "TCKN" : "VKN",
          }],
          partyName: {
            name: this.config!.companyTitle || this.config!.companyName || "",
          },
        },
      },

      accountingCustomerParty: {
        party: {
          partyIdentification: invoice.clientCompanyTaxNumber ? [{
            id: invoice.clientCompanyTaxNumber,
            schemeID: invoice.clientCompanyTaxNumber.length === 11 ? "TCKN" : "VKN",
          }] : [],
          partyName: {
            name: invoice.clientCompanyName || invoice.counterpartyName || "",
          },
        },
      },

      paymentMeans: invoice.dueDate ? {
        paymentMeansCode: "1", // Not defined
        paymentDueDate: invoice.dueDate.toISOString().split("T")[0],
      } : undefined,

      taxTotal: {
        taxAmount: {
          value: invoice.taxAmount,
          currencyID: invoice.currency || "TRY",
        },
      },

      legalMonetaryTotal: {
        lineExtensionAmount: {
          value: netAmount,
          currencyID: invoice.currency || "TRY",
        },
        taxExclusiveAmount: {
          value: netAmount,
          currencyID: invoice.currency || "TRY",
        },
        taxInclusiveAmount: {
          value: invoice.totalAmount,
          currencyID: invoice.currency || "TRY",
        },
        payableAmount: {
          value: invoice.totalAmount,
          currencyID: invoice.currency || "TRY",
        },
      },

      invoiceLine: ublLines,
    };
  }

  /**
   * Map invoice type code to Turkish status
   */
  protected mapInvoiceTypeToStatus(typeCode: string): string {
    const statusMap: Record<string, string> = {
      SATIS: "kesildi",
      IADE: "iade",
      TEVKIFAT: "tevkifatlı",
      ISTISNA: "istisna",
      OZELMATRAH: "özel matrah",
      IHRAC: "ihraç kayıtlı",
    };

    return statusMap[typeCode] || "kesildi";
  }

  /**
   * Generate UUID v4
   */
  protected generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Validate IBAN format
   */
  protected validateIBAN(iban: string): boolean {
    // Turkish IBAN: TR + 2 check digits + 5 bank code + 1 reserve + 16 account = 26 chars
    const cleanIban = iban.replace(/\s/g, "").toUpperCase();
    return /^TR\d{24}$/.test(cleanIban);
  }

  /**
   * Validate VKN (Tax ID) format
   */
  protected validateVKN(vkn: string): boolean {
    return /^\d{10,11}$/.test(vkn);
  }
}
