import { BasePSD2BankConnector, type PSD2Transaction } from "./base-psd2-bank-connector";
import type { NormalizedBankTransaction } from "./types";
import { logger } from "@repo/shared-utils";

/**
 * İş Bankası (Isbank) Integration Connector
 *
 * Implements PSD2 Open Banking integration with Türkiye İş Bankası.
 *
 * İş Bankası Open Banking API:
 * - Production: https://api.isbank.com.tr (requires approval)
 * - Sandbox: https://apitest.isbank.com.tr
 *
 * Documentation: https://developer.isbank.com.tr
 *
 * Features:
 * - Account Information Service (AIS) for balance and transaction data
 * - Payment Initiation Service (PIS) for payments
 * - Strong Customer Authentication (SCA) via İşCep mobile app or SMS
 *
 * Turkish Specifics:
 * - Uses IBAN format: TR + 2 check digits + 5 bank code + 1 reserve + 16 account
 * - Currency: TRY (Turkish Lira)
 * - Bank Code: 00064 (İş Bankası)
 */
export class IsBankasiConnector extends BasePSD2BankConnector {
  protected bankName = "İş Bankası";
  protected baseUrl = "https://api.isbank.com.tr/v1";
  protected sandboxUrl = "https://apitest.isbank.com.tr/v1";
  protected tokenUrl = "https://api.isbank.com.tr/oauth2/token";
  protected authorizeUrl = "https://api.isbank.com.tr/oauth2/authorize";

  // Sandbox URLs
  private sandboxTokenUrl = "https://apitest.isbank.com.tr/oauth2/token";
  private sandboxAuthorizeUrl = "https://apitest.isbank.com.tr/oauth2/authorize";

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
   * Override headers to add İş Bankası-specific headers
   */
  protected override getHeaders(accessToken?: string): Record<string, string> {
    const headers = super.getHeaders(accessToken);

    // İş Bankası specific headers
    headers["X-Client-Id"] = this.config?.clientId || "";
    headers["X-Client-Secret"] = this.config?.clientSecret || "";

    // PSU (Payment Service User) headers
    if (this.config?.iban) {
      headers["PSU-ID"] = this.config.iban;
    }

    // İş Bankası uses correlation ID for request tracing
    headers["X-Correlation-ID"] = this.generateRequestId();

    return headers;
  }

  /**
   * Map İş Bankası specific transaction format to normalized format
   */
  protected override mapToNormalizedTransaction(
    txn: PSD2Transaction & IsBankasiTransaction,
    accountIdentifier: string
  ): NormalizedBankTransaction {
    // Use base mapping first
    const normalized = super.mapToNormalizedTransaction(txn, accountIdentifier);

    // Apply İş Bankası-specific mappings
    if (txn.islemKodu) {
      normalized.description = this.mapIsBankasiTransactionCode(txn.islemKodu, normalized.description);
    }

    // Handle İş Bankası specific date formats
    if (txn.islemTarihi) {
      normalized.bookingDate = this.parseIsBankasiDate(txn.islemTarihi);
    }

    // İş Bankası provides detailed transaction type
    if (txn.islemTipi) {
      normalized.description = `${this.mapIsBankasiTransactionType(txn.islemTipi)} - ${normalized.description}`;
    }

    return normalized;
  }

  /**
   * Map İş Bankası transaction codes to Turkish descriptions
   */
  private mapIsBankasiTransactionCode(code: string, fallback: string): string {
    const codeMap: Record<string, string> = {
      "HVL": "Havale",
      "EFT": "EFT Transferi",
      "VRM": "Virman",
      "OTO": "Otomatik Ödeme",
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
      "MAX": "Maximum Kart",
      "BNM": "Bankamatik",
    };

    return codeMap[code] || fallback || code;
  }

  /**
   * Map İş Bankası transaction types
   */
  private mapIsBankasiTransactionType(type: string): string {
    const typeMap: Record<string, string> = {
      "GELEN": "Gelen",
      "GIDEN": "Giden",
      "ALACAK": "Alacak",
      "BORC": "Borç",
      "TRANSFER_IN": "Gelen Transfer",
      "TRANSFER_OUT": "Giden Transfer",
      "PAYMENT": "Ödeme",
      "DEPOSIT": "Yatırma",
      "WITHDRAWAL": "Çekme",
    };

    return typeMap[type] || type;
  }

  /**
   * Parse İş Bankası date format (DD/MM/YYYY or YYYY-MM-DD)
   */
  private parseIsBankasiDate(dateStr: string): Date {
    // Handle DD/MM/YYYY format
    if (dateStr.includes("/")) {
      const [day, month, year] = dateStr.split("/");
      return new Date(`${year}-${month}-${day}`);
    }
    // Handle standard ISO format
    return new Date(dateStr);
  }

