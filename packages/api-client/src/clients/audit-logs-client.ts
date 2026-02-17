import { getAccessToken } from "../token-store";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface AuditLogEntry {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListAuditLogsParams {
  userId?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedAuditLogsResponse {
  data: AuditLogEntry[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit & { params?: Record<string, string | number | undefined> }
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
      const rawMessage = error?.error?.message || error?.message;
      if (typeof rawMessage === "string") {
        errorMessage = rawMessage;
      }
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

export async function listAuditLogs(
  params?: ListAuditLogsParams
): Promise<PaginatedAuditLogsResponse> {
  return apiRequest<PaginatedAuditLogsResponse>("/api/v1/audit-logs", {
    method: "GET",
    params: params as Record<string, string | number | undefined>,
  });
}



