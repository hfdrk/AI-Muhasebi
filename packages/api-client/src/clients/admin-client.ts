const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3800";

export interface TenantOverviewItem {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  status: string;
  billingPlan: string | null;
  userCount: number;
  clientCompanyCount: number;
  documentCount: number;
  invoiceCount: number;
}

export interface TenantsOverviewResponse {
  data: TenantOverviewItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  taxNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  billingPlan: string | null;
  quotaUsage: {
    clientCompanies: number;
    documents: number;
    users: number;
    scheduledReports: number;
  };
  recentRiskAlertsCount: number;
  recentFailedIntegrationsCount: number;
  tenantSettings: any;
  recentAuditEvents: Array<{
    id: string;
    action: string;
    userId: string | null;
    user: {
      id: string;
      email: string;
      fullName: string;
    } | null;
    createdAt: string;
    metadata: any;
  }>;
}

export interface TenantDetailResponse {
  data: TenantDetail;
}

export interface UpdateTenantStatusInput {
  status: "ACTIVE" | "SUSPENDED";
}

export interface UpdateTenantStatusResponse {
  data: Tenant;
  message: string;
}

export interface UserOverviewItem {
  id: string;
  name: string;
  email: string;
  platformRoles: string[];
  tenantMemberships: Array<{
    tenantId: string;
    tenantName: string;
    role: string;
    status: string;
  }>;
  lastLoginAt: string | null;
}

export interface UsersOverviewResponse {
  data: UserOverviewItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface SupportIncident {
  id: string;
  type: "SCHEDULED_REPORT" | "INTEGRATION_SYNC" | "OTHER";
  tenantId: string;
  tenantName: string;
  message: string;
  createdAt: string;
  status: string;
  resourceId: string | null;
}

export interface SupportIncidentsResponse {
  data: SupportIncident[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface PlatformMetrics {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  total_users: number;
  total_client_companies: number;
  total_documents: number;
  total_invoices: number;
  total_risk_alerts_last_7_days: number;
  total_failed_integrations_last_7_days: number;
}

export interface PlatformMetricsResponse {
  data: PlatformMetrics;
}

export interface StartImpersonationInput {
  targetUserId?: string;
  targetTenantId?: string;
  targetUserEmail?: string;
}

export interface StartImpersonationResponse {
  data: {
    impersonationToken: string;
    expiresAt: string;
    targetUser: {
      id: string;
      email: string;
      fullName: string;
    };
    targetTenantId: string;
  };
}

export interface StopImpersonationResponse {
  data: {
    message: string;
  };
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit & { useImpersonationToken?: boolean }
): Promise<T> {
  // Check for impersonation token first, then regular token
  const impersonationToken =
    typeof window !== "undefined" ? localStorage.getItem("impersonationToken") : null;
  const regularToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  
  const token = options?.useImpersonationToken && impersonationToken
    ? impersonationToken
    : regularToken;

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
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("impersonationToken");
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

export async function getTenantsOverview(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}): Promise<TenantsOverviewResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.pageSize) queryParams.append("pageSize", params.pageSize.toString());
  if (params?.status) queryParams.append("status", params.status);
  if (params?.search) queryParams.append("search", params.search);

  const queryString = queryParams.toString();
  return apiRequest<TenantsOverviewResponse>(
    `/api/v1/admin/tenants${queryString ? `?${queryString}` : ""}`
  );
}

export async function getTenantDetail(tenantId: string): Promise<TenantDetailResponse> {
  return apiRequest<TenantDetailResponse>(`/api/v1/admin/tenants/${tenantId}`);
}

export async function updateTenantStatus(
  tenantId: string,
  status: "ACTIVE" | "SUSPENDED"
): Promise<UpdateTenantStatusResponse> {
  return apiRequest<UpdateTenantStatusResponse>(`/api/v1/admin/tenants/${tenantId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getUsersOverview(params?: {
  page?: number;
  pageSize?: number;
  email?: string;
  tenantId?: string;
  role?: string;
}): Promise<UsersOverviewResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.pageSize) queryParams.append("pageSize", params.pageSize.toString());
  if (params?.email) queryParams.append("email", params.email);
  if (params?.tenantId) queryParams.append("tenantId", params.tenantId);
  if (params?.role) queryParams.append("role", params.role);

  const queryString = queryParams.toString();
  return apiRequest<UsersOverviewResponse>(
    `/api/v1/admin/users${queryString ? `?${queryString}` : ""}`
  );
}

export async function getSupportIncidents(params?: {
  page?: number;
  pageSize?: number;
  tenantId?: string;
  type?: string;
  status?: string;
}): Promise<SupportIncidentsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.pageSize) queryParams.append("pageSize", params.pageSize.toString());
  if (params?.tenantId) queryParams.append("tenantId", params.tenantId);
  if (params?.type) queryParams.append("type", params.type);
  if (params?.status) queryParams.append("status", params.status);

  const queryString = queryParams.toString();
  return apiRequest<SupportIncidentsResponse>(
    `/api/v1/admin/support/incidents${queryString ? `?${queryString}` : ""}`
  );
}

export async function getPlatformMetrics(): Promise<PlatformMetricsResponse> {
  return apiRequest<PlatformMetricsResponse>("/api/v1/admin/metrics/overview");
}

export async function startImpersonation(
  input: StartImpersonationInput
): Promise<StartImpersonationResponse> {
  const response = await apiRequest<StartImpersonationResponse>(
    "/api/v1/admin/impersonation/start",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );

  // Store impersonation token
  if (typeof window !== "undefined" && response.data.impersonationToken) {
    localStorage.setItem("impersonationToken", response.data.impersonationToken);
  }

  return response;
}

export async function stopImpersonation(): Promise<StopImpersonationResponse> {
  const response = await apiRequest<StopImpersonationResponse>(
    "/api/v1/admin/impersonation/stop",
    {
      method: "POST",
    }
  );

  // Clear impersonation token
  if (typeof window !== "undefined") {
    localStorage.removeItem("impersonationToken");
  }

  return response;
}

