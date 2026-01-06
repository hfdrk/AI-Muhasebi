import type {
  AccountingIntegrationConnector,
  NormalizedInvoice,
  NormalizedInvoiceLine,
  FetchInvoicesOptions,
  PushInvoiceInput,
} from "./types";
import { logger } from "@repo/shared-utils";

/**
 * REST Accounting Connector Configuration
 */
export interface RESTAccountingConfig {
  // Authentication
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;

  // Company/Tenant
  companyId?: string;
  firmNumber?: string;
  branchCode?: string;

  // API Configuration
  baseUrl: string;
  apiVersion?: string;

  // Environment
  environment?: "production" | "test" | "demo";

  // Custom headers
  customHeaders?: Record<string, string>;

  // Pagination settings
  pageSize?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Generic API Response
 */
export interface GenericAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

/**
 * Field Mapping Configuration
 * Maps external API fields to internal normalized fields
 */
export interface FieldMapping {
  // Invoice fields
  externalId: string;
  invoiceNumber?: string;
  issueDate: string;
  dueDate?: string;
  totalAmount: string;
  netAmount?: string;
  taxAmount: string;
  currency?: string;
  status?: string;
  type?: string;

  // Customer/Counterparty fields
  customerName?: string;
  customerTaxNumber?: string;
  counterpartyName?: string;
  counterpartyTaxNumber?: string;

  // Line item fields
  lines?: string;
  lineFields?: {
    lineNumber?: string;
    description: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    vatRate?: string;
    vatAmount?: string;
  };
}

/**
 * Base REST Accounting Connector
 *
 * A flexible base class for integrating with various accounting software
 * using REST APIs. Can be configured with custom field mappings.
 *
 * Features:
 * - Configurable API endpoints
 * - Flexible field mapping
 * - Multiple authentication methods (API Key, Basic Auth, OAuth2)
 * - Automatic pagination handling
 * - Retry logic with exponential backoff
 * - Request/Response logging
 */
export abstract class BaseRESTAccountingConnector implements AccountingIntegrationConnector {
  protected abstract connectorName: string;
  protected abstract defaultBaseUrl: string;
  protected abstract fieldMapping: FieldMapping;

  protected config: RESTAccountingConfig | null = null;
  protected accessToken: string | null = null;
  protected tokenExpiresAt: Date | null = null;

  /**
   * Get the configured API base URL
   */
  protected getBaseUrl(): string {
    return this.config?.baseUrl || this.defaultBaseUrl;
  }

  /**
   * Get API URL with version
   */
  protected getApiUrl(endpoint: string): string {
    const base = this.getBaseUrl();
    const version = this.config?.apiVersion ? `/${this.config.apiVersion}` : "";
    return `${base}${version}${endpoint}`;
  }

  /**
   * Get request headers
   */
  protected async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    // Add authentication header
    const authHeader = await this.getAuthHeader();
    if (authHeader) {
      Object.assign(headers, authHeader);
    }

    // Add custom headers
    if (this.config?.customHeaders) {
      Object.assign(headers, this.config.customHeaders);
    }

    // Add company/tenant headers if configured
    if (this.config?.companyId) {
      headers["X-Company-Id"] = this.config.companyId;
    }
    if (this.config?.firmNumber) {
      headers["X-Firm-Number"] = this.config.firmNumber;
    }
    if (this.config?.branchCode) {
      headers["X-Branch-Code"] = this.config.branchCode;
    }

    return headers;
  }

  /**
   * Get authentication header - can be overridden for different auth methods
   */
  protected async getAuthHeader(): Promise<Record<string, string> | null> {
    // API Key authentication
    if (this.config?.apiKey) {
      if (this.config.apiSecret) {
        // API Key + Secret (Basic auth style)
        const credentials = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString("base64");
        return { "Authorization": `Basic ${credentials}` };
      }
      // API Key only
      return { "X-API-Key": this.config.apiKey };
    }

    // Username/Password (Basic auth)
    if (this.config?.username && this.config?.password) {
      const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64");
      return { "Authorization": `Basic ${credentials}` };
    }

    // OAuth2 token
    if (this.accessToken) {
      return { "Authorization": `Bearer ${this.accessToken}` };
    }

    return null;
  }

