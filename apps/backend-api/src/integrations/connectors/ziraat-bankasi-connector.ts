import { BasePSD2BankConnector, type PSD2Transaction } from "./base-psd2-bank-connector";
import type { NormalizedBankTransaction } from "./types";
import { logger } from "@repo/shared-utils";

/**
 * T.C. Ziraat Bankası Integration Connector
 *
 * Implements PSD2 Open Banking integration with Ziraat Bankası.
 *
 * Ziraat Bankası Open Banking API:
 * - Production: https://api.ziraatbank.com.tr (requires approval)
 * - Sandbox: https://apitest.ziraatbank.com.tr
 *
 * Documentation: https://developer.ziraatbank.com.tr
 *
 * Features:
 * - Account Information Service (AIS) for balance and transaction data
 * - Payment Initiation Service (PIS) for payments
 * - Strong Customer Authentication (SCA) via mobile app or SMS
 * - Agricultural subsidy integration (Tarımsal Destek)
 *
 * Turkish Specifics:
 * - Uses IBAN format: TR + 2 check digits + 5 bank code + 1 reserve + 16 account
 * - Currency: TRY (Turkish Lira)
 * - Bank Code: 00010 (Ziraat Bankası - Turkey's largest state-owned bank)
 */
export class ZiraatBankasiConnector extends BasePSD2BankConnector {
  protected bankName = "Ziraat Bankası";
  protected baseUrl = "https://api.ziraatbank.com.tr/v1";
  protected sandboxUrl = "https://apitest.ziraatbank.com.tr/v1";
  protected tokenUrl = "https://api.ziraatbank.com.tr/oauth2/token";
  protected authorizeUrl = "https://api.ziraatbank.com.tr/oauth2/authorize";

  // Sandbox URLs
  private sandboxTokenUrl = "https://apitest.ziraatbank.com.tr/oauth2/token";
  private sandboxAuthorizeUrl = "https://apitest.ziraatbank.com.tr/oauth2/authorize";

  /**
   * Get token URL based on environment
   */
  protected getTokenUrl(): string {
    return this.config?.sandbox ? this.sandboxTokenUrl : this.tokenUrl;
  }

  /**
   * Get authorization URL based on environment
   */
  protected getAuthorizeUrl(): string {
    return this.config?.sandbox ? this.sandboxAuthorizeUrl : this.authorizeUrl;
  }

  /**
   * Override headers to add Ziraat-specific headers
   */
  protected override getHeaders(accessToken?: string): Record<string, string> {
    const headers = super.getHeaders(accessToken);

    // Ziraat Bankası specific headers
    headers["X-API-Key"] = this.config?.clientId || "";
    headers["X-API-Secret"] = this.config?.clientSecret || "";

    // PSU (Payment Service User) headers
    if (this.config?.iban) {
      headers["PSU-ID"] = this.config.iban;
    }

    // Ziraat uses request tracking ID
    headers["X-Request-Tracking-ID"] = this.generateRequestId();

    return headers;
  }

  /**
   * Map Ziraat Bankası specific transaction format to normalized format
   */
  protected override mapToNormalizedTransaction(
    txn: PSD2Transaction & ZiraatTransaction,
    accountIdentifier: string
  ): NormalizedBankTransaction {
    // Use base mapping first
    const normalized = super.mapToNormalizedTransaction(txn, accountIdentifier);

    // Apply Ziraat-specific mappings
    if (txn.islemTuru) {
      normalized.description = this.mapZiraatTransactionType(txn.islemTuru, normalized.description);
    }

    // Handle Ziraat-specific date formats
    if (txn.islemTarihi) {
      normalized.bookingDate = this.parseZiraatDate(txn.islemTarihi);
    }

    // Ziraat provides branch info
    if (txn.subeKodu && txn.subeName) {
      normalized.description = `${normalized.description} (${txn.subeName})`;
    }

    return normalized;
  }

