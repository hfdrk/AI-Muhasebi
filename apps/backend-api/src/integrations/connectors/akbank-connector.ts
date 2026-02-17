import { BasePSD2BankConnector, type PSD2Transaction } from "./base-psd2-bank-connector";
import type { NormalizedBankTransaction } from "./types";
import { logger } from "@repo/shared-utils";

/**
 * Akbank Integration Connector
 *
 * Implements PSD2 Open Banking integration with Akbank.
 *
 * Akbank Open Banking API:
 * - Production: https://api.akbank.com (requires approval)
 * - Sandbox: https://apitest.akbank.com
 *
 * Documentation: https://developer.akbank.com
 *
 * Features:
 * - Account Information Service (AIS) for balance and transaction data
 * - Payment Initiation Service (PIS) for payments
 * - Strong Customer Authentication (SCA) via Akbank Mobil or SMS
 * - Axess card integration
 *
 * Turkish Specifics:
 * - Uses IBAN format: TR + 2 check digits + 5 bank code + 1 reserve + 16 account
 * - Currency: TRY (Turkish Lira)
 * - Bank Code: 00046 (Akbank)
 */
export class AkbankConnector extends BasePSD2BankConnector {
  protected bankName = "Akbank";
  protected baseUrl = "https://api.akbank.com/v1";
  protected sandboxUrl = "https://apitest.akbank.com/v1";
  protected tokenUrl = "https://api.akbank.com/oauth2/token";
  protected authorizeUrl = "https://api.akbank.com/oauth2/authorize";

  // Sandbox URLs
  private sandboxTokenUrl = "https://apitest.akbank.com/oauth2/token";
  private sandboxAuthorizeUrl = "https://apitest.akbank.com/oauth2/authorize";

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
   * Override headers to add Akbank-specific headers
   */
  protected override getHeaders(accessToken?: string): Record<string, string> {
    const headers = super.getHeaders(accessToken);

    // Akbank specific headers
    headers["X-Client-Key"] = this.config?.clientId || "";
    headers["X-Client-Secret"] = this.config?.clientSecret || "";

    // PSU (Payment Service User) headers
    if (this.config?.iban) {
      headers["PSU-ID"] = this.config.iban;
    }

    // Akbank uses correlation ID for request tracing
    headers["X-Correlation-ID"] = this.generateRequestId();

    return headers;
  }

  /**
   * Map Akbank specific transaction format to normalized format
   */
  protected override mapToNormalizedTransaction(
    txn: PSD2Transaction & AkbankTransaction,
    accountIdentifier: string
  ): NormalizedBankTransaction {
    // Use base mapping first
    const normalized = super.mapToNormalizedTransaction(txn, accountIdentifier);

    // Apply Akbank-specific mappings
    if (txn.transactionCode) {
      normalized.description = this.mapAkbankTransactionCode(txn.transactionCode, normalized.description);
    }

    // Handle Akbank-specific date formats
    if (txn.processingDate) {
      normalized.bookingDate = this.parseAkbankDate(txn.processingDate);
    }

    // Akbank provides channel info
    if (txn.channel) {
      normalized.description = `${normalized.description} (${this.mapChannel(txn.channel)})`;
    }

    return normalized;
  }

  /**
   * Map Akbank transaction codes to Turkish descriptions
   */
  private mapAkbankTransactionCode(code: string, fallback: string): string {
    const codeMap: Record<string, string> = {
      "HVL": "Havale",
      "EFT": "EFT Transferi",
      "VRM": "Virman",
      "OTO": "Otomatik Ödeme",
      "AXS": "Axess Kart İşlemi",
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
      "CNT": "Kontakt Ödeme",
      "WNG": "Wing Ödemesi",
    };

    return codeMap[code] || fallback || code;
  }

  /**
   * Map channel codes to descriptions
   */
  private mapChannel(channel: string): string {
    const channelMap: Record<string, string> = {
      "MOBILE": "Akbank Mobil",
      "INTERNET": "Akbank İnternet",
      "ATM": "Akbank ATM",
      "BRANCH": "Şube",
      "POS": "POS",
      "CALL_CENTER": "Çağrı Merkezi",
    };

    return channelMap[channel] || channel;
  }

