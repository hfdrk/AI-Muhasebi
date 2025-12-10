const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

// Define SAVED_FILTER_TARGETS directly to avoid module resolution issues
export const SAVED_FILTER_TARGETS = {
  CLIENT_COMPANIES: "CLIENT_COMPANIES",
  INVOICES: "INVOICES",
  DOCUMENTS: "DOCUMENTS",
  RISK_ALERTS: "RISK_ALERTS",
  REPORTS: "REPORTS",
} as const;

export interface SavedFilter {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  target: string;
  filters: Record<string, any>;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListSavedFiltersResponse {
  data: SavedFilter[];
}

export interface SavedFilterResponse {
  data: SavedFilter;
}

export interface CreateSavedFilterInput {
  name: string;
  target: string;
  filters: Record<string, any>;
  isDefault?: boolean;
}

export interface UpdateSavedFilterInput {
  name?: string;
  filters?: Record<string, any>;
  isDefault?: boolean;
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

export async function listSavedFilters(target?: string): Promise<ListSavedFiltersResponse> {
  const queryParams = new URLSearchParams();
  if (target) {
    queryParams.append("target", target);
  }

  return apiRequest<ListSavedFiltersResponse>(
    `/api/v1/saved-filters?${queryParams.toString()}`
  );
}

export async function createSavedFilter(
  data: CreateSavedFilterInput
): Promise<SavedFilterResponse> {
  return apiRequest<SavedFilterResponse>("/api/v1/saved-filters", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSavedFilter(
  id: string,
  data: UpdateSavedFilterInput
): Promise<SavedFilterResponse> {
  return apiRequest<SavedFilterResponse>(`/api/v1/saved-filters/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSavedFilter(id: string): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(`/api/v1/saved-filters/${id}`, {
    method: "DELETE",
  });
}

