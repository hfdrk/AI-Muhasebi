const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: "btree" | "gin" | "gist" | "hash";
  reason: string;
  estimatedImpact: "low" | "medium" | "high";
}

export interface CreateIndexResult {
  created: number;
  skipped: number;
  errors: string[];
}

export interface ConnectionPoolStats {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  maxConnections: number;
}

export interface TableSize {
  table: string;
  size: string;
  rows: number;
  indexSize: string;
}

export interface VacuumResult {
  vacuumed: string[];
  errors: string[];
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit & { params?: Record<string, string | number | boolean | undefined> }
): Promise<T> {
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

export const dbOptimizationClient = {
  /**
   * Get index recommendations
   */
  async getIndexRecommendations(): Promise<{ data: IndexRecommendation[] }> {
    return apiRequest<{ data: IndexRecommendation[] }>(
      "/api/v1/db-optimization/indexes/recommendations"
    );
  },

  /**
   * Create recommended indexes
   */
  async createRecommendedIndexes(): Promise<{ data: CreateIndexResult }> {
    return apiRequest<{ data: CreateIndexResult }>(
      "/api/v1/db-optimization/indexes/create",
      {
        method: "POST",
      }
    );
  },

  /**
   * Get connection pool stats
   */
  async getConnectionPoolStats(): Promise<{ data: ConnectionPoolStats }> {
    return apiRequest<{ data: ConnectionPoolStats }>(
      "/api/v1/db-optimization/connection-pool/stats"
    );
  },

  /**
   * Analyze table sizes
   */
  async analyzeTableSizes(): Promise<{ data: TableSize[] }> {
    return apiRequest<{ data: TableSize[] }>("/api/v1/db-optimization/tables/sizes");
  },

  /**
   * Vacuum tables
   */
  async vacuumTables(tableNames?: string[]): Promise<{ data: VacuumResult }> {
    return apiRequest<{ data: VacuumResult }>("/api/v1/db-optimization/tables/vacuum", {
      method: "POST",
      body: JSON.stringify({ tableNames }),
    });
  },
};

