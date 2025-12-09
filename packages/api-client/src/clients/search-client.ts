const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3800";

export interface GlobalSearchResult {
  clients: Array<{
    id: string;
    name: string;
    taxNumber: string;
  }>;
  invoices: Array<{
    id: string;
    externalId: string | null;
    counterpartyName: string | null;
    clientCompanyId: string;
  }>;
  documents: Array<{
    id: string;
    originalFileName: string;
    clientCompanyId: string;
  }>;
  riskAlerts: Array<{
    id: string;
    title: string;
    severity: string;
    clientCompanyId: string | null;
  }>;
  reports: Array<{
    id: string;
    reportCode: string;
    startedAt: Date;
  }>;
}

export interface GlobalSearchResponse {
  data: GlobalSearchResult;
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - clear token and redirect to login
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        if (!window.location.pathname.startsWith("/auth/")) {
          window.location.href = "/auth/login";
        }
      }
    }
    const error = await response.json().catch(() => ({ error: { message: "Bir hata oluştu." } }));
    throw new Error(error.error?.message || "Bir hata oluştu.");
  }

  return response.json();
}

export async function globalSearch(query: string): Promise<GlobalSearchResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append("query", query);

  return apiRequest<GlobalSearchResponse>(
    `/api/v1/search/global?${queryParams.toString()}`
  );
}

