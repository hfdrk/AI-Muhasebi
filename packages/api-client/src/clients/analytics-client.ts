import { getAccessToken } from "../token-store";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface FinancialTrend {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  invoiceCount: number;
  averageInvoiceValue: number;
}

export interface RiskTrend {
  period: string;
  averageRiskScore: number;
  highRiskClientCount: number;
  criticalAlertsCount: number;
  riskScoreChange: number;
}

export interface ClientPortfolioAnalytics {
  totalClients: number;
  activeClients: number;
  highRiskClients: number;
  mediumRiskClients: number;
  lowRiskClients: number;
  totalRevenue: number;
  averageRevenuePerClient: number;
  topClients: Array<{
    clientId: string;
    clientName: string;
    revenue: number;
    riskScore: number;
  }>;
}

export interface RevenueForecast {
  period: string;
  forecastedRevenue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  factors: Array<{
    factor: string;
    impact: number;
  }>;
}

export interface ExpenseForecast {
  period: string;
  forecastedExpenses: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  categories: Array<{
    category: string;
    amount: number;
  }>;
}

export interface AnalyticsDashboard {
  financial: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    revenueGrowth: number;
    expenseGrowth: number;
  };
  risk: {
    averageRiskScore: number;
    highRiskClientCount: number;
    criticalAlertsCount: number;
    riskTrend: "increasing" | "decreasing" | "stable";
  };
  portfolio: {
    totalClients: number;
    activeClients: number;
    newClients: number;
    churnedClients: number;
  };
  forecasts: {
    nextMonthRevenue: number;
    nextMonthExpenses: number;
    nextQuarterRevenue: number;
    nextQuarterExpenses: number;
  };
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

  const token = getAccessToken();

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
    (error as any).statusCode = response.status;
    (error as any).response = { status: response.status };
    throw error;
  }

  return response.json();
}

export const analyticsClient = {
  /**
   * Get financial trends
   */
  async getFinancialTrends(
    startDate: string,
    endDate: string,
    granularity: "daily" | "weekly" | "monthly" | "quarterly" = "monthly"
  ): Promise<{ data: FinancialTrend[] }> {
    return apiRequest<{ data: FinancialTrend[] }>("/api/v1/analytics/financial-trends", {
      params: { startDate, endDate, granularity },
    });
  },

  /**
   * Get risk trends
   */
  async getRiskTrends(
    startDate: string,
    endDate: string,
    granularity: "daily" | "weekly" | "monthly" = "monthly"
  ): Promise<{ data: RiskTrend[] }> {
    return apiRequest<{ data: RiskTrend[] }>("/api/v1/analytics/risk-trends", {
      params: { startDate, endDate, granularity },
    });
  },

  /**
   * Get client portfolio analytics
   */
  async getClientPortfolioAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<{ data: ClientPortfolioAnalytics }> {
    return apiRequest<{ data: ClientPortfolioAnalytics }>("/api/v1/analytics/portfolio", {
      params: { startDate, endDate },
    });
  },

  /**
   * Get revenue forecast
   */
  async getRevenueForecast(
    months: number = 6,
    startDate?: string
  ): Promise<{ data: RevenueForecast[] }> {
    return apiRequest<{ data: RevenueForecast[] }>("/api/v1/analytics/revenue-forecast", {
      params: { months, startDate },
    });
  },

  /**
   * Get expense forecast
   */
  async getExpenseForecast(
    months: number = 6,
    startDate?: string
  ): Promise<{ data: ExpenseForecast[] }> {
    return apiRequest<{ data: ExpenseForecast[] }>("/api/v1/analytics/expense-forecast", {
      params: { months, startDate },
    });
  },

  /**
   * Get comprehensive analytics dashboard
   */
  async getAnalyticsDashboard(
    startDate: string,
    endDate: string
  ): Promise<{ data: AnalyticsDashboard }> {
    return apiRequest<{ data: AnalyticsDashboard }>("/api/v1/analytics/dashboard", {
      params: { startDate, endDate },
    });
  },
};