  /**
   * Parse and validate configuration
   */
  protected parseConfig(config: Record<string, unknown>): RESTAccountingConfig {
    const baseUrl = config.baseUrl as string | undefined;

    if (!baseUrl && !this.defaultBaseUrl) {
      throw new Error(`${this.connectorName} API URL gerekli.`);
    }

    return {
      apiKey: config.apiKey as string | undefined,
      apiSecret: config.apiSecret as string | undefined,
      username: config.username as string | undefined,
      password: config.password as string | undefined,
      companyId: config.companyId as string | undefined,
      firmNumber: config.firmNumber as string | undefined,
      branchCode: config.branchCode as string | undefined,
      baseUrl: baseUrl || this.defaultBaseUrl,
      apiVersion: config.apiVersion as string | undefined,
      environment: (config.environment as "production" | "test" | "demo") ||
                   (process.env.NODE_ENV === "production" ? "production" : "test"),
      customHeaders: config.customHeaders as Record<string, string> | undefined,
      pageSize: config.pageSize as number | undefined || 100,
      maxRetries: config.maxRetries as number | undefined || 3,
      retryDelayMs: config.retryDelayMs as number | undefined || 1000,
    };
  }

  /**
   * Test connection to the accounting system
   */
  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    try {
      this.config = this.parseConfig(config);

      // Verify authentication
      const isAuthenticated = await this.verifyAuthentication();

      if (isAuthenticated) {
        return {
          success: true,
          message: `${this.connectorName} bağlantısı başarılı.`
        };
      }

      return {
        success: false,
        message: `${this.connectorName} kimlik doğrulama başarısız.`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      logger.error(`[${this.connectorName}] testConnection error:`, error);
      return { success: false, message: `${this.connectorName} bağlantı hatası: ${errorMessage}` };
    }
  }

  /**
   * Verify authentication - can be overridden
   */
  protected async verifyAuthentication(): Promise<boolean> {
    try {
      // Default implementation: try to fetch a small list of invoices
      const response = await this.makeRequest<GenericAPIResponse<unknown>>(
        "GET",
        this.getInvoicesEndpoint(),
        { limit: 1 }
      );
      return response.success !== false;
    } catch {
      return false;
    }
  }

  /**
   * Get invoices endpoint - must be implemented
   */
  protected abstract getInvoicesEndpoint(): string;

  /**
   * Make HTTP request with retry logic
   */
  protected async makeRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    params?: Record<string, unknown>,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = new URL(this.getApiUrl(endpoint));

