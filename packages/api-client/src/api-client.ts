// Use relative path with Next.js proxy, or fallback to env var for production
// Note: Client functions already include /api/v1/... so base should be empty or just /
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit & { params?: Record<string, string | number | undefined> }
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

  const { params, ...fetchOptions } = options || {};

  // Get authentication token from localStorage
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
    // Handle 401 Unauthorized - clear token and redirect to login
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        // Only redirect if we're not already on an auth page
        if (!window.location.pathname.startsWith("/auth/")) {
          window.location.href = "/auth/login";
        }
      }
    }
    const error = await response.json().catch(() => ({ error: { message: "Bir hata oluştu." } }));
    throw new Error(error.error?.message || "Şu anda servise ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
  }

  // Check if response should be returned as blob
  if (options?.responseType === "blob") {
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

