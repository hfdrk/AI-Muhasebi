import { getAccessToken } from "../token-store";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface CurrentUserResponse {
  data: {
    user: {
      id: string;
      email: string;
      fullName: string;
      locale: string;
      isActive: boolean;
      lastLoginAt: Date | null;
    };
    tenants: Array<{
      id: string;
      name: string;
      slug: string;
      role: string;
      status: string;
    }>;
  };
}

export interface SwitchTenantInput {
  tenantId: string;
}

export interface SwitchTenantResponse {
  data: {
    accessToken: string;
    tenantId: string;
  };
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getAccessToken();

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

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiRequest<CurrentUserResponse>("/api/v1/users/me");
}

export async function switchTenant(input: SwitchTenantInput): Promise<SwitchTenantResponse> {
  const response = await apiRequest<SwitchTenantResponse>("/api/v1/users/switch-tenant", {
    method: "POST",
    body: JSON.stringify(input),
  });

  // Update stored token
  if (typeof window !== "undefined") {
    localStorage.setItem("accessToken", response.data.accessToken);
  }

  return response;
}

