import { BasePSD2BankConnector, type PSD2Transaction } from "./base-psd2-bank-connector";
import type { NormalizedBankTransaction } from "./types";
import { logger } from "@repo/shared-utils";

/**
 * Yapı Kredi Bankası Integration Connector
 *
 * Implements PSD2 Open Banking integration with Yapı Kredi.
 *
 * Yapı Kredi Open Banking API:
 * - Production: https://api.yapikredi.com.tr (requires approval)
 * - Sandbox: https://apitest.yapikredi.com.tr
 *
 * Documentation: https://developer.yapikredi.com.tr
 *
 * Features:
 * - Account Information Service (AIS) for balance and transaction data
 * - Payment Initiation Service (PIS) for payments
 * - Strong Customer Authentication (SCA) via Yapı Kredi Mobil or SMS
 * - World card integration
 *
 * Turkish Specifics:
 * - Uses IBAN format: TR + 2 check digits + 5 bank code + 1 reserve + 16 account
 * - Currency: TRY (Turkish Lira)
 * - Bank Code: 00067 (Yapı Kredi)
 */
export class YapiKrediConnector extends BasePSD2BankConnector {
  protected bankName = "Yapı Kredi";
  protected baseUrl = "https://api.yapikredi.com.tr/v1";
  protected sandboxUrl = "https://apitest.yapikredi.com.tr/v1";
  protected tokenUrl = "https://api.yapikredi.com.tr/oauth2/token";
  protected authorizeUrl = "https://api.yapikredi.com.tr/oauth2/authorize";

  // Sandbox URLs
  private sandboxTokenUrl = "https://apitest.yapikredi.com.tr/oauth2/token";
  private sandboxAuthorizeUrl = "https://apitest.yapikredi.com.tr/oauth2/authorize";

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
   * Override headers to add Yapı Kredi-specific headers
   */
  protected override getHeaders(accessToken?: string): Record<string, string> {
    const headers = super.getHeaders(accessToken);

    // Yapı Kredi specific headers
    headers["X-YKB-Client-Id"] = this.config?.clientId || "";
    headers["X-YKB-Client-Secret"] = this.config?.clientSecret || "";

    // PSU (Payment Service User) headers
    if (this.config?.iban) {
      headers["PSU-ID"] = this.config.iban;
    }

    // Yapı Kredi uses request ID for tracing
    headers["X-YKB-Request-Id"] = this.generateRequestId();

    return headers;
  }

  /**
   * Map Yapı Kredi specific transaction format to normalized format
   */
  protected override mapToNormalizedTransaction(
    txn: PSD2Transaction & YapiKrediTransaction,
    accountIdentifier: string
  ): NormalizedBankTransaction {
    // Use base mapping first
    const normalized = super.mapToNormalizedTransaction(txn, accountIdentifier);

    // Apply Yapı Kredi-specific mappings
    if (txn.islemKodu) {
      normalized.description = this.mapYapiKrediTransactionCode(txn.islemKodu, normalized.description);
    }

    // Handle Yapı Kredi-specific date formats
    if (txn.islemTarihi) {
      normalized.bookingDate = this.parseYapiKrediDate(txn.islemTarihi);
    }

    // Yapı Kredi provides detailed transaction category
    if (txn.kategori) {
      normalized.description = `${this.mapCategory(txn.kategori)} - ${normalized.description}`;
    }

    return normalized;
  }

  /**
   * Map Yapı Kredi transaction codes to Turkish descriptions
   */
  private mapYapiKrediTransactionCode(code: string, fallback: string): string {
    const codeMap: Record<string, string> = {
      "HVL": "Havale",
      "EFT": "EFT Transferi",
      "VRM": "Virman",
      "OTO": "Otomatik Ödeme",
      "WRL": "World Kart İşlemi",
      "KK": "Kredi Kartı Ödemesi",
      "FAZ": "Faiz Geliri",
      "MSR": "Banka Masrafı",
      "VRG": "Vergi Ödemesi",
      "MAA": "Maaş Ödemesi",
      "KRA": "Kira Ödemesi",
      "FTR": "Fatura Ödemesi",
      "ATM": "ATM İşlemi",
      "POS": "POS İşlemi",
      "SWF": "SWIFT Transferi",
      "CEK": "Çek İşlemi",
      "SND": "Senet İşlemi",
      "KRD": "Kredi İşlemi",
      "DVZ": "Döviz İşlemi",
      "FST": "FAST Transferi",
      "QRP": "QR Kod Ödemesi",
      "YKM": "Yapı Kredi Mobil",
      "PPY": "Parapara Ödemesi",
    };

    return codeMap[code] || fallback || code;
  }

