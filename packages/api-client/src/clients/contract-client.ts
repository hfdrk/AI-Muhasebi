const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface ContractAnalysisResult {
  contractId: string;
  documentId: string;
  clientCompanyId: string;
  clientCompanyName: string;
  contractNumber?: string | null;
  expirationDate?: string | null; // ISO string format
  daysUntilExpiration: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  contractValue?: number | null;
  currency?: string | null;
  contractType?: string | null;
  renewalTerms?: string | null;
}

export interface ContractSummary {
  total: number;
  expiringSoon: number;
  expired: number;
  totalValue: number;
}

export interface ContractExpirationCheckResult {
  checked: number;
  expiringSoon: number;
  expired: number;
  alertsCreated: number;
}

async function apiRequest<T>(endpoint: string, options?: RequestInit & { params?: Record<string, string | number | boolean | undefined> }): Promise<T> {
  let url = `${API_URL}${endpoint}`;
  
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

export const contractClient = {
  /**
   * Get all contracts for tenant
   */
  async getContracts(): Promise<{ data: ContractAnalysisResult[] }> {
    return apiRequest<{ data: ContractAnalysisResult[] }>("/api/v1/contracts", {
      method: "GET",
    });
  },

  /**
   * Get contracts expiring within specified days
   */
  async getExpiringContracts(days: number = 90): Promise<{ data: ContractAnalysisResult[] }> {
    return apiRequest<{ data: ContractAnalysisResult[] }>("/api/v1/contracts/expiring", {
      method: "GET",
      params: { days },
    });
  },

  /**
   * Get expired contracts
   */
  async getExpiredContracts(): Promise<{ data: ContractAnalysisResult[] }> {
    return apiRequest<{ data: ContractAnalysisResult[] }>("/api/v1/contracts/expired", {
      method: "GET",
    });
  },

  /**
   * Get contract summary
   */
  async getContractSummary(): Promise<{ data: ContractSummary }> {
    return apiRequest<{ data: ContractSummary }>("/api/v1/contracts/summary", {
      method: "GET",
    });
  },

  /**
   * Manually trigger expiration check
   */
  async checkExpirations(): Promise<{ data: ContractExpirationCheckResult }> {
    return apiRequest<{ data: ContractExpirationCheckResult }>("/api/v1/contracts/check-expirations", {
      method: "POST",
    });
  },
};