    // Add query parameters for GET requests
    if (method === "GET" && params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const maxRetries = this.config?.maxRetries || 3;
    const retryDelay = this.config?.retryDelayMs || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const headers = await this.getHeaders();

        const requestOptions: RequestInit = {
          method,
          headers,
        };

        if (body && (method === "POST" || method === "PUT")) {
          requestOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url.toString(), requestOptions);

        // Log request for debugging
        logger.debug(`[${this.connectorName}] ${method} ${url.toString()} - ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();

          // Don't retry on 4xx errors (except 429)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`API hatası: ${response.status} - ${errorText}`);
          }

          // Retry on 5xx or 429
          if (attempt < maxRetries) {
            const delay = response.status === 429
              ? parseInt(response.headers.get("Retry-After") || String(retryDelay * attempt))
              : retryDelay * attempt;
            await this.sleep(delay);
            continue;
          }

          throw new Error(`API hatası: ${response.status} - ${errorText}`);
        }

        return await response.json() as T;

      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        await this.sleep(retryDelay * attempt);
      }
    }

    throw new Error("Maksimum deneme sayısına ulaşıldı.");
  }

  /**
   * Sleep helper
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch invoices from the accounting system
   */
  async fetchInvoices(
    sinceDate: Date,
    untilDate: Date,
    options?: FetchInvoicesOptions
  ): Promise<NormalizedInvoice[]> {
    if (!this.config) {
      logger.warn(`[${this.connectorName}] Config bulunamadı.`);
      return [];
    }

    try {
      const allInvoices: NormalizedInvoice[] = [];
      let page = 1;
      const pageSize = this.config.pageSize || 100;
      let hasMore = true;

      while (hasMore) {
        const params = this.buildFetchParams(sinceDate, untilDate, page, pageSize, options);
        const response = await this.makeRequest<GenericAPIResponse<unknown[]>>(
          "GET",
          this.getInvoicesEndpoint(),
          params
        );

        const invoices = this.extractInvoices(response);

        if (invoices.length === 0) {
          hasMore = false;
        } else {
          const normalized = invoices.map(inv => this.mapToNormalizedInvoice(inv));
          allInvoices.push(...normalized);

          // Check if we've reached the end
          if (response.pagination) {
            hasMore = page < response.pagination.totalPages;
          } else {
            hasMore = invoices.length >= pageSize;
          }

          // Respect limit option
          if (options?.limit && allInvoices.length >= options.limit) {
            hasMore = false;
          }

          page++;
        }
      }

      // Apply limit if specified
      if (options?.limit && allInvoices.length > options.limit) {
        return allInvoices.slice(0, options.limit);
      }

      return allInvoices;

    } catch (error) {
      logger.error(`[${this.connectorName}] fetchInvoices error:`, error);
      return [];
    }
  }

  /**
   * Build fetch parameters - can be overridden
   */
  protected buildFetchParams(
    sinceDate: Date,
    untilDate: Date,
    page: number,
    pageSize: number,
    options?: FetchInvoicesOptions
  ): Record<string, unknown> {
    return {
      startDate: sinceDate.toISOString().split("T")[0],
      endDate: untilDate.toISOString().split("T")[0],
      page,
      pageSize,
      ...options,
    };
  }

  /**
   * Extract invoices from response - can be overridden
   */
  protected extractInvoices(response: GenericAPIResponse<unknown[]>): Record<string, unknown>[] {
    if (Array.isArray(response.data)) {
      return response.data as Record<string, unknown>[];
    }
    if (Array.isArray(response)) {
      return response as unknown as Record<string, unknown>[];
    }
    return [];
  }

  /**
   * Map external invoice to normalized format
   */
  protected mapToNormalizedInvoice(inv: Record<string, unknown>): NormalizedInvoice {
    const fm = this.fieldMapping;

    // Get nested value helper
    const getValue = (path: string): unknown => {
      return path.split(".").reduce((obj, key) => {
        return obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined;
      }, inv as unknown);
    };

    // Parse lines
    const rawLines = fm.lines ? getValue(fm.lines) as unknown[] : [];
    const lines: NormalizedInvoiceLine[] = Array.isArray(rawLines)
      ? rawLines.map((line, index) => this.mapToNormalizedLine(line as Record<string, unknown>, index))
      : [];

    // Determine invoice type
    let type: "SATIŞ" | "ALIŞ" | undefined;
    if (fm.type) {
      const typeValue = String(getValue(fm.type) || "").toLowerCase();
      if (["sales", "satis", "satış", "out", "outgoing"].includes(typeValue)) {
        type = "SATIŞ";
      } else if (["purchase", "alis", "alış", "in", "incoming"].includes(typeValue)) {
        type = "ALIŞ";
      }
    }

    return {
      externalId: String(getValue(fm.externalId) || ""),
      clientCompanyName: fm.customerName ? String(getValue(fm.customerName) || "") : undefined,
      clientCompanyTaxNumber: fm.customerTaxNumber ? String(getValue(fm.customerTaxNumber) || "") : undefined,
      issueDate: new Date(String(getValue(fm.issueDate))),
      dueDate: fm.dueDate && getValue(fm.dueDate) ? new Date(String(getValue(fm.dueDate))) : null,
      totalAmount: parseFloat(String(getValue(fm.totalAmount) || 0)),
      currency: fm.currency ? String(getValue(fm.currency) || "TRY") : "TRY",
      taxAmount: parseFloat(String(getValue(fm.taxAmount) || 0)),
      netAmount: fm.netAmount ? parseFloat(String(getValue(fm.netAmount) || 0)) : undefined,
      counterpartyName: fm.counterpartyName ? String(getValue(fm.counterpartyName) || "") : undefined,
      counterpartyTaxNumber: fm.counterpartyTaxNumber ? String(getValue(fm.counterpartyTaxNumber) || "") : undefined,
      status: fm.status ? this.mapStatus(String(getValue(fm.status) || "")) : undefined,
      type,
      lines,
    };
  }

  /**
   * Map external line item to normalized format
   */
  protected mapToNormalizedLine(
    line: Record<string, unknown>,
    index: number
  ): NormalizedInvoiceLine {
    const lf = this.fieldMapping.lineFields;

    if (!lf) {
      return {
        lineNumber: index + 1,
        description: String(line.description || line.name || ""),
        quantity: parseFloat(String(line.quantity || 1)),
        unitPrice: parseFloat(String(line.unitPrice || 0)),
        lineTotal: parseFloat(String(line.lineTotal || line.amount || 0)),
        vatRate: parseFloat(String(line.vatRate || 0.18)),
        vatAmount: parseFloat(String(line.vatAmount || 0)),
      };
    }

    // Get nested value helper
    const getValue = (path: string): unknown => {
      return path.split(".").reduce((obj, key) => {
        return obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined;
      }, line as unknown);
    };

    return {
      lineNumber: lf.lineNumber ? parseInt(String(getValue(lf.lineNumber) || index + 1)) : index + 1,
      description: String(getValue(lf.description) || ""),
      quantity: parseFloat(String(getValue(lf.quantity) || 1)),
      unitPrice: parseFloat(String(getValue(lf.unitPrice) || 0)),
      lineTotal: parseFloat(String(getValue(lf.lineTotal) || 0)),
      vatRate: lf.vatRate ? parseFloat(String(getValue(lf.vatRate) || 0.18)) : 0.18,
      vatAmount: lf.vatAmount ? parseFloat(String(getValue(lf.vatAmount) || 0)) : 0,
    };
  }

  /**
   * Map external status to internal status - can be overridden
   */
  protected mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      // English
      "draft": "taslak",
      "issued": "kesildi",
      "sent": "gönderildi",
      "paid": "ödendi",
      "cancelled": "iptal",
      "overdue": "gecikmiş",
      // Turkish
      "taslak": "taslak",
      "kesildi": "kesildi",
      "gonderildi": "gönderildi",
      "odendi": "ödendi",
      "iptal": "iptal",
      "gecikmis": "gecikmiş",
    };

    return statusMap[status.toLowerCase()] || status.toLowerCase();
  }

  /**
   * Push invoices to the accounting system
   */
  async pushInvoices(
    invoices: PushInvoiceInput[],
    config: Record<string, unknown>
  ): Promise<Array<{ success: boolean; externalId?: string; message?: string }>> {
    this.config = this.parseConfig(config);

    const results: Array<{ success: boolean; externalId?: string; message?: string }> = [];

    for (const invoice of invoices) {
      try {
        // Convert to external format
        const externalInvoice = this.mapToExternalInvoice(invoice);

        // Send to API
        const response = await this.makeRequest<GenericAPIResponse<{ id?: string; invoiceId?: string }>>(
          "POST",
          this.getInvoicesEndpoint(),
          undefined,
          externalInvoice
        );

        if (response.success === false || response.error) {
          results.push({
            success: false,
            message: response.error?.message || "Fatura gönderimi başarısız.",
          });
        } else {
          results.push({
            success: true,
            externalId: response.data?.id || response.data?.invoiceId || invoice.externalId,
            message: "Fatura başarıyla gönderildi.",
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
   * Map normalized invoice to external format - can be overridden
   */
  protected mapToExternalInvoice(invoice: PushInvoiceInput): Record<string, unknown> {
    return {
      invoiceNumber: invoice.externalId,
      issueDate: invoice.issueDate.toISOString().split("T")[0],
      dueDate: invoice.dueDate?.toISOString().split("T")[0],
      totalAmount: invoice.totalAmount,
      taxAmount: invoice.taxAmount,
      netAmount: invoice.netAmount,
      currency: invoice.currency,
      customerName: invoice.clientCompanyName || invoice.counterpartyName,
      customerTaxNumber: invoice.clientCompanyTaxNumber || invoice.counterpartyTaxNumber,
      type: invoice.type,
      lines: invoice.lines.map((line, index) => ({
        lineNumber: line.lineNumber || index + 1,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        vatRate: line.vatRate,
        vatAmount: line.vatAmount,
      })),
    };
  }
}