  /**
   * Map Ziraat transaction types to Turkish descriptions
   */
  private mapZiraatTransactionType(type: string, fallback: string): string {
    const typeMap: Record<string, string> = {
      "HAVALE": "Havale",
      "EFT": "EFT Transferi",
      "VIRMAN": "Virman",
      "OTOMATIK_ODEME": "Otomatik Ödeme",
      "KREDI_KARTI": "Kredi Kartı Ödemesi",
      "FAIZ": "Faiz Geliri",
      "MASRAF": "Banka Masrafı",
      "VERGI": "Vergi Ödemesi",
      "MAAS": "Maaş Ödemesi",
      "EMEKLI_MAAS": "Emekli Maaşı",
      "TARIMSAL_DESTEK": "Tarımsal Destek Ödemesi",
      "KIRA": "Kira Ödemesi",
      "FATURA": "Fatura Ödemesi",
      "ATM": "ATM İşlemi",
      "POS": "POS İşlemi",
      "SWIFT": "SWIFT Transferi",
      "CEK": "Çek İşlemi",
      "SENET": "Senet İşlemi",
      "KREDI": "Kredi İşlemi",
      "DOVIZ": "Döviz İşlemi",
      "ALTIN": "Altın İşlemi",
      "BANKKART": "Bankkart İşlemi",
      "FAST": "FAST Transferi",
      "TR_KAREKOD": "TR Karekod Ödemesi",
    };

    return typeMap[type] || fallback || type;
  }

