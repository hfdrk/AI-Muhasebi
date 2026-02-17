import type {
  BankIntegrationConnector,
  NormalizedBankTransaction,
  FetchTransactionsOptions,
  PushTransactionInput,
} from "./types";
import { logger } from "@repo/shared-utils";
import { getCircuitBreaker } from "../../lib/circuit-breaker";

/**
 * PSD2 Open Banking Configuration
 */
export interface PSD2Config {
  // OAuth2 / Authorization
  clientId: string;
  clientSecret: string;
  redirectUri?: string;

  // Bank-specific
  bankCode?: string;
  aspspId?: string; // Account Servicing Payment Service Provider ID

  // Account identifiers
  iban?: string;
  accountNumber?: string;

  // Consent
  consentId?: string;
  consentExpiresAt?: Date;

  // Tokens
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;

  // Environment
  sandbox?: boolean;
  apiVersion?: string;
}

/**
 * PSD2 Standard Account Information
 */
export interface PSD2Account {
  resourceId: string;
  iban?: string;
  bban?: string;
  currency: string;
  name?: string;
  product?: string;
  cashAccountType?: string;
  status?: string;
  balances?: PSD2Balance[];
}

/**
 * PSD2 Standard Balance
 */
export interface PSD2Balance {
  balanceType: "closingBooked" | "expected" | "openingBooked" | "interimAvailable" | "forwardAvailable";
  balanceAmount: {
    amount: string;
    currency: string;
  };
  referenceDate?: string;
}

/**
 * PSD2 Standard Transaction
 */
export interface PSD2Transaction {
  transactionId?: string;
  entryReference?: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount: {
    amount: string;
    currency: string;
  };
  creditorName?: string;
  creditorAccount?: {
    iban?: string;
  };
  debtorName?: string;
  debtorAccount?: {
    iban?: string;
  };
  remittanceInformationUnstructured?: string;
  remittanceInformationStructured?: string;
  bankTransactionCode?: string;
  proprietaryBankTransactionCode?: string;
  balanceAfterTransaction?: PSD2Balance;
}

/**
 * PSD2 Consent Response
 */
export interface PSD2ConsentResponse {
  consentId: string;
  consentStatus: "received" | "valid" | "rejected" | "expired" | "terminatedByTpp" | "revokedByPsu";
  _links?: {
    scaRedirect?: { href: string };
    scaOAuth?: { href: string };
    status?: { href: string };
  };
}

/**
 * Base PSD2 Open Banking Connector
 *
 * Implements the PSD2 (Payment Services Directive 2) standard for Open Banking.
 * This is a base class that can be extended for specific Turkish banks.
 *
 * PSD2 Flow:
 * 1. Create consent request
 * 2. Redirect user to bank for authorization (SCA - Strong Customer Authentication)
 * 3. Exchange authorization code for access token
 * 4. Use access token to fetch account information and transactions
 *
 * References:
 * - Berlin Group NextGenPSD2: https://www.berlin-group.org/nextgenpsd2-downloads
 * - Turkish TCMB Open Banking: https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/banka+hakkinda/duyurular/2020/an-2020-006
 */
export abstract class BasePSD2BankConnector implements BankIntegrationConnector {
  protected abstract bankName: string;
  protected abstract baseUrl: string;
  protected abstract sandboxUrl: string;
  protected abstract tokenUrl: string;
  protected abstract authorizeUrl: string;

  protected config: PSD2Config | null = null;

  /**
   * Get the API base URL based on environment
   */
  protected getApiUrl(): string {
    return this.config?.sandbox ? this.sandboxUrl : this.baseUrl;
  }

  /**
   * Standard HTTP headers for PSD2 API calls
   */
  protected getHeaders(accessToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Request-ID": this.generateRequestId(),
    };

    if (accessToken || this.config?.accessToken) {
      headers["Authorization"] = `Bearer ${accessToken || this.config?.accessToken}`;
    }

    if (this.config?.consentId) {
      headers["Consent-ID"] = this.config.consentId;
    }

