const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3800";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  taxNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  // Legacy field for backward compatibility
  fullName?: string;
}

export interface InviteUserInput {
  email: string;
  role: "TenantOwner" | "Accountant" | "Staff" | "ReadOnly";
  name?: string;
}

export interface ChangeRoleInput {
  role: "TenantOwner" | "Accountant" | "Staff" | "ReadOnly";
}

export interface UpdateStatusInput {
  status: "active" | "suspended";
}

export interface UpdateUserInput {
  role?: "TenantOwner" | "Accountant" | "Staff" | "ReadOnly";
  status?: "active" | "suspended";
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
    
    let errorMessage = "Bir hata oluştu.";
    try {
      const error = await response.json();
      errorMessage = error.error?.message || error.message || errorMessage;
    } catch {
      // If response is not JSON, try to get text
      try {
        const text = await response.text();
        if (text) errorMessage = text;
      } catch {
        // Fallback to status text
        errorMessage = response.statusText || `HTTP ${response.status} hatası`;
      }
    }
    
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

export async function getTenant(tenantId: string): Promise<{ data: Tenant }> {
  return apiRequest<{ data: Tenant }>(`/api/v1/tenants/${tenantId}`);
}

export async function updateTenant(
  tenantId: string,
  data: Partial<Tenant>
): Promise<{ data: Tenant }> {
  return apiRequest<{ data: Tenant }>(`/api/v1/tenants/${tenantId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function listTenantUsers(tenantId: string): Promise<{ data: TenantUser[] }> {
  return apiRequest<{ data: TenantUser[] }>(`/api/v1/tenants/${tenantId}/users`);
}

export async function inviteUser(
  tenantId: string,
  input: InviteUserInput
): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(`/api/v1/tenants/${tenantId}/users/invite`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function changeUserRole(
  tenantId: string,
  userId: string,
  input: ChangeRoleInput
): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(
    `/api/v1/tenants/${tenantId}/users/${userId}/role`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

export async function updateUserStatus(
  tenantId: string,
  userId: string,
  input: UpdateStatusInput
): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(
    `/api/v1/tenants/${tenantId}/users/${userId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

export async function updateUser(
  tenantId: string,
  userId: string,
  input: UpdateUserInput
): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(
    `/api/v1/tenants/${tenantId}/users/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

