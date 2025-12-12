const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface VATAnalysis {
  totalVAT: number;
  inputVAT: number;
  outputVAT: number;
  netVAT: number;
  inconsistencies: Array<{
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
  }>;
}

export interface VATInconsistency {
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
  invoiceId?: string;
  invoiceNumber?: string;
}

export interface VATReturn {
  period: string;
  inputVAT: number;
  outputVAT: number;
  netVAT: number;
  returnData: Record<string, unknown>;
}

export interface TaxCompliance {
  isCompliant: boolean;
  issues: Array<{
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
  }>;
  deadlines: Array<{
    type: string;
    dueDate: string;
    description: string;
  }>;
}

export interface VATDeclaration {
  declaration: Record<string, unknown>;
  period: string;
  generatedAt: string;
}

export interface CorporateTaxReport {
  year: number;
  taxableIncome: number;
  taxAmount: number;
  report: Record<string, unknown>;
}

export interface WithholdingTaxReport {
  withholdingTax: number;
  report: Record<string, unknown>;
}

export interface MonthlyTaxSummary {
  year: number;
  month: number;
  summary: Record<string, unknown>;
}

export interface TMSComplianceValidation {
  isCompliant: boolean;
  violations: Array<{
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
  }>;
  recommendations: Array<{
    type: string;
    description: string;
    priority: "low" | "medium" | "high";
  }>;
}

export interface TMSBalanceSheet {
  asOfDate: string;
  assets: Record<string, unknown>;
  liabilities: Record<string, unknown>;
  equity: Record<string, unknown>;
}

export interface TMSIncomeStatement {
  revenue: number;
  expenses: number;
  netIncome: number;
  statement: Record<string, unknown>;
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit & { params?: Record<string, string | number | boolean | undefined> }
): Promise<T> {
  // If API_URL is empty, use Next.js rewrite proxy (relative path)
  // Otherwise use the full API URL
  let url = API_URL ? `${API_URL}${endpoint}` : endpoint;
  
  if (options?.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const { params, ...fetchOptions } = options || {};

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...fetchOptions?.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        if (!window.location.pathname.startsWith("/auth/")) {
          window.location.href = "/auth/login";
        }
      }
    }
    
    let errorMessage = "Bir hata oluştu.";
    try {
      const error = await response.json();
      errorMessage = error.error?.message || error.message || errorMessage;
    } catch {
      errorMessage = response.statusText || `HTTP ${response.status} hatası`;
    }
    
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

export const taxClient = {
  /**
   * Analyze VAT for a period
   */
  async analyzeVAT(
    clientCompanyId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: VATAnalysis }> {
    return apiRequest<{ data: VATAnalysis }>("/api/v1/tax/vat/analyze", {
      method: "POST",
      body: JSON.stringify({ clientCompanyId, startDate, endDate }),
    });
  },

  /**
   * Check VAT inconsistencies
   */
  async checkVATInconsistencies(
    clientCompanyId: string
  ): Promise<{ data: { inconsistencies: VATInconsistency[] } }> {
    return apiRequest<{ data: { inconsistencies: VATInconsistency[] } }>(
      `/api/v1/tax/vat/inconsistencies/${clientCompanyId}`
    );
  },

  /**
   * Prepare VAT return
   */
  async prepareVATReturn(
    clientCompanyId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: VATReturn }> {
    return apiRequest<{ data: VATReturn }>("/api/v1/tax/vat/prepare-return", {
      method: "POST",
      body: JSON.stringify({ clientCompanyId, startDate, endDate }),
    });
  },

  /**
   * Check tax compliance
   */
  async checkCompliance(clientCompanyId: string): Promise<{ data: TaxCompliance }> {
    return apiRequest<{ data: TaxCompliance }>(`/api/v1/tax/compliance/${clientCompanyId}`);
  },

  /**
   * Generate VAT declaration
   */
  async generateVATDeclaration(
    clientCompanyId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: VATDeclaration }> {
    return apiRequest<{ data: VATDeclaration }>("/api/v1/tax/reports/vat-declaration", {
      method: "POST",
      body: JSON.stringify({ clientCompanyId, startDate, endDate }),
    });
  },

  /**
   * Generate corporate tax report
   */
  async generateCorporateTaxReport(
    clientCompanyId: string,
    year: number
  ): Promise<{ data: CorporateTaxReport }> {
    return apiRequest<{ data: CorporateTaxReport }>(
      `/api/v1/tax/reports/corporate-tax/${clientCompanyId}/${year}`
    );
  },

  /**
   * Generate withholding tax report
   */
  async generateWithholdingTaxReport(
    clientCompanyId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: WithholdingTaxReport }> {
    return apiRequest<{ data: WithholdingTaxReport }>("/api/v1/tax/reports/withholding-tax", {
      method: "POST",
      body: JSON.stringify({ clientCompanyId, startDate, endDate }),
    });
  },

  /**
   * Generate monthly tax summary
   */
  async generateMonthlyTaxSummary(
    clientCompanyId: string,
    year: number,
    month: number
  ): Promise<{ data: MonthlyTaxSummary }> {
    return apiRequest<{ data: MonthlyTaxSummary }>(
      `/api/v1/tax/reports/monthly-summary/${clientCompanyId}/${year}/${month}`
    );
  },

  /**
   * Validate TMS compliance
   */
  async validateTMSCompliance(
    clientCompanyId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: TMSComplianceValidation }> {
    return apiRequest<{ data: TMSComplianceValidation }>("/api/v1/tax/tms/validate", {
      method: "POST",
      body: JSON.stringify({ clientCompanyId, startDate, endDate }),
    });
  },

  /**
   * Generate TMS balance sheet
   */
  async generateTMSBalanceSheet(
    clientCompanyId: string,
    asOfDate?: string
  ): Promise<{ data: TMSBalanceSheet }> {
    return apiRequest<{ data: TMSBalanceSheet }>(
      `/api/v1/tax/tms/balance-sheet/${clientCompanyId}`,
      {
        params: asOfDate ? { asOfDate } : undefined,
      }
    );
  },

  /**
   * Generate TMS income statement
   */
  async generateTMSIncomeStatement(
    clientCompanyId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: TMSIncomeStatement }> {
    return apiRequest<{ data: TMSIncomeStatement }>("/api/v1/tax/tms/income-statement", {
      method: "POST",
      body: JSON.stringify({ clientCompanyId, startDate, endDate }),
    });
  },
};