    return headers;
  }

  /**
   * Generate unique request ID for tracing
   */
  protected generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get a circuit breaker instance for this bank
   */
  protected getCircuitBreakerInstance() {
    return getCircuitBreaker(`bank:${this.bankName}`, {
      failureThreshold: 5,
      resetTimeout: 60000,
    });
  }

  /**
   * Fetch with circuit breaker protection
   */
  protected protectedFetch(url: string, init?: RequestInit): Promise<Response> {
    return this.getCircuitBreakerInstance().execute(() => fetch(url, init));
  }

  /**
   * Parse and validate configuration
   */
  protected parseConfig(config: Record<string, unknown>): PSD2Config {
    const clientId = config.clientId as string | undefined;
    const clientSecret = config.clientSecret as string | undefined;

    if (!clientId || typeof clientId !== "string" || clientId.trim().length === 0) {
      throw new Error(`${this.bankName} client ID gerekli.`);
    }

    if (!clientSecret || typeof clientSecret !== "string" || clientSecret.trim().length === 0) {
      throw new Error(`${this.bankName} client secret gerekli.`);
    }

    return {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      redirectUri: config.redirectUri as string | undefined,
      bankCode: config.bankCode as string | undefined,
      aspspId: config.aspspId as string | undefined,
      iban: config.iban as string | undefined,
      accountNumber: config.accountNumber as string | undefined,
      consentId: config.consentId as string | undefined,
      consentExpiresAt: config.consentExpiresAt ? new Date(config.consentExpiresAt as string) : undefined,
      accessToken: config.accessToken as string | undefined,
      refreshToken: config.refreshToken as string | undefined,
      tokenExpiresAt: config.tokenExpiresAt ? new Date(config.tokenExpiresAt as string) : undefined,
      sandbox: config.sandbox as boolean | undefined ?? process.env.NODE_ENV !== "production",
      apiVersion: config.apiVersion as string | undefined ?? "v1",
    };
  }

  /**
   * Test connection to the bank API
   */
  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    try {
      this.config = this.parseConfig(config);

      // If we have a valid access token, verify it
      if (this.config.accessToken && this.config.tokenExpiresAt) {
        if (new Date() < this.config.tokenExpiresAt) {
          // Token is still valid, try to fetch accounts
          const accounts = await this.fetchAccounts();
          if (accounts.length > 0) {
            return {
              success: true,
              message: `${this.bankName} bağlantısı başarılı. ${accounts.length} hesap bulundu.`
            };
          }
        } else if (this.config.refreshToken) {
          // Token expired, try to refresh
          await this.refreshAccessToken();
          return {
            success: true,
            message: `${this.bankName} bağlantısı başarılı (token yenilendi).`
          };
        }
      }

      // If we have a consent ID, check consent status
      if (this.config.consentId) {
        const consentStatus = await this.getConsentStatus(this.config.consentId);
        if (consentStatus === "valid") {
          return {
            success: true,
            message: `${this.bankName} bağlantısı başarılı. Onay geçerli.`
          };
        } else {
          return {
            success: false,
            message: `${this.bankName} onay durumu: ${consentStatus}. Yeniden yetkilendirme gerekli.`
          };
        }
      }

      // No token or consent, return info about authorization flow
      return {
        success: true,
        message: `${this.bankName} yapılandırması geçerli. Hesap erişimi için yetkilendirme gerekli.`
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      logger.error(`[${this.bankName}] testConnection error:`, { error: error instanceof Error ? error.message : String(error) });
      return { success: false, message: `${this.bankName} bağlantı hatası: ${errorMessage}` };
    }
  }

  /**
   * Create a consent request for account access
   * Returns the consent ID and authorization URL for user redirect
   */
  async createConsent(config: Record<string, unknown>): Promise<{
    consentId: string;
    authorizationUrl?: string;
    status: string;
  }> {
    this.config = this.parseConfig(config);

    const consentRequest = {
      access: {
        accounts: this.config.iban ? [{ iban: this.config.iban }] : [],
        balances: this.config.iban ? [{ iban: this.config.iban }] : [],
        transactions: this.config.iban ? [{ iban: this.config.iban }] : [],
      },
      recurringIndicator: true,
      validUntil: this.getConsentValidUntil(),
      frequencyPerDay: 4,
      combinedServiceIndicator: false,
    };

    const response = await this.protectedFetch(`${this.getApiUrl()}/consents`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(consentRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Onay oluşturma hatası: ${response.status} - ${errorText}`);
    }

    const consentResponse: PSD2ConsentResponse = await response.json() as PSD2ConsentResponse;

    let authorizationUrl: string | undefined;
    if (consentResponse._links?.scaRedirect?.href) {
      authorizationUrl = consentResponse._links.scaRedirect.href;
    } else if (consentResponse._links?.scaOAuth?.href) {
      authorizationUrl = consentResponse._links.scaOAuth.href;
    }

    return {
      consentId: consentResponse.consentId,
      authorizationUrl,
      status: consentResponse.consentStatus,
    };
  }

  /**
   * Get consent validity date (90 days from now per PSD2)
   */
  protected getConsentValidUntil(): string {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 90);
    return validUntil.toISOString().split("T")[0];
  }

  /**
   * Get consent status
   */
  async getConsentStatus(consentId: string): Promise<string> {
    const response = await this.protectedFetch(`${this.getApiUrl()}/consents/${consentId}/status`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Onay durumu sorgulanamadı: ${response.status}`);
    }

    const data: any = await response.json();
    return data.consentStatus;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeAuthorizationCode(authorizationCode: string, config: Record<string, unknown>): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }> {
    this.config = this.parseConfig(config);

    const tokenRequest = new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri || "",
    });

    const response = await this.protectedFetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenRequest.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token alınamadı: ${response.status} - ${errorText}`);
    }

    const tokenResponse: any = await response.json();

    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in || 3600,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.config?.refreshToken) {
      throw new Error("Refresh token bulunamadı.");
    }

    const tokenRequest = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.config.refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await this.protectedFetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenRequest.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token yenilenemedi: ${response.status}`);
    }

    const tokenResponse: any = await response.json();

    this.config.accessToken = tokenResponse.access_token;
    if (tokenResponse.refresh_token) {
      this.config.refreshToken = tokenResponse.refresh_token;
    }
    this.config.tokenExpiresAt = new Date(Date.now() + (tokenResponse.expires_in || 3600) * 1000);
  }

  /**
   * Fetch available accounts
   */
  async fetchAccounts(): Promise<PSD2Account[]> {
    if (!this.config?.accessToken) {
      throw new Error("Access token bulunamadı. Önce yetkilendirme yapın.");
    }

    const response = await this.protectedFetch(`${this.getApiUrl()}/accounts`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Hesaplar alınamadı: ${response.status}`);
    }

    const data: any = await response.json();
    return data.accounts || [];
  }

  /**
   * Fetch bank transactions
   */
  async fetchTransactions(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchTransactionsOptions
  ): Promise<NormalizedBankTransaction[]> {
    if (!this.config?.accessToken) {
      logger.warn(`[${this.bankName}] Access token bulunamadı. Yetkilendirme gerekli.`);
      return [];
    }

    const accountId = options?.accountIdentifier || this.config.iban || this.config.accountNumber;

    if (!accountId) {
      logger.warn(`[${this.bankName}] Hesap tanımlayıcı bulunamadı.`);
      return [];
    }

    try {
      const dateFrom = sinceDate.toISOString().split("T")[0];
      const dateTo = untilDate.toISOString().split("T")[0];

      // PSD2 standard endpoint for transactions
      const url = new URL(`${this.getApiUrl()}/accounts/${encodeURIComponent(accountId)}/transactions`);
      url.searchParams.set("dateFrom", dateFrom);
      url.searchParams.set("dateTo", dateTo);
      url.searchParams.set("bookingStatus", "both"); // booked and pending

      const response = await this.protectedFetch(url.toString(), {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[${this.bankName}] İşlemler alınamadı: ${response.status} - ${errorText}`);
        return [];
      }

      const data: any = await response.json();
      const transactions: PSD2Transaction[] = [
        ...(data.transactions?.booked || []),
        ...(data.transactions?.pending || []),
      ];

      // Map PSD2 transactions to normalized format
      return transactions.map((txn) => this.mapToNormalizedTransaction(txn, accountId));

    } catch (error: unknown) {
      logger.error(`[${this.bankName}] fetchTransactions error:`, { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Map PSD2 transaction to normalized format
   */
  protected mapToNormalizedTransaction(
    txn: PSD2Transaction,
    accountIdentifier: string
  ): NormalizedBankTransaction {
    const amount = parseFloat(txn.transactionAmount.amount);

    return {
      externalId: txn.transactionId || txn.entryReference || `${txn.bookingDate}-${Math.random().toString(36).substring(7)}`,
      accountIdentifier,
      bookingDate: txn.bookingDate ? new Date(txn.bookingDate) : new Date(),
      valueDate: txn.valueDate ? new Date(txn.valueDate) : null,
      description: txn.remittanceInformationUnstructured ||
                   txn.remittanceInformationStructured ||
                   txn.creditorName ||
                   txn.debtorName ||
                   "İşlem",
      amount, // PSD2 uses signed amounts (positive = credit, negative = debit)
      currency: txn.transactionAmount.currency || "TRY",
      balanceAfter: txn.balanceAfterTransaction
        ? parseFloat(txn.balanceAfterTransaction.balanceAmount.amount)
        : null,
    };
  }

  /**
   * Push transactions - Not typically supported in PSD2 AIS (Account Information Service)
   * This would require PIS (Payment Initiation Service) which is a separate consent
   */
  async pushTransactions(
    transactions: PushTransactionInput[],
    _config: Record<string, unknown>
  ): Promise<Array<{ success: boolean; externalId?: string; message?: string }>> {
    logger.warn(
      `[${this.bankName}] pushTransactions() - PSD2 AIS does not support pushing transactions. ` +
      "Use Payment Initiation Service (PIS) for payment creation."
    );

    return transactions.map(() => ({
      success: false,
      message: "PSD2 Account Information Service (AIS) üzerinden işlem gönderimi desteklenmiyor. Ödeme başlatma için PIS kullanın.",
    }));
  }
}