  /**
   * Parse Akbank date format (DD/MM/YYYY HH:mm or YYYY-MM-DD)
   */
  private parseAkbankDate(dateStr: string): Date {
    // Handle DD/MM/YYYY format
    if (dateStr.includes("/")) {
      const parts = dateStr.split(" ")[0].split("/");
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    // Handle standard ISO format
    return new Date(dateStr);
  }

  /**
   * Create Akbank-specific consent request
   */
  async createAkbankConsent(config: Record<string, unknown>): Promise<{
    consentId: string;
    authorizationUrl: string;
    status: string;
    scaMethod?: string;
  }> {
    const baseConsent = await this.createConsent(config);

    // Build Akbank-specific authorization URL
    const authUrl = new URL(this.getAuthorizeUrl());
    authUrl.searchParams.set("client_id", this.config!.clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", this.config!.redirectUri || "");
    authUrl.searchParams.set("scope", "aisp pisp"); // Both AIS and PIS
    authUrl.searchParams.set("state", baseConsent.consentId);
    authUrl.searchParams.set("consent_id", baseConsent.consentId);

    // Akbank supports multiple SCA methods
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
   * Fetch account balances from Akbank
   */
  async fetchBalances(accountId: string): Promise<AkbankBalance[]> {
    if (!this.config?.accessToken) {
      logger.warn("[AkbankConnector] Access token bulunamadı.");
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
        logger.error(`[AkbankConnector] Bakiye alınamadı: ${response.status}`);
        return [];
      }

      const data = await response.json() as { balances?: AkbankBalance[] };
      return data.balances || [];
    } catch (error: unknown) {
      logger.error("[AkbankConnector] fetchBalances error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Get account details including balance summary
   */
  async getAccountDetails(iban: string): Promise<AkbankAccountDetails | null> {
    if (!this.config?.accessToken) {
      logger.warn("[AkbankConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const [accounts, balances] = await Promise.all([
        this.fetchAccounts(),
        this.fetchBalances(iban),
      ]);

      const account = accounts.find((acc) => acc.iban === iban);

      if (!account) {
        logger.warn(`[AkbankConnector] Hesap bulunamadı: ${iban}`);
        return null;
      }

      return {
        ...account,
        balances,
        bankName: this.bankName,
        bankCode: "00046",
      };
    } catch (error: unknown) {
      logger.error("[AkbankConnector] getAccountDetails error:", { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Fetch Axess card transactions
   */
  async fetchAxessCardTransactions(
    cardNumber: string,
    sinceDate: Date,
    untilDate: Date
  ): Promise<NormalizedBankTransaction[]> {
    if (!this.config?.accessToken) {
      logger.warn("[AkbankConnector] Access token bulunamadı.");
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
        logger.error(`[AkbankConnector] Kart işlemleri alınamadı: ${response.status}`);
        return [];
      }

      const data = await response.json() as { transactions?: AxessCardTransaction[] };
      const transactions: AxessCardTransaction[] = data.transactions || [];

      return transactions.map((txn) => ({
        externalId: txn.transactionId || `${txn.transactionDate}-${Math.random().toString(36).substring(7)}`,
        accountIdentifier: cardNumber,
        bookingDate: new Date(txn.transactionDate),
        valueDate: txn.postingDate ? new Date(txn.postingDate) : null,
        description: `${txn.merchantName || "Axess İşlemi"} - ${txn.merchantCategory || ""}`.trim(),
        amount: -Math.abs(parseFloat(txn.amount)),
        currency: txn.currency || "TRY",
        balanceAfter: null,
      }));
    } catch (error: unknown) {
      logger.error("[AkbankConnector] fetchAxessCardTransactions error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Fetch Axess card bonus points
   */
  async fetchAxessBonusPoints(cardNumber: string): Promise<AxessBonusInfo | null> {
    if (!this.config?.accessToken) {
      logger.warn("[AkbankConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const response = await fetch(
        `${this.getApiUrl()}/cards/${encodeURIComponent(cardNumber)}/bonus-points`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        logger.error(`[AkbankConnector] Bonus puanları alınamadı: ${response.status}`);
        return null;
      }

      const data = await response.json() as { bonusInfo?: AxessBonusInfo };
      return data.bonusInfo || null;
    } catch (error: unknown) {
      logger.error("[AkbankConnector] fetchAxessBonusPoints error:", { error: error instanceof Error ? error.message : String(error) });
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

    const data = await response.json() as {
      paymentId: string;
      transactionStatus: string;
      _links?: { scaRedirect?: { href: string } };
    };

    return {
      paymentId: data.paymentId,
      status: data.transactionStatus,
      scaRedirectUrl: data._links?.scaRedirect?.href,
    };
  }

  /**
   * Initiate Wing payment (Akbank's digital wallet)
   */
  async initiateWingPayment(payment: WingPaymentRequest): Promise<WingPaymentResponse> {
    if (!this.config?.accessToken) {
      throw new Error("Access token bulunamadı. Önce yetkilendirme yapın.");
    }

    const response = await fetch(`${this.getApiUrl()}/payments/wing`, {
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
      throw new Error(`Wing ödeme başlatılamadı: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      paymentId: string;
      transactionStatus: string;
      _links?: { scaRedirect?: { href: string } };
    };

    return {
      paymentId: data.paymentId,
      status: data.transactionStatus,
      scaRedirectUrl: data._links?.scaRedirect?.href,
    };
  }
}

/**
 * Akbank specific transaction fields
 */
interface AkbankTransaction {
  transactionCode?: string;
  processingDate?: string;
  channel?: string;
  branchCode?: string;
  referenceNumber?: string;
}

/**
 * Axess card transaction
 */
interface AxessCardTransaction {
  transactionId?: string;
  transactionDate: string;
  postingDate?: string;
  amount: string;
  currency?: string;
  merchantName?: string;
  merchantCategory?: string;
  merchantCountry?: string;
  installmentCount?: number;
  bonusPoints?: number;
}

/**
 * Axess bonus info
 */
interface AxessBonusInfo {
  totalPoints: number;
  availablePoints: number;
  pendingPoints: number;
  expiringPoints?: number;
  expiringDate?: string;
}

/**
 * Akbank balance response
 */
interface AkbankBalance {
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
 * Akbank account details
 */
interface AkbankAccountDetails {
  resourceId: string;
  iban?: string;
  bban?: string;
  currency: string;
  name?: string;
  product?: string;
  cashAccountType?: string;
  status?: string;
  balances: AkbankBalance[];
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
 * Wing payment request
 */
interface WingPaymentRequest {
  fromIban: string;
  toPhoneNumber: string;
  amount: number;
  currency?: string;
  description?: string;
}

/**
 * Wing payment response
 */
interface WingPaymentResponse {
  paymentId: string;
  status: string;
  scaRedirectUrl?: string;
}
