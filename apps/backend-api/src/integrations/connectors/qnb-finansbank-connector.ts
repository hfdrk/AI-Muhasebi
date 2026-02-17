import { BasePSD2BankConnector, type PSD2Transaction } from "./base-psd2-bank-connector";
import type { NormalizedBankTransaction } from "./types";
import { logger } from "@repo/shared-utils";

/**
 * QNB Finansbank Integration Connector
 *
 * Implements PSD2 Open Banking integration with QNB Finansbank.
 *
 * QNB Finansbank Open Banking API:
 * - Production: https://api.qnbfinansbank.com (requires approval)
 * - Sandbox: https://apitest.qnbfinansbank.com
 *
 * Documentation: https://developer.qnbfinansbank.com
 *
 * Features:
 * - Account Information Service (AIS) for balance and transaction data
 * - Payment Initiation Service (PIS) for payments
 * - Strong Customer Authentication (SCA) via Finansbank Mobil or SMS
 * - CardFinans credit card integration
 *
 * Turkish Specifics:
 * - Uses IBAN format: TR + 2 check digits + 5 bank code + 1 reserve + 16 account
 * - Currency: TRY (Turkish Lira)
 * - Bank Code: 00111 (QNB Finansbank)
 */
export class QNBFinansbankConnector extends BasePSD2BankConnector {
  protected bankName = "QNB Finansbank";
  protected baseUrl = "https://api.qnbfinansbank.com/v1";
  protected sandboxUrl = "https://apitest.qnbfinansbank.com/v1";
  protected tokenUrl = "https://api.qnbfinansbank.com/oauth2/token";
  protected authorizeUrl = "https://api.qnbfinansbank.com/oauth2/authorize";

  // Sandbox URLs
  private sandboxTokenUrl = "https://apitest.qnbfinansbank.com/oauth2/token";
  private sandboxAuthorizeUrl = "https://apitest.qnbfinansbank.com/oauth2/authorize";

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
   * Override headers to add QNB Finansbank-specific headers
   */
  protected override getHeaders(accessToken?: string): Record<string, string> {
    const headers = super.getHeaders(accessToken);

    // QNB Finansbank specific headers
    headers["X-QNB-Client-Id"] = this.config?.clientId || "";
    headers["X-QNB-Client-Secret"] = this.config?.clientSecret || "";

    // PSU (Payment Service User) headers
    if (this.config?.iban) {
      headers["PSU-ID"] = this.config.iban;
    }

    // QNB uses transaction ID for tracing
    headers["X-QNB-Transaction-Id"] = this.generateRequestId();

    return headers;
  }

  /**
   * Map QNB Finansbank specific transaction format to normalized format
   */
  protected override mapToNormalizedTransaction(
    txn: PSD2Transaction & QNBTransaction,
    accountIdentifier: string
  ): NormalizedBankTransaction {
    // Use base mapping first
    const normalized = super.mapToNormalizedTransaction(txn, accountIdentifier);

    // Apply QNB-specific mappings
    if (txn.transactionType) {
      normalized.description = this.mapQNBTransactionType(txn.transactionType, normalized.description);
    }

    // Handle QNB-specific date formats
    if (txn.processingDate) {
      normalized.bookingDate = this.parseQNBDate(txn.processingDate);
    }

    // QNB provides channel info
    if (txn.channel) {
      normalized.description = `${normalized.description} (${this.mapChannel(txn.channel)})`;
    }

    return normalized;
  }

  /**
   * Map QNB transaction types to Turkish descriptions
   */
  private mapQNBTransactionType(type: string, fallback: string): string {
    const typeMap: Record<string, string> = {
      "TRANSFER_IN": "Gelen Transfer",
      "TRANSFER_OUT": "Giden Transfer",
      "HAVALE": "Havale",
      "EFT": "EFT Transferi",
      "VIRMAN": "Virman",
      "AUTO_PAYMENT": "Otomatik Ödeme",
      "CARD_PAYMENT": "Kart Ödemesi",
      "CARDFINANS": "CardFinans İşlemi",
      "INTEREST": "Faiz Geliri",
      "FEE": "Banka Masrafı",
      "TAX": "Vergi Ödemesi",
      "SALARY": "Maaş Ödemesi",
      "RENT": "Kira Ödemesi",
      "BILL": "Fatura Ödemesi",
      "ATM_WITHDRAWAL": "ATM Para Çekme",
      "ATM_DEPOSIT": "ATM Para Yatırma",
      "POS": "POS İşlemi",
      "SWIFT": "SWIFT Transferi",
      "CHECK": "Çek İşlemi",
      "BOND": "Senet İşlemi",
      "LOAN": "Kredi İşlemi",
      "FX": "Döviz İşlemi",
      "FAST": "FAST Transferi",
      "QR_PAYMENT": "QR Kod Ödemesi",
      "ENPARA": "Enpara İşlemi",
    };

    return typeMap[type] || fallback || type;
  }

