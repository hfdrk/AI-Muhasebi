import { BasePSD2BankConnector, type PSD2Transaction } from "./base-psd2-bank-connector";
import type { NormalizedBankTransaction } from "./types";
import { logger } from "@repo/shared-utils";

/**
 * Vakıfbank Integration Connector
 *
 * Implements PSD2 Open Banking integration with Türkiye Vakıflar Bankası (VakıfBank).
 *
 * VakıfBank Open Banking API:
 * - Production: https://api.vakifbank.com.tr (requires approval)
 * - Sandbox: https://apitest.vakifbank.com.tr
 *
 * Documentation: https://developer.vakifbank.com.tr
 *
 * Features:
 * - Account Information Service (AIS) for balance and transaction data
 * - Payment Initiation Service (PIS) for payments
 * - Strong Customer Authentication (SCA) via VakıfBank Mobil or SMS
 * - World card integration (shared with Yapı Kredi)
 * - Vakıf Katılım integration
 *
 * Turkish Specifics:
 * - Uses IBAN format: TR + 2 check digits + 5 bank code + 1 reserve + 16 account
 * - Currency: TRY (Turkish Lira)
 * - Bank Code: 00015 (VakıfBank - Turkey's major state-owned bank)
 */
export class VakifbankConnector extends BasePSD2BankConnector {
  protected bankName = "VakıfBank";
  protected baseUrl = "https://api.vakifbank.com.tr/v1";
  protected sandboxUrl = "https://apitest.vakifbank.com.tr/v1";
  protected tokenUrl = "https://api.vakifbank.com.tr/oauth2/token";
  protected authorizeUrl = "https://api.vakifbank.com.tr/oauth2/authorize";

  // Sandbox URLs
  private sandboxTokenUrl = "https://apitest.vakifbank.com.tr/oauth2/token";
  private sandboxAuthorizeUrl = "https://apitest.vakifbank.com.tr/oauth2/authorize";

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
   * Override headers to add VakıfBank-specific headers
   */
  protected override getHeaders(accessToken?: string): Record<string, string> {
    const headers = super.getHeaders(accessToken);

    // VakıfBank specific headers
    headers["X-VKF-Client-Id"] = this.config?.clientId || "";
    headers["X-VKF-Client-Secret"] = this.config?.clientSecret || "";

    // PSU (Payment Service User) headers
    if (this.config?.iban) {
      headers["PSU-ID"] = this.config.iban;
    }

    // VakıfBank uses correlation ID for tracing
    headers["X-VKF-Correlation-Id"] = this.generateRequestId();

    return headers;
  }

  /**
   * Map VakıfBank specific transaction format to normalized format
   */
  protected override mapToNormalizedTransaction(
    txn: PSD2Transaction & VakifbankTransaction,
    accountIdentifier: string
  ): NormalizedBankTransaction {
    // Use base mapping first
    const normalized = super.mapToNormalizedTransaction(txn, accountIdentifier);

    // Apply VakıfBank-specific mappings
    if (txn.islemKodu) {
      normalized.description = this.mapVakifbankTransactionCode(txn.islemKodu, normalized.description);
    }

    // Handle VakıfBank-specific date formats
    if (txn.islemTarihi) {
      normalized.bookingDate = this.parseVakifbankDate(txn.islemTarihi);
    }

    // VakıfBank provides channel info
    if (txn.kanal) {
      normalized.description = `${normalized.description} (${this.mapChannel(txn.kanal)})`;
    }

    return normalized;
  }

  /**
   * Map VakıfBank transaction codes to Turkish descriptions
   */
  private mapVakifbankTransactionCode(code: string, fallback: string): string {
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
      "EMK": "Emekli Maaşı",
      "KRA": "Kira Ödemesi",
      "FTR": "Fatura Ödemesi",
      "ATM": "ATM İşlemi",
      "POS": "POS İşlemi",
      "SWF": "SWIFT Transferi",
      "CEK": "Çek İşlemi",
      "SND": "Senet İşlemi",
      "KRD": "Kredi İşlemi",
      "DVZ": "Döviz İşlemi",
      "ALT": "Altın İşlemi",
      "FST": "FAST Transferi",
      "QRP": "QR Kod Ödemesi",
      "VKM": "VakıfBank Mobil",
      "VKT": "Vakıf Katılım",
    };