  /**
   * Map transaction category
   */
  private mapCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      "TRANSFER": "Transfer",
      "PAYMENT": "Ödeme",
      "SHOPPING": "Alışveriş",
      "WITHDRAWAL": "Para Çekme",
      "DEPOSIT": "Para Yatırma",
      "SALARY": "Maaş",
      "BILL": "Fatura",
      "RENT": "Kira",
      "INVESTMENT": "Yatırım",
      "LOAN": "Kredi",
      "FEE": "Masraf",
      "INTEREST": "Faiz",
    };

    return categoryMap[category] || category;
  }

  /**
   * Parse Yapı Kredi date format (DD-MM-YYYY or YYYY-MM-DD)
   */
  private parseYapiKrediDate(dateStr: string): Date {
    // Handle DD-MM-YYYY format
    if (dateStr.includes("-") && dateStr.split("-")[0].length === 2) {
      const parts = dateStr.split("-");
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    // Handle standard ISO format
    return new Date(dateStr);
  }

  /**
   * Create Yapı Kredi-specific consent request
   */
  async createYapiKrediConsent(config: Record<string, unknown>): Promise<{
    consentId: string;
    authorizationUrl: string;
    status: string;
    scaMethod?: string;
  }> {
    const baseConsent = await this.createConsent(config);

    // Build Yapı Kredi-specific authorization URL
    const authUrl = new URL(this.getAuthorizeUrl());
    authUrl.searchParams.set("client_id", this.config!.clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", this.config!.redirectUri || "");
    authUrl.searchParams.set("scope", "aisp pisp"); // Both AIS and PIS
    authUrl.searchParams.set("state", baseConsent.consentId);
    authUrl.searchParams.set("consent_id", baseConsent.consentId);

    // Yapı Kredi supports multiple SCA methods
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
   * Fetch account balances from Yapı Kredi
   */
  async fetchBalances(accountId: string): Promise<YapiKrediBalance[]> {
    if (!this.config?.accessToken) {
      logger.warn("[YapiKrediConnector] Access token bulunamadı.");
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
        logger.error(`[YapiKrediConnector] Bakiye alınamadı: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.balances || [];
    } catch (error) {
      logger.error("[YapiKrediConnector] fetchBalances error:", error);
      return [];
    }
  }

  /**
   * Get account details including balance summary
   */
  async getAccountDetails(iban: string): Promise<YapiKrediAccountDetails | null> {
    if (!this.config?.accessToken) {
      logger.warn("[YapiKrediConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const [accounts, balances] = await Promise.all([
        this.fetchAccounts(),
        this.fetchBalances(iban),
      ]);

      const account = accounts.find((acc) => acc.iban === iban);

      if (!account) {
        logger.warn(`[YapiKrediConnector] Hesap bulunamadı: ${iban}`);
        return null;
      }

      return {
        ...account,
        balances,
        bankName: this.bankName,
        bankCode: "00067",
      };
    } catch (error) {
      logger.error("[YapiKrediConnector] getAccountDetails error:", error);
      return null;
    }
  }

  /**
   * Fetch World card transactions
   */
  async fetchWorldCardTransactions(
    cardNumber: string,
    sinceDate: Date,
    untilDate: Date
  ): Promise<NormalizedBankTransaction[]> {
    if (!this.config?.accessToken) {
      logger.warn("[YapiKrediConnector] Access token bulunamadı.");
      return [];
    }

    try {
      const dateFrom = sinceDate.toISOString().split("T")[0];
      const dateTo = untilDate.toISOString().split("T")[0];

      const response = await fetch(
        `${this.getApiUrl()}/cards/${encodeURIComponent(cardNumber)}/transactions?dateFrom=${dateFrom}&dateTo=${dateTo}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        logger.error(`[YapiKrediConnector] Kart işlemleri alınamadı: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const transactions: WorldCardTransaction[] = data.transactions || [];

      return transactions.map((txn) => ({
        externalId: txn.transactionId || `${txn.transactionDate}-${Math.random().toString(36).substring(7)}`,
        accountIdentifier: cardNumber,
        bookingDate: new Date(txn.transactionDate),
        valueDate: txn.postingDate ? new Date(txn.postingDate) : null,
        description: `${txn.merchantName || "World Kart İşlemi"} - ${txn.merchantCategory || ""}`.trim(),
        amount: -Math.abs(parseFloat(txn.amount)),
        currency: txn.currency || "TRY",
        balanceAfter: null,
      }));
    } catch (error) {
      logger.error("[YapiKrediConnector] fetchWorldCardTransactions error:", error);
      return [];
    }
  }

  /**
   * Fetch World card Worldpuan (bonus points)
   */
  async fetchWorldPoints(cardNumber: string): Promise<WorldPointsInfo | null> {
    if (!this.config?.accessToken) {
      logger.warn("[YapiKrediConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const response = await fetch(
        `${this.getApiUrl()}/cards/${encodeURIComponent(cardNumber)}/world-points`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        logger.error(`[YapiKrediConnector] World puanları alınamadı: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.pointsInfo || null;
    } catch (error) {
      logger.error("[YapiKrediConnector] fetchWorldPoints error:", error);
      return null;
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
   * Initiate Parapara payment (Yapı Kredi's mobile payment)
   */
  async initiateParaparaPayment(payment: ParaparaPaymentRequest): Promise<ParaparaPaymentResponse> {
    if (!this.config?.accessToken) {
      throw new Error("Access token bulunamadı. Önce yetkilendirme yapın.");
    }

    const response = await fetch(`${this.getApiUrl()}/payments/parapara`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        debtorAccount: { iban: payment.fromIban },
        creditorPhoneNumber: payment.toPhoneNumber,
        instructedAmount: {
          amount: payment.amount.toFixed(2),
          currency: payment.currency || "TRY",
        },
        remittanceInformationUnstructured: payment.description,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Parapara ödeme başlatılamadı: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      paymentId: data.paymentId,
      status: data.transactionStatus,
      scaRedirectUrl: data._links?.scaRedirect?.href,
    };
  }

  /**
   * Request World card statement
   */
  async requestWorldCardStatement(
    cardNumber: string,
    month: number,
    year: number
  ): Promise<WorldCardStatement | null> {
    if (!this.config?.accessToken) {
      logger.warn("[YapiKrediConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const response = await fetch(
        `${this.getApiUrl()}/cards/${encodeURIComponent(cardNumber)}/statement?month=${month}&year=${year}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        logger.error(`[YapiKrediConnector] Ekstre alınamadı: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.statement || null;
    } catch (error) {
      logger.error("[YapiKrediConnector] requestWorldCardStatement error:", error);
      return null;
    }
  }
}

/**
 * Yapı Kredi specific transaction fields
 */
interface YapiKrediTransaction {
  islemKodu?: string;
  islemTarihi?: string;
  kategori?: string;
  subeKodu?: string;
  referansNo?: string;
  kanalBilgisi?: string;
}

/**
 * World card transaction
 */
interface WorldCardTransaction {
  transactionId?: string;
  transactionDate: string;
  postingDate?: string;
  amount: string;
  currency?: string;
  merchantName?: string;
  merchantCategory?: string;
  merchantCountry?: string;
  installmentCount?: number;
  worldPoints?: number;
}

/**
 * World points info
 */
interface WorldPointsInfo {
  totalPoints: number;
  availablePoints: number;
  pendingPoints: number;
  expiringPoints?: number;
  expiringDate?: string;
  pointsValue?: number; // TRY value of points
}

/**
 * World card statement
 */
interface WorldCardStatement {
  statementDate: string;
  dueDate: string;
  minimumPayment: number;
  totalAmount: number;
  previousBalance: number;
  payments: number;
  newCharges: number;
  currency: string;
  transactions: WorldCardTransaction[];
}

/**
 * Yapı Kredi balance response
 */
interface YapiKrediBalance {
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
 * Yapı Kredi account details
 */
interface YapiKrediAccountDetails {
  resourceId: string;
  iban?: string;
  bban?: string;
  currency: string;
  name?: string;
  product?: string;
  cashAccountType?: string;
  status?: string;
  balances: YapiKrediBalance[];
  bankName: string;
  bankCode: string;
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
 * Parapara payment request
 */
interface ParaparaPaymentRequest {
  fromIban: string;
  toPhoneNumber: string;
  amount: number;
  currency?: string;
  description?: string;
}

/**
 * Parapara payment response
 */
interface ParaparaPaymentResponse {
  paymentId: string;
  status: string;
  scaRedirectUrl?: string;
}
