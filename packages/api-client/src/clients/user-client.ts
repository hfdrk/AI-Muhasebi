const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
    const error = await response.json().catch(() => ({ error: { message: "Bir hata oluştu." } }));
    throw new Error(error.error?.message || "Bir hata oluştu.");
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