  /**
   * Parse Ziraat date format (DD.MM.YYYY HH:mm:ss or YYYY-MM-DD)
   */
  private parseZiraatDate(dateStr: string): Date {
    // Handle DD.MM.YYYY format
    if (dateStr.includes(".")) {
      const parts = dateStr.split(" ")[0].split(".");
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    // Handle standard ISO format
    return new Date(dateStr);
  }

  /**
   * Create Ziraat-specific consent request
   */
  async createZiraatConsent(config: Record<string, unknown>): Promise<{
    consentId: string;
    authorizationUrl: string;
    status: string;
    scaMethod?: string;
  }> {
    const baseConsent = await this.createConsent(config);

    // Build Ziraat-specific authorization URL
    const authUrl = new URL(this.getAuthorizeUrl());
    authUrl.searchParams.set("client_id", this.config!.clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", this.config!.redirectUri || "");
    authUrl.searchParams.set("scope", "aisp"); // Account Information Service Provider
    authUrl.searchParams.set("state", baseConsent.consentId);
    authUrl.searchParams.set("consent_id", baseConsent.consentId);

    // Ziraat supports multiple SCA methods
    const scaMethod = config.scaMethod as string | undefined;
    if (scaMethod) {
      authUrl.searchParams.set("sca_method", scaMethod); // "mobile" or "sms"
    }

    return {
      consentId: baseConsent.consentId,
      authorizationUrl: authUrl.toString(),
      status: baseConsent.status,
      scaMethod: scaMethod || "mobile",
    };
  }

  /**
   * Fetch account balances from Ziraat Bankası
   */
  async fetchBalances(accountId: string): Promise<ZiraatBalance[]> {
    if (!this.config?.accessToken) {
      logger.warn("[ZiraatBankasiConnector] Access token bulunamadı.");
      return [];
    }

    try {
      const response = await fetch(
        `${this.getApiUrl()}/accounts/${encodeURIComponent(accountId)}/balances`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        logger.error(`[ZiraatBankasiConnector] Bakiye alınamadı: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.balances || [];
    } catch (error) {
      logger.error("[ZiraatBankasiConnector] fetchBalances error:", error);
      return [];
    }
  }

  /**
   * Get account details including balance summary
   */
  async getAccountDetails(iban: string): Promise<ZiraatAccountDetails | null> {
    if (!this.config?.accessToken) {
      logger.warn("[ZiraatBankasiConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const [accounts, balances] = await Promise.all([
        this.fetchAccounts(),
        this.fetchBalances(iban),
      ]);

      const account = accounts.find((acc) => acc.iban === iban);

      if (!account) {
        logger.warn(`[ZiraatBankasiConnector] Hesap bulunamadı: ${iban}`);
        return null;
      }

      return {
        ...account,
        balances,
        bankName: this.bankName,
        bankCode: "00010",
      };
    } catch (error) {
      logger.error("[ZiraatBankasiConnector] getAccountDetails error:", error);
      return null;
    }
  }

  /**
   * Fetch agricultural subsidy payments (Tarımsal Destek)
   * Specific to Ziraat Bankası as Turkey's primary agricultural bank
   */
  async fetchAgriculturalSubsidies(
    iban: string,
    year: number
  ): Promise<ZiraatAgriculturalSubsidy[]> {
    if (!this.config?.accessToken) {
      logger.warn("[ZiraatBankasiConnector] Access token bulunamadı.");
      return [];
    }

    try {
      const response = await fetch(
        `${this.getApiUrl()}/accounts/${encodeURIComponent(iban)}/agricultural-subsidies?year=${year}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        logger.error(`[ZiraatBankasiConnector] Tarımsal destek bilgisi alınamadı: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.subsidies || [];
    } catch (error) {
      logger.error("[ZiraatBankasiConnector] fetchAgriculturalSubsidies error:", error);
      return [];
    }
  }

  /**
   * Initiate a FAST (Fonların Anlık ve Sürekli Transferi) payment
   */
  async initiateFastPayment(payment: FastPaymentRequest): Promise<FastPaymentResponse> {
    if (!this.config?.accessToken) {
      throw new Error("Access token bulunamadı. Önce yetkilendirme yapın.");
    }

    const response = await fetch(`${this.getApiUrl()}/payments/fast`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        debtorAccount: { iban: payment.fromIban },
        creditorAccount: { iban: payment.toIban },
        instructedAmount: {
          amount: payment.amount.toFixed(2),
          currency: payment.currency || "TRY",
        },
        remittanceInformationUnstructured: payment.description,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FAST ödeme başlatılamadı: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      paymentId: data.paymentId,
      status: data.transactionStatus,
      scaRedirectUrl: data._links?.scaRedirect?.href,
    };
  }

  /**
   * Initiate a TR Karekod (QR Code) payment
   */
  async initiateQRPayment(payment: QRPaymentRequest): Promise<QRPaymentResponse> {
    if (!this.config?.accessToken) {
      throw new Error("Access token bulunamadı. Önce yetkilendirme yapın.");
    }

    const response = await fetch(`${this.getApiUrl()}/payments/tr-karekod`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        debtorAccount: { iban: payment.fromIban },
        qrData: payment.qrData,
        instructedAmount: payment.amount ? {
          amount: payment.amount.toFixed(2),
          currency: payment.currency || "TRY",
        } : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TR Karekod ödeme başlatılamadı: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      paymentId: data.paymentId,
      status: data.transactionStatus,
      creditorName: data.creditorName,
      amount: data.instructedAmount?.amount,
      scaRedirectUrl: data._links?.scaRedirect?.href,
    };
  }
}

/**
 * Ziraat Bankası specific transaction fields
 */
interface ZiraatTransaction {
  islemTuru?: string;
  islemTarihi?: string;
  subeKodu?: string;
  subeName?: string;
  referansNo?: string;
  kanalBilgisi?: string;
}

/**
 * Ziraat Bankası balance response
 */
interface ZiraatBalance {
  balanceType: string;
  balanceAmount: {
    amount: string;
    currency: string;
  };
  referenceDate?: string;
  availableBalance?: string;
  blockedBalance?: string;
}

/**
 * Ziraat Bankası account details
 */
interface ZiraatAccountDetails {
  resourceId: string;
  iban?: string;
  bban?: string;
  currency: string;
  name?: string;
  product?: string;
  cashAccountType?: string;
  status?: string;
  balances: ZiraatBalance[];
  bankName: string;
  bankCode: string;
}

/**
 * Agricultural subsidy information
 */
interface ZiraatAgriculturalSubsidy {
  subsidyId: string;
  subsidyType: string;
  subsidyName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  status: string;
  farmerRegistryNumber?: string;
}

/**
 * FAST payment request
 */
interface FastPaymentRequest {
  fromIban: string;
  toIban: string;
  amount: number;
  currency?: string;
  description?: string;
}

/**
 * FAST payment response
 */
interface FastPaymentResponse {
  paymentId: string;
  status: string;
  scaRedirectUrl?: string;
}

/**
 * QR Code payment request
 */
interface QRPaymentRequest {
  fromIban: string;
  qrData: string;
  amount?: number;
  currency?: string;
}

/**
 * QR Code payment response
 */
interface QRPaymentResponse {
  paymentId: string;
  status: string;
  creditorName?: string;
  amount?: string;
  scaRedirectUrl?: string;
}