    return codeMap[code] || fallback || code;
  }

  /**
   * Map channel codes to descriptions
   */
  private mapChannel(channel: string): string {
    const channelMap: Record<string, string> = {
      "MOBILE": "VakıfBank Mobil",
      "INTERNET": "İnternet Bankacılığı",
      "ATM": "VakıfBank ATM",
      "BRANCH": "Şube",
      "POS": "POS",
      "CALL_CENTER": "Çağrı Merkezi",
      "KATILIM": "Vakıf Katılım",
    };

    return channelMap[channel] || channel;
  }

  /**
   * Parse VakıfBank date format (DD.MM.YYYY HH:mm or YYYY-MM-DD)
   */
  private parseVakifbankDate(dateStr: string): Date {
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
   * Create VakıfBank-specific consent request
   */
  async createVakifbankConsent(config: Record<string, unknown>): Promise<{
    consentId: string;
    authorizationUrl: string;
    status: string;
    scaMethod?: string;
  }> {
    const baseConsent = await this.createConsent(config);

    // Build VakıfBank-specific authorization URL
    const authUrl = new URL(this.getAuthorizeUrl());
    authUrl.searchParams.set("client_id", this.config!.clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", this.config!.redirectUri || "");
    authUrl.searchParams.set("scope", "aisp pisp"); // Both AIS and PIS
    authUrl.searchParams.set("state", baseConsent.consentId);
    authUrl.searchParams.set("consent_id", baseConsent.consentId);

    // VakıfBank supports multiple SCA methods
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
   * Fetch account balances from VakıfBank
   */
  async fetchBalances(accountId: string): Promise<VakifbankBalance[]> {
    if (!this.config?.accessToken) {
      logger.warn("[VakifbankConnector] Access token bulunamadı.");
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
        logger.error(`[VakifbankConnector] Bakiye alınamadı: ${response.status}`);
        return [];
      }

      const data: any = await response.json();
      return data.balances || [];
    } catch (error: unknown) {
      logger.error("[VakifbankConnector] fetchBalances error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Get account details including balance summary
   */
  async getAccountDetails(iban: string): Promise<VakifbankAccountDetails | null> {
    if (!this.config?.accessToken) {
      logger.warn("[VakifbankConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const [accounts, balances] = await Promise.all([
        this.fetchAccounts(),
        this.fetchBalances(iban),
      ]);

      const account = accounts.find((acc) => acc.iban === iban);

      if (!account) {
        logger.warn(`[VakifbankConnector] Hesap bulunamadı: ${iban}`);
        return null;
      }

      return {
        ...account,
        balances,
        bankName: this.bankName,
        bankCode: "00015",
      };
    } catch (error: unknown) {
      logger.error("[VakifbankConnector] getAccountDetails error:", { error: error instanceof Error ? error.message : String(error) });
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
      logger.warn("[VakifbankConnector] Access token bulunamadı.");
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
        logger.error(`[VakifbankConnector] Kart işlemleri alınamadı: ${response.status}`);
        return [];
      }

      const data: any = await response.json();
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
    } catch (error: unknown) {
      logger.error("[VakifbankConnector] fetchWorldCardTransactions error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Fetch World card points
   */
  async fetchWorldPoints(cardNumber: string): Promise<WorldPointsInfo | null> {
    if (!this.config?.accessToken) {
      logger.warn("[VakifbankConnector] Access token bulunamadı.");
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
        logger.error(`[VakifbankConnector] World puanları alınamadı: ${response.status}`);
        return null;
      }

      const data: any = await response.json();
      return data.pointsInfo || null;
    } catch (error: unknown) {
      logger.error("[VakifbankConnector] fetchWorldPoints error:", { error: error instanceof Error ? error.message : String(error) });
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

    const data: any = await response.json();

    return {
      paymentId: data.paymentId,
      status: data.transactionStatus,
      scaRedirectUrl: data._links?.scaRedirect?.href,
    };
  }

  /**
   * Fetch Vakıf Katılım (Islamic banking) accounts
   */
  async fetchKatilimAccounts(): Promise<KatilimAccount[]> {
    if (!this.config?.accessToken) {
      logger.warn("[VakifbankConnector] Access token bulunamadı.");
      return [];
    }

    try {
      const response = await fetch(
        `${this.getApiUrl()}/katilim/accounts`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        logger.error(`[VakifbankConnector] Katılım hesapları alınamadı: ${response.status}`);
        return [];
      }

      const data: any = await response.json();
      return data.accounts || [];
    } catch (error: unknown) {
      logger.error("[VakifbankConnector] fetchKatilimAccounts error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Fetch Katılım profit share (kar payı) details
   */
  async fetchKatilimProfitShare(accountId: string): Promise<KatilimProfitShare | null> {
    if (!this.config?.accessToken) {
      logger.warn("[VakifbankConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const response = await fetch(
        `${this.getApiUrl()}/katilim/accounts/${encodeURIComponent(accountId)}/profit-share`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        logger.error(`[VakifbankConnector] Kar payı bilgisi alınamadı: ${response.status}`);
        return null;
      }

      const data: any = await response.json();
      return data.profitShare || null;
    } catch (error: unknown) {
      logger.error("[VakifbankConnector] fetchKatilimProfitShare error:", { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Fetch pension (emekli) account info
   */
  async fetchPensionAccountInfo(tcKimlikNo: string): Promise<PensionAccountInfo | null> {
    if (!this.config?.accessToken) {
      logger.warn("[VakifbankConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const response = await fetch(
        `${this.getApiUrl()}/pension/account-info`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ tcKimlikNo }),
        }
      );

      if (!response.ok) {
        logger.error(`[VakifbankConnector] Emekli hesap bilgisi alınamadı: ${response.status}`);
        return null;
      }

      const data: any = await response.json();
      return data.pensionInfo || null;
    } catch (error: unknown) {
      logger.error("[VakifbankConnector] fetchPensionAccountInfo error:", { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Fetch gold (altın) account transactions
   */
  async fetchGoldAccountTransactions(
    accountId: string,
    sinceDate: Date,
    untilDate: Date
  ): Promise<GoldTransaction[]> {
    if (!this.config?.accessToken) {
      logger.warn("[VakifbankConnector] Access token bulunamadı.");
      return [];
    }

    try {
      const dateFrom = sinceDate.toISOString().split("T")[0];
      const dateTo = untilDate.toISOString().split("T")[0];

      const response = await fetch(
        `${this.getApiUrl()}/gold/accounts/${encodeURIComponent(accountId)}/transactions?dateFrom=${dateFrom}&dateTo=${dateTo}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        logger.error(`[VakifbankConnector] Altın işlemleri alınamadı: ${response.status}`);
        return [];
      }

      const data: any = await response.json();
      return data.transactions || [];
    } catch (error: unknown) {
      logger.error("[VakifbankConnector] fetchGoldAccountTransactions error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Get current gold prices
   */
  async getGoldPrices(): Promise<GoldPrices | null> {
    if (!this.config?.accessToken) {
      logger.warn("[VakifbankConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const response = await fetch(
        `${this.getApiUrl()}/gold/prices`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        logger.error(`[VakifbankConnector] Altın fiyatları alınamadı: ${response.status}`);
        return null;
      }

      const data: any = await response.json();
      return data.prices || null;
    } catch (error: unknown) {
      logger.error("[VakifbankConnector] getGoldPrices error:", { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }
}

/**
 * VakıfBank specific transaction fields
 */
interface VakifbankTransaction {
  islemKodu?: string;
  islemTarihi?: string;
  kanal?: string;
  subeKodu?: string;
  referansNo?: string;
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
 * Katılım (Islamic banking) account
 */
interface KatilimAccount {
  accountId: string;
  iban: string;
  accountType: "KATILIM_HESABI" | "OZEL_CARI" | "YATIRIM";
  currency: string;
  balance: number;
  availableBalance: number;
  profitShareRate?: number;
}

/**
 * Katılım profit share info
 */
interface KatilimProfitShare {
  accountId: string;
  period: string;
  profitShareRate: number;
  profitAmount: number;
  currency: string;
  paymentDate: string;
}

/**
 * Pension account info
 */
interface PensionAccountInfo {
  tcKimlikNo: string;
  name: string;
  pensionType: string;
  monthlyAmount: number;
  currency: string;
  lastPaymentDate: string;
  nextPaymentDate: string;
  accountIban: string;
}

/**
 * Gold transaction
 */
interface GoldTransaction {
  transactionId: string;
  transactionDate: string;
  transactionType: "BUY" | "SELL" | "TRANSFER_IN" | "TRANSFER_OUT";
  goldType: "GRAM" | "CEYREK" | "YARIM" | "TAM" | "CUMHURIYET";
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
}

/**
 * Gold prices
 */
interface GoldPrices {
  lastUpdate: string;
  gram: { buy: number; sell: number };
  ceyrek: { buy: number; sell: number };
  yarim: { buy: number; sell: number };
  tam: { buy: number; sell: number };
  cumhuriyet: { buy: number; sell: number };
  currency: string;
}

/**
 * VakıfBank balance response
 */
interface VakifbankBalance {
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
 * VakıfBank account details
 */
interface VakifbankAccountDetails {
  resourceId: string;
  iban?: string;
  bban?: string;
  currency: string;
  name?: string;
  product?: string;
  cashAccountType?: string;
  status?: string;
  balances: VakifbankBalance[];
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