  /**
   * Map channel codes to descriptions
   */
  private mapChannel(channel: string): string {
    const channelMap: Record<string, string> = {
      "MOBILE": "Finansbank Mobil",
      "INTERNET": "İnternet Bankacılığı",
      "ATM": "ATM",
      "BRANCH": "Şube",
      "POS": "POS",
      "CALL_CENTER": "Çağrı Merkezi",
      "ENPARA": "Enpara",
    };

    return channelMap[channel] || channel;
  }

  /**
   * Parse QNB date format (DD.MM.YYYY HH:mm or YYYY-MM-DD)
   */
  private parseQNBDate(dateStr: string): Date {
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
   * Create QNB Finansbank-specific consent request
   */
  async createQNBConsent(config: Record<string, unknown>): Promise<{
    consentId: string;
    authorizationUrl: string;
    status: string;
    scaMethod?: string;
  }> {
    const baseConsent = await this.createConsent(config);

    // Build QNB-specific authorization URL
    const authUrl = new URL(this.getAuthorizeUrl());
    authUrl.searchParams.set("client_id", this.config!.clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", this.config!.redirectUri || "");
    authUrl.searchParams.set("scope", "aisp pisp"); // Both AIS and PIS
    authUrl.searchParams.set("state", baseConsent.consentId);
    authUrl.searchParams.set("consent_id", baseConsent.consentId);

    // QNB supports multiple SCA methods
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
   * Fetch account balances from QNB Finansbank
   */
  async fetchBalances(accountId: string): Promise<QNBBalance[]> {
    if (!this.config?.accessToken) {
      logger.warn("[QNBFinansbankConnector] Access token bulunamadı.");
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
        logger.error(`[QNBFinansbankConnector] Bakiye alınamadı: ${response.status}`);
        return [];
      }

      const data: any = await response.json();
      return data.balances || [];
    } catch (error: unknown) {
      logger.error("[QNBFinansbankConnector] fetchBalances error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Get account details including balance summary
   */
  async getAccountDetails(iban: string): Promise<QNBAccountDetails | null> {
    if (!this.config?.accessToken) {
      logger.warn("[QNBFinansbankConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const [accounts, balances] = await Promise.all([
        this.fetchAccounts(),
        this.fetchBalances(iban),
      ]);

      const account = accounts.find((acc) => acc.iban === iban);

      if (!account) {
        logger.warn(`[QNBFinansbankConnector] Hesap bulunamadı: ${iban}`);
        return null;
      }

      return {
        ...account,
        balances,
        bankName: this.bankName,
        bankCode: "00111",
      };
    } catch (error: unknown) {
      logger.error("[QNBFinansbankConnector] getAccountDetails error:", { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Fetch CardFinans card transactions
   */
  async fetchCardFinansTransactions(
    cardNumber: string,
    sinceDate: Date,
    untilDate: Date
  ): Promise<NormalizedBankTransaction[]> {
    if (!this.config?.accessToken) {
      logger.warn("[QNBFinansbankConnector] Access token bulunamadı.");
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
        logger.error(`[QNBFinansbankConnector] Kart işlemleri alınamadı: ${response.status}`);
        return [];
      }

      const data: any = await response.json();
      const transactions: CardFinansTransaction[] = data.transactions || [];

      return transactions.map((txn) => ({
        externalId: txn.transactionId || `${txn.transactionDate}-${Math.random().toString(36).substring(7)}`,
        accountIdentifier: cardNumber,
        bookingDate: new Date(txn.transactionDate),
        valueDate: txn.postingDate ? new Date(txn.postingDate) : null,
        description: `${txn.merchantName || "CardFinans İşlemi"} - ${txn.merchantCategory || ""}`.trim(),
        amount: -Math.abs(parseFloat(txn.amount)),
        currency: txn.currency || "TRY",
        balanceAfter: null,
      }));
    } catch (error: unknown) {
      logger.error("[QNBFinansbankConnector] fetchCardFinansTransactions error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Fetch CardFinans bonus miles
   */
  async fetchBonusMiles(cardNumber: string): Promise<BonusMilesInfo | null> {
    if (!this.config?.accessToken) {
      logger.warn("[QNBFinansbankConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const response = await fetch(
        `${this.getApiUrl()}/cards/${encodeURIComponent(cardNumber)}/bonus-miles`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        logger.error(`[QNBFinansbankConnector] Bonus mil bilgisi alınamadı: ${response.status}`);
        return null;
      }

      const data: any = await response.json();
      return data.milesInfo || null;
    } catch (error: unknown) {
      logger.error("[QNBFinansbankConnector] fetchBonusMiles error:", { error: error instanceof Error ? error.message : String(error) });
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
   * Initiate Enpara transfer (QNB's digital bank)
   */
  async initiateEnparaTransfer(payment: EnparaTransferRequest): Promise<EnparaTransferResponse> {
    if (!this.config?.accessToken) {
      throw new Error("Access token bulunamadı. Önce yetkilendirme yapın.");
    }

    const response = await fetch(`${this.getApiUrl()}/payments/enpara`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        debtorAccount: { iban: payment.fromIban },
        creditorAccount: payment.toIban ? { iban: payment.toIban } : undefined,
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
      throw new Error(`Enpara transfer başlatılamadı: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();

    return {
      paymentId: data.paymentId,
      status: data.transactionStatus,
      scaRedirectUrl: data._links?.scaRedirect?.href,
    };
  }

  /**
   * Fetch Enpara account info (QNB's digital banking platform)
   */
  async fetchEnparaAccounts(): Promise<EnparaAccount[]> {
    if (!this.config?.accessToken) {
      logger.warn("[QNBFinansbankConnector] Access token bulunamadı.");
      return [];
    }

    try {
      const response = await fetch(
        `${this.getApiUrl()}/enpara/accounts`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        logger.error(`[QNBFinansbankConnector] Enpara hesapları alınamadı: ${response.status}`);
        return [];
      }

      const data: any = await response.json();
      return data.accounts || [];
    } catch (error: unknown) {
      logger.error("[QNBFinansbankConnector] fetchEnparaAccounts error:", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Request CardFinans statement
   */
  async requestCardFinansStatement(
    cardNumber: string,
    month: number,
    year: number
  ): Promise<CardFinansStatement | null> {
    if (!this.config?.accessToken) {
      logger.warn("[QNBFinansbankConnector] Access token bulunamadı.");
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
        logger.error(`[QNBFinansbankConnector] Ekstre alınamadı: ${response.status}`);
        return null;
      }

      const data: any = await response.json();
      return data.statement || null;
    } catch (error: unknown) {
      logger.error("[QNBFinansbankConnector] requestCardFinansStatement error:", { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }
}

/**
 * QNB specific transaction fields
 */
interface QNBTransaction {
  transactionType?: string;
  processingDate?: string;
  channel?: string;
  branchCode?: string;
  referenceNumber?: string;
}

/**
 * CardFinans transaction
 */
interface CardFinansTransaction {
  transactionId?: string;
  transactionDate: string;
  postingDate?: string;
  amount: string;
  currency?: string;
  merchantName?: string;
  merchantCategory?: string;
  merchantCountry?: string;
  installmentCount?: number;
  bonusMiles?: number;
}

/**
 * Bonus miles info
 */
interface BonusMilesInfo {
  totalMiles: number;
  availableMiles: number;
  pendingMiles: number;
  expiringMiles?: number;
  expiringDate?: string;
  milesValue?: number; // TRY value of miles
}

/**
 * CardFinans statement
 */
interface CardFinansStatement {
  statementDate: string;
  dueDate: string;
  minimumPayment: number;
  totalAmount: number;
  previousBalance: number;
  payments: number;
  newCharges: number;
  currency: string;
  transactions: CardFinansTransaction[];
}

/**
 * Enpara account
 */
interface EnparaAccount {
  accountId: string;
  iban: string;
  accountType: string;
  currency: string;
  balance: number;
  availableBalance: number;
  interestRate?: number;
}

/**
 * QNB balance response
 */
interface QNBBalance {
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
 * QNB account details
 */
interface QNBAccountDetails {
  resourceId: string;
  iban?: string;
  bban?: string;
  currency: string;
  name?: string;
  product?: string;
  cashAccountType?: string;
  status?: string;
  balances: QNBBalance[];
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
 * Enpara transfer request
 */
interface EnparaTransferRequest {
  fromIban: string;
  toIban?: string;
  toPhoneNumber?: string;
  amount: number;
  currency?: string;
  description?: string;
}

/**
 * Enpara transfer response
 */
interface EnparaTransferResponse {
  paymentId: string;
  status: string;
  scaRedirectUrl?: string;
}
