import { getAccessToken, setAccessToken, clearAccessToken } from "./token-store";

// Use relative path with Next.js proxy, or fallback to env var for production
// Note: Client functions already include /api/v1/... so base should be empty or just /
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

/** Read the __csrf cookie value (set by the backend on every response). */
function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)__csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Methods that require a CSRF token header. */
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Prevent concurrent refresh attempts
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data?.data?.accessToken) {
      setAccessToken(data.data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit & { params?: Record<string, string | number | undefined>; responseType?: "json" | "blob"; _isRetry?: boolean }
): Promise<T> {
  let url = `${API_URL}${endpoint}`;

  // Handle query parameters
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

  const { params, responseType, _isRetry, ...fetchOptions } = options || {};

  // Get authentication token from in-memory store
  const token = getAccessToken();

  // Attach CSRF token for mutation requests
  const method = (fetchOptions?.method || "GET").toUpperCase();
  const csrfToken = MUTATION_METHODS.has(method) ? getCsrfToken() : undefined;

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(csrfToken && { "X-CSRF-Token": csrfToken }),
      ...fetchOptions?.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - attempt silent refresh before giving up
    if (response.status === 401 && !_isRetry && typeof window !== "undefined") {
      // Deduplicate concurrent refresh attempts
      if (!refreshPromise) {
        refreshPromise = attemptTokenRefresh().finally(() => { refreshPromise = null; });
      }
      const refreshed = await refreshPromise;
      if (refreshed) {
        // Retry the original request with the new token
        return apiRequest<T>(endpoint, { ...options, _isRetry: true } as any);
      }

      // Refresh failed — clear token and redirect
      clearAccessToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/")) {
        window.location.href = "/auth/login";
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
      // If response is not JSON, use status text
      errorMessage = response.statusText || `HTTP ${response.status} hatası`;
    }

    // Create error with status code attached for React Query to detect
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusCode = response.status;
    (error as any).response = { status: response.status };
    throw error;
  }

  // Check if response should be returned as blob
  if (responseType === "blob") {
    return response.blob() as unknown as T;
  }

  return response.json();
}

export const apiClient = {
  async get<T>(endpoint: string, options?: { 
    params?: Record<string, string | number | undefined>;
    responseType?: "json" | "blob";
  }): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, method: "GET" });
  },

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async patch<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return apiRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, method: "DELETE" });
  },
};

