const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3800";

export interface IntegrationProvider {
  id: string;
  type: "accounting" | "bank";
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  configSchema: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantIntegration {
  id: string;
  tenantId: string;
  clientCompanyId: string | null;
  providerId: string;
  status: "disconnected" | "connected" | "error";
  displayName: string;
  config: Record<string, unknown>;
  lastSyncAt: Date | null;
  lastSyncStatus: "success" | "error" | "in_progress" | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationSyncJob {
  id: string;
  tenantId: string;
  clientCompanyId: string | null;
  tenantIntegrationId: string;
  jobType: "pull_invoices" | "pull_bank_transactions";
  status: "pending" | "in_progress" | "success" | "failed";
  startedAt: Date | null;
  finishedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationSyncLog {
  id: string;
  tenantId: string;
  tenantIntegrationId: string;
  level: "info" | "warning" | "error";
  message: string;
  context: Record<string, unknown> | null;
  createdAt: Date;
}

export interface PaginatedResponse<T> {
  data: {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
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

export async function listProviders(
  type?: "accounting" | "bank"
): Promise<{ data: IntegrationProvider[] }> {
  const queryParams = new URLSearchParams();
  if (type) {
    queryParams.append("type", type);
  }

  return apiRequest<{ data: IntegrationProvider[] }>(
    `/api/v1/integrations/providers?${queryParams.toString()}`
  );
}

export async function getProvider(id: string): Promise<{ data: IntegrationProvider }> {
  return apiRequest<{ data: IntegrationProvider }>(`/api/v1/integrations/providers/${id}`);
}

export async function listIntegrations(filters?: {
  type?: "accounting" | "bank";
  clientCompanyId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<TenantIntegration>> {
  const queryParams = new URLSearchParams();
  if (filters?.type) {
    queryParams.append("type", filters.type);
  }
  if (filters?.clientCompanyId) {
    queryParams.append("clientCompanyId", filters.clientCompanyId);
  }
  if (filters?.status) {
    queryParams.append("status", filters.status);
  }
  if (filters?.page) {
    queryParams.append("page", filters.page.toString());
  }
  if (filters?.pageSize) {
    queryParams.append("pageSize", filters.pageSize.toString());
  }

  return apiRequest<PaginatedResponse<TenantIntegration>>(
    `/api/v1/integrations?${queryParams.toString()}`
  );
}

export async function getIntegration(id: string): Promise<{
  data: TenantIntegration & { provider: IntegrationProvider };
}> {
  return apiRequest<{ data: TenantIntegration & { provider: IntegrationProvider } }>(
    `/api/v1/integrations/${id}`
  );
}

export async function createIntegration(data: {
  providerId: string;
  clientCompanyId?: string | null;
  displayName?: string;
  config: Record<string, unknown>;
}): Promise<{ data: TenantIntegration }> {
  return apiRequest<{ data: TenantIntegration }>("/api/v1/integrations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateIntegration(
  id: string,
  data: {
    displayName?: string;
    config?: Record<string, unknown>;
  }
): Promise<{ data: TenantIntegration }> {
  return apiRequest<{ data: TenantIntegration }>(`/api/v1/integrations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteIntegration(id: string): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(`/api/v1/integrations/${id}`, {
    method: "DELETE",
  });
}

export async function testConnection(
  id: string
): Promise<{ data: { success: boolean; message?: string } }> {
  return apiRequest<{ data: { success: boolean; message?: string } }>(
    `/api/v1/integrations/${id}/test-connection`,
    {
      method: "POST",
    }
  );
}

export async function triggerSync(
  id: string,
  jobType: "pull_invoices" | "pull_bank_transactions"
): Promise<{ data: { id: string; message: string } }> {
  return apiRequest<{ data: { id: string; message: string } }>(`/api/v1/integrations/${id}/sync`, {
    method: "POST",
    body: JSON.stringify({ jobType }),
  });
}

export async function listSyncJobs(
  integrationId: string,
  filters?: {
    status?: string;
    jobType?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<PaginatedResponse<IntegrationSyncJob>> {
  const queryParams = new URLSearchParams();
  if (filters?.status) {
    queryParams.append("status", filters.status);
  }
  if (filters?.jobType) {
    queryParams.append("jobType", filters.jobType);
  }
  if (filters?.page) {
    queryParams.append("page", filters.page.toString());
  }
  if (filters?.pageSize) {
    queryParams.append("pageSize", filters.pageSize.toString());
  }

  return apiRequest<PaginatedResponse<IntegrationSyncJob>>(
    `/api/v1/integrations/${integrationId}/jobs?${queryParams.toString()}`
  );
}

export async function listSyncLogs(
  integrationId: string,
  filters?: {
    level?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<PaginatedResponse<IntegrationSyncLog>> {
  const queryParams = new URLSearchParams();
  if (filters?.level) {
    queryParams.append("level", filters.level);
  }
  if (filters?.page) {
    queryParams.append("page", filters.page.toString());
  }
  if (filters?.pageSize) {
    queryParams.append("pageSize", filters.pageSize.toString());
  }

  return apiRequest<PaginatedResponse<IntegrationSyncLog>>(
    `/api/v1/integrations/${integrationId}/logs?${queryParams.toString()}`
  );
}

