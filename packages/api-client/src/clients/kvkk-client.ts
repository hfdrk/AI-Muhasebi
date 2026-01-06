const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface Consent {
  consentId: string;
  userId: string;
  consentType: "data_processing" | "marketing" | "analytics" | "third_party";
  granted: boolean;
  recordedAt: string;
}

export interface ConsentStatus {
  userId: string;
  consents: {
    data_processing: boolean;
    marketing: boolean;
    analytics: boolean;
    third_party: boolean;
  };
}

export interface DataAccessRequest {
  id: string;
  requestId?: string; // For backward compatibility
  userId: string;
  status: "pending" | "processing" | "completed" | "rejected";
  requestedAt: string;
  completedAt?: string | null;
  data?: Record<string, unknown>;
  rejectionReason?: string;
}

export interface DataDeletionRequest {
  id: string;
  requestId?: string; // For backward compatibility
  userId: string;
  status: "pending" | "processing" | "completed" | "rejected";
  requestedAt: string;
  completedAt?: string | null;
  rejectionReason?: string;
}

export interface DataBreach {
  id: string;
  breachId?: string; // For backward compatibility
  tenantId: string;
  recordedAt?: string; // For backward compatibility
  detectedAt: string;
  reportedAt?: string | null;
  severity: "low" | "medium" | "high" | "critical";
  affectedUsers: number;
  description: string;
  status?: "detected" | "investigating" | "contained" | "resolved" | "reported";
}

export interface DataRetention {
  userId: string;
  retentionPeriod: number;
  expiresAt: string;
}

export interface DataAccessAuditLog {
  logId: string;
  userId: string;
  action: string;
  timestamp: string;
  details?: Record<string, unknown>;
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

export const kvkkClient = {
  /**
   * Record consent
   */
  async recordConsent(
    userId: string,
    consentType: "data_processing" | "marketing" | "analytics" | "third_party",
    granted: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ data: Consent }> {
    return apiRequest<{ data: Consent }>("/api/v1/kvkk/consent", {
      method: "POST",
      body: JSON.stringify({
        userId,
        consentType,
        granted,
        ipAddress,
        userAgent,
      }),
    });
  },

  /**
   * Get consent status
   */
  async getConsentStatus(userId: string): Promise<{ data: ConsentStatus }> {
    return apiRequest<{ data: ConsentStatus }>(`/api/v1/kvkk/consent/${userId}`);
  },

  /**
   * Request data access
   */
  async requestDataAccess(userId: string): Promise<{ data: DataAccessRequest }> {
    return apiRequest<{ data: DataAccessRequest }>(`/api/v1/kvkk/data-access/${userId}`, {
      method: "POST",
    });
  },

  /**
   * Request data deletion
   */
  async requestDataDeletion(userId: string): Promise<{ data: DataDeletionRequest }> {
    return apiRequest<{ data: DataDeletionRequest }>(`/api/v1/kvkk/data-deletion/${userId}`, {
      method: "POST",
    });
  },

  /**
   * Record data breach
   */
  async recordBreach(
    description: string,
    affectedUsers: number,
    severity: "low" | "medium" | "high" | "critical"
  ): Promise<{ data: DataBreach }> {
    return apiRequest<{ data: DataBreach }>("/api/v1/kvkk/breach", {
      method: "POST",
      body: JSON.stringify({
        description,
        affectedUsers,
        severity,
      }),
    });
  },

  /**
   * Check data retention
   */
  async checkDataRetention(userId: string): Promise<{ data: DataRetention }> {
    return apiRequest<{ data: DataRetention }>(`/api/v1/kvkk/retention/${userId}`);
  },

  /**
   * Get data access audit log
   */
  async getDataAccessAuditLog(userId?: string): Promise<{ data: DataAccessAuditLog[] }> {
    return apiRequest<{ data: DataAccessAuditLog[] }>("/api/v1/kvkk/audit-log", {
      params: userId ? { userId } : undefined,
    });
  },

  /**
   * List data access requests
   */
  async listDataAccessRequests(): Promise<{ data: DataAccessRequest[] }> {
    return apiRequest<{ data: DataAccessRequest[] }>("/api/v1/kvkk/data-access");
  },

  /**
   * List data deletion requests
   */
  async listDataDeletionRequests(): Promise<{ data: DataDeletionRequest[] }> {
    return apiRequest<{ data: DataDeletionRequest[] }>("/api/v1/kvkk/data-deletion");
  },

  /**
   * List breaches
   */
  async listBreaches(): Promise<{ data: DataBreach[] }> {
    return apiRequest<{ data: DataBreach[] }>("/api/v1/kvkk/breach");
  },
};

