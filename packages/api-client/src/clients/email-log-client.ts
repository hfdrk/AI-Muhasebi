const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface EmailLog {
  id: string;
  tenantId: string | null;
  to: string[];
  subject: string;
  status: "sent" | "delivered" | "bounced" | "failed";
  messageId: string | null;
  error: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailAnalytics {
  total: number;
  sent: number;
  delivered: number;
  bounced: number;
  failed: number;
  deliveryRate: number;
  bounceRate: number;
  failureRate: number;
  openedCount: number;
  clickedCount: number;
  openRate: number;
  clickRate: number;
}

export interface ListEmailLogsParams {
  status?: "sent" | "delivered" | "bounced" | "failed";
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface ListEmailLogsResponse {
  data: EmailLog[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
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

export const emailLogClient = {
  /**
   * List email logs with filters
   */
  async getEmailLogs(params?: ListEmailLogsParams): Promise<ListEmailLogsResponse> {
    return apiRequest<ListEmailLogsResponse>("/api/v1/email-logs", {
      method: "GET",
      params: params ? {
        status: params.status,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        limit: params.limit,
        offset: params.offset,
      } : undefined,
    });
  },

  /**
   * Get email analytics
   */
  async getEmailAnalytics(params?: { dateFrom?: string; dateTo?: string }): Promise<{ data: EmailAnalytics }> {
    return apiRequest<{ data: EmailAnalytics }>("/api/v1/email-logs/analytics", {
      method: "GET",
      params: params ? {
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      } : undefined,
    });
  },

  /**
   * Get single email log by ID
   */
  async getEmailLog(emailLogId: string): Promise<{ data: EmailLog }> {
    return apiRequest<{ data: EmailLog }>(`/api/v1/email-logs/${emailLogId}`, {
      method: "GET",
    });
  },
};

