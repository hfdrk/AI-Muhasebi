import { BasePSD2BankConnector, type PSD2Transaction } from "./base-psd2-bank-connector";
import type { NormalizedBankTransaction } from "./types";
import { logger } from "@repo/shared-utils";

/**
 * Garanti BBVA Integration Connector
 *
 * Implements PSD2 Open Banking integration with Garanti BBVA.
 *
 * Garanti BBVA Open Banking API:
 * - Production: https://api.garantibbva.com.tr (requires approval)
 * - Sandbox: https://apitest.garantibbva.com.tr
 *
 * Documentation: https://developers.garantibbva.com.tr
 *
 * Features:
 * - Account Information Service (AIS) for balance and transaction data
 * - Payment Initiation Service (PIS) for payments (separate consent)
 * - Strong Customer Authentication (SCA) via redirect
 *
 * Turkish Specifics:
 * - Uses IBAN format: TR + 2 check digits + 5 bank code + 1 reserve + 16 account
 * - Currency: TRY (Turkish Lira)
 * - Bank Code: 00062 (Garanti BBVA)
 */
export class GarantiConnector extends BasePSD2BankConnector {
  protected bankName = "Garanti BBVA";
  protected baseUrl = "https://api.garantibbva.com.tr/v1";
  protected sandboxUrl = "https://apitest.garantibbva.com.tr/v1";
  protected tokenUrl = "https://api.garantibbva.com.tr/oauth2/token";
  protected authorizeUrl = "https://api.garantibbva.com.tr/oauth2/authorize";

  // Sandbox URLs
  private sandboxTokenUrl = "https://apitest.garantibbva.com.tr/oauth2/token";
  private sandboxAuthorizeUrl = "https://apitest.garantibbva.com.tr/oauth2/authorize";

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
   * Override headers to add Garanti-specific headers
   */
  protected override getHeaders(accessToken?: string): Record<string, string> {
    const headers = super.getHeaders(accessToken);

    // Garanti BBVA specific headers
    headers["X-IBM-Client-Id"] = this.config?.clientId || "";
    headers["X-IBM-Client-Secret"] = this.config?.clientSecret || "";

    // PSU (Payment Service User) headers for consent
    if (this.config?.iban) {
      headers["PSU-ID"] = this.config.iban;
    }

    return headers;
  }

  /**
   * Map Garanti BBVA specific transaction format to normalized format
   */
  protected override mapToNormalizedTransaction(
    txn: PSD2Transaction & GarantiTransaction,
    accountIdentifier: string
  ): NormalizedBankTransaction {
    // Use base mapping first
    const normalized = super.mapToNormalizedTransaction(txn, accountIdentifier);

    // Apply Garanti-specific mappings
    if (txn.garantiTransactionCode) {
      normalized.description = this.mapGarantiTransactionCode(txn.garantiTransactionCode, normalized.description);
    }

    // Handle Garanti-specific date formats if needed
    if (txn.garantiBookingDate) {
      normalized.bookingDate = this.parseGarantiDate(txn.garantiBookingDate);
    }

    return normalized;
  }

  /**
   * Map Garanti transaction codes to Turkish descriptions
   */
  private mapGarantiTransactionCode(code: string, fallback: string): string {
    const codeMap: Record<string, string> = {
      "HAVALE": "Havale",
      "EFT": "EFT Transferi",
      "VIRMAN": "Virman",
      "OTOMATIK_ODEME": "Otomatik Ödeme",
      "KREDI_KARTI": "Kredi Kartı Ödemesi",
      "FAIZ": "Faiz",
      "MASRAF": "Banka Masrafı",
      "VERGI": "Vergi Ödemesi",
      "MAAS": "Maaş",
      "KIRA": "Kira Ödemesi",
      "FATURA": "Fatura Ödemesi",
      "ATM_CEKIMI": "ATM Para Çekimi",
      "ATM_YATIRMA": "ATM Para Yatırma",
      "POS": "POS İşlemi",
      "SWIFT": "SWIFT Transferi",
    };

    return codeMap[code] || fallback || code;
  }

  /**
   * Parse Garanti date format (DD.MM.YYYY or YYYY-MM-DD)
   */
  private parseGarantiDate(dateStr: string): Date {
    // Handle DD.MM.YYYY format
    if (dateStr.includes(".")) {
      const [day, month, year] = dateStr.split(".");
      return new Date(`${year}-${month}-${day}`);
    }
    // Handle standard ISO format
    return new Date(dateStr);
  }

  /**
   * Create Garanti-specific consent request
   */
  async createGarantiConsent(config: Record<string, unknown>): Promise<{
    consentId: string;
    authorizationUrl: string;
    status: string;
  }> {
    const baseConsent = await this.createConsent(config);

    // Build Garanti-specific authorization URL
    const authUrl = new URL(this.getAuthorizeUrl());
    authUrl.searchParams.set("client_id", this.config!.clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", this.config!.redirectUri || "");
    authUrl.searchParams.set("scope", "aisp"); // Account Information Service Provider
    authUrl.searchParams.set("state", baseConsent.consentId);
    authUrl.searchParams.set("consent_id", baseConsent.consentId);

    return {
      consentId: baseConsent.consentId,
      authorizationUrl: authUrl.toString(),
      status: baseConsent.status,
    };
  }

  /**
   * Fetch account balances from Garanti BBVA
   */
  async fetchBalances(accountId: string): Promise<GarantiBalance[]> {
    if (!this.config?.accessToken) {
      logger.warn("[GarantiConnector] Access token bulunamadı.");
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
        logger.error(`[GarantiConnector] Bakiye alınamadı: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.balances || [];
    } catch (error) {
      logger.error("[GarantiConnector] fetchBalances error:", error);
      return [];
    }
  }

  /**
   * Get account details including balance summary
   */
  async getAccountDetails(iban: string): Promise<GarantiAccountDetails | null> {
    if (!this.config?.accessToken) {
      logger.warn("[GarantiConnector] Access token bulunamadı.");
      return null;
    }

    try {
      const [accounts, balances] = await Promise.all([
        this.fetchAccounts(),
        this.fetchBalances(iban),
      ]);

      const account = accounts.find((acc) => acc.iban === iban);

      if (!account) {
        logger.warn(`[GarantiConnector] Hesap bulunamadı: ${iban}`);
        return null;
      }

      return {
        ...account,
        balances,
        bankName: this.bankName,
        bankCode: "00062",
      };
    } catch (error) {
      logger.error("[GarantiConnector] getAccountDetails error:", error);
      return null;
    }
  }
}

/**
 * Garanti BBVA specific transaction fields
 */
interface GarantiTransaction {
  garantiTransactionCode?: string;
  garantiBookingDate?: string;
  garantiReference?: string;
  branch?: string;
  channel?: string;
}

/**
 * Garanti BBVA balance response
 */
interface GarantiBalance {
  balanceType: string;
  balanceAmount: {
    amount: string;
    currency: string;
  };
  referenceDate?: string;
  creditLimitIncluded?: boolean;
}

/**
 * Garanti BBVA account details
 */
interface GarantiAccountDetails {
  resourceId: string;
  iban?: string;
  bban?: string;
  currency: string;
  name?: string;
  product?: string;
  cashAccountType?: string;
  status?: string;
  balances: GarantiBalance[];
  bankName: string;
  bankCode: string;
}
