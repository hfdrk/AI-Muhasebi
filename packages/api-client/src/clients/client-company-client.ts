import { getAccessToken } from "../token-store";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface ClientCompany {
  id: string;
  tenantId: string;
  name: string;
  legalType: string;
  taxNumber: string;
  tradeRegistryNumber: string | null;
  sector: string | null;
  contactPersonName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  startDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAccount {
  id: string;
  tenantId: string;
  clientCompanyId: string;
  bankName: string;
  iban: string;
  accountNumber: string | null;
  currency: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListClientCompaniesParams {
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

import type { PaginatedResponse } from "./shared-types";

// Re-export for backward compatibility
export type { PaginatedResponse };

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

export async function listClientCompanies(
  params?: ListClientCompaniesParams
): Promise<PaginatedResponse<ClientCompany>> {
  const queryParams = new URLSearchParams();
  if (params?.isActive !== undefined) {
    queryParams.append("isActive", params.isActive.toString());
  }
  if (params?.search) {
    queryParams.append("search", params.search);
  }
  if (params?.page) {
    queryParams.append("page", params.page.toString());
  }
  if (params?.pageSize) {
    queryParams.append("pageSize", params.pageSize.toString());
  }

  return apiRequest<PaginatedResponse<ClientCompany>>(
    `/api/v1/client-companies?${queryParams.toString()}`
  );
}

export async function getClientCompany(id: string): Promise<{ data: ClientCompany & { stats?: { invoiceCount: number; transactionCount: number } } }> {
  return apiRequest<{ data: ClientCompany & { stats?: { invoiceCount: number; transactionCount: number } } }>(
    `/api/v1/client-companies/${id}`
  );
}

export async function createClientCompany(
  data: Omit<ClientCompany, "id" | "tenantId" | "createdAt" | "updatedAt">
): Promise<{ data: ClientCompany }> {
  return apiRequest<{ data: ClientCompany }>("/api/v1/client-companies", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateClientCompany(
  id: string,
  data: Partial<Omit<ClientCompany, "id" | "tenantId" | "createdAt" | "updatedAt" | "taxNumber">>
): Promise<{ data: ClientCompany }> {
  return apiRequest<{ data: ClientCompany }>(`/api/v1/client-companies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteClientCompany(id: string): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(`/api/v1/client-companies/${id}`, {
    method: "DELETE",
  });
}

export async function listBankAccounts(clientCompanyId: string): Promise<{ data: BankAccount[] }> {
  return apiRequest<{ data: BankAccount[] }>(
    `/api/v1/client-companies/${clientCompanyId}/bank-accounts`
  );
}

export async function createBankAccount(
  clientCompanyId: string,
  data: Omit<BankAccount, "id" | "tenantId" | "clientCompanyId" | "createdAt" | "updatedAt">
): Promise<{ data: BankAccount }> {
  return apiRequest<{ data: BankAccount }>(
    `/api/v1/client-companies/${clientCompanyId}/bank-accounts`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function updateBankAccount(
  clientCompanyId: string,
  accountId: string,
  data: Partial<Omit<BankAccount, "id" | "tenantId" | "clientCompanyId" | "createdAt" | "updatedAt">>
): Promise<{ data: BankAccount }> {
  return apiRequest<{ data: BankAccount }>(
    `/api/v1/client-companies/${clientCompanyId}/bank-accounts/${accountId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export async function deleteBankAccount(
  clientCompanyId: string,
  accountId: string
): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(
    `/api/v1/client-companies/${clientCompanyId}/bank-accounts/${accountId}`,
    {
      method: "DELETE",
    }
  );
}

// Get current user's client company (for ReadOnly users)
export async function getMyClientCompany(): Promise<{ data: ClientCompany | null }> {
  return apiRequest<{ data: ClientCompany | null }>("/api/v1/client-companies/my-company");
}