  /**
   * Create İş Bankası-specific consent request
   */
  async createIsBankasiConsent(config: Record<string, unknown>): Promise<{
    consentId: string;
    authorizationUrl: string;
    status: string;
    scaMethod?: string;
  }> {
    const baseConsent = await this.createConsent(config);

    // Build İş Bankası-specific authorization URL
    const authUrl = new URL(this.getAuthorizeUrl());
    authUrl.searchParams.set("client_id", this.config!.clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", this.config!.redirectUri || "");
    authUrl.searchParams.set("scope", "aisp"); // Account Information Service Provider
    authUrl.searchParams.set("state", baseConsent.consentId);
    authUrl.searchParams.set("consent_id", baseConsent.consentId);

    // İş Bankası supports multiple SCA methods
    const scaMethod = config.scaMethod as string | undefined;
    if (scaMethod) {
      authUrl.searchParams.set("sca_method", scaMethod); // "iscep" or "sms"
    }

    return {
      consentId: baseConsent.consentId,
      authorizationUrl: authUrl.toString(),
      status: baseConsent.status,
      scaMethod: scaMethod || "iscep", // Default to İşCep mobile app
    };
  }

  /**
   * Fetch account balances from İş Bankası
   */
  async fetchBalances(accountId: string): Promise<IsBankasiBalance[]> {
    if (!this.config?.accessToken) {
      logger.warn("[IsBankasiConnector] Access token bulunamadı.");
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
        logger.error(`[IsBankasiConnector] Bakiye alınamadı: ${response.status}`);
        return [];
      }

      const data: any = await response.json();
      return data.balances || [];
    } catch (error: unknown) {
      logger.error("[IsBankasiConnector] fetchBalances error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Fetch İş Bankası Maximum card transactions
   */
  async fetchMaximumCardTransactions(
    cardNumber: string,
    sinceDate: Date,
    untilDate: Date
  ): Promise<NormalizedBankTransaction[]> {
    if (!this.config?.accessToken) {
      logger.warn("[IsBankasiConnector] Access token bulunamadı.");
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
        logger.error(`[IsBankasiConnector] Kart işlemleri alınamadı: ${response.status}`);
        return [];
      }

      const data: any = await response.json();
      const transactions: IsBankasiCardTransaction[] = data.transactions || [];

      return transactions.map((txn) => ({
        externalId: txn.transactionId || `${txn.transactionDate}-${Math.random().toString(36).substring(7)}`,
        accountIdentifier: cardNumber,
        bookingDate: new Date(txn.transactionDate),
        valueDate: txn.postingDate ? new Date(txn.postingDate) : null,
        description: `${txn.merchantName || "Kart İşlemi"} - ${txn.merchantCategory || ""}`.trim(),
        amount: -Math.abs(parseFloat(txn.amount)), // Card transactions are typically debits
        currency: txn.currency || "TRY",
        balanceAfter: null,
      }));
    } catch (error: unknown) {
      logger.error("[IsBankasiConnector] fetchMaximumCardTransactions error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Get account details including balance summary
   */
  async getAccountDetails(iban: string): Promise<IsBankasiAccountDetails | null> {
    if (!this.config?.accessToken) {
      logger.warn("[IsBankasiConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const [accounts, balances] = await Promise.all([
        this.fetchAccounts(),
        this.fetchBalances(iban),
      ]);

      const account = accounts.find((acc) => acc.iban === iban);

      if (!account) {
        logger.warn(`[IsBankasiConnector] Hesap bulunamadı: ${iban}`);
        return null;
      }

      return {
        ...account,
        balances,
        bankName: this.bankName,
        bankCode: "00064",
      };
    } catch (error: unknown) {
      logger.error("[IsBankasiConnector] getAccountDetails error:", { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Initiate a FAST (Fonların Anlık ve Sürekli Transferi) payment
   * FAST is Turkey's instant payment system
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

    const data: any = await response.json();

    return {
      paymentId: data.paymentId,
      status: data.transactionStatus,
      scaRedirectUrl: data._links?.scaRedirect?.href,
    };
  }
}

/**
 * İş Bankası specific transaction fields
 */
interface IsBankasiTransaction {
  islemKodu?: string;
  islemTarihi?: string;
  islemTipi?: string;
  subeKodu?: string;
  kanalBilgisi?: string;
  referansNo?: string;
}

/**
 * İş Bankası card transaction
 */
interface IsBankasiCardTransaction {
  transactionId?: string;
  transactionDate: string;
  postingDate?: string;
  amount: string;
  currency?: string;
  merchantName?: string;
  merchantCategory?: string;
  merchantCountry?: string;
}

/**
 * İş Bankası balance response
 */
interface IsBankasiBalance {
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
 * İş Bankası account details
 */
interface IsBankasiAccountDetails {
  resourceId: string;
  iban?: string;
  bban?: string;
  currency: string;
  name?: string;
  product?: string;
  cashAccountType?: string;
  status?: string;
  balances: IsBankasiBalance[];
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
