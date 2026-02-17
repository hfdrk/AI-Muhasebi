import { getAccessToken } from "../token-store";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface Invoice {
  id: string;
  tenantId: string;
  clientCompanyId: string;
  clientCompanyName: string | null;
  externalId: string | null;
  type: "SATIŞ" | "ALIŞ";
  issueDate: Date;
  dueDate: Date | null;
  totalAmount: number;
  currency: string;
  taxAmount: number;
  netAmount: number | null;
  counterpartyName: string | null;
  counterpartyTaxNumber: string | null;
  status: "taslak" | "kesildi" | "iptal" | "muhasebeleştirilmiş";
  source: "manual" | "import" | "integration";
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLine {
  id: string;
  tenantId: string;
  invoiceId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  vatRate: number;
  vatAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListInvoicesParams {
  clientCompanyId?: string;
  issueDateFrom?: string;
  issueDateTo?: string;
  type?: string;
  status?: string;
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

export async function listInvoices(
  params?: ListInvoicesParams
): Promise<PaginatedResponse<Invoice>> {
  const queryParams = new URLSearchParams();
  if (params?.clientCompanyId) {
    queryParams.append("clientCompanyId", params.clientCompanyId);
  }
  if (params?.issueDateFrom) {
    queryParams.append("issueDateFrom", params.issueDateFrom);
  }
  if (params?.issueDateTo) {
    queryParams.append("issueDateTo", params.issueDateTo);
  }
  if (params?.type) {
    queryParams.append("type", params.type);
  }
  if (params?.status) {
    queryParams.append("status", params.status);
  }
  if (params?.page) {
    queryParams.append("page", params.page.toString());
  }
  if (params?.pageSize) {
    queryParams.append("pageSize", params.pageSize.toString());
  }

  return apiRequest<PaginatedResponse<Invoice>>(
    `/api/v1/invoices?${queryParams.toString()}`
  );
}

export async function getInvoice(id: string): Promise<{ data: Invoice & { lines: InvoiceLine[] } }> {
  return apiRequest<{ data: Invoice & { lines: InvoiceLine[] } }>(`/api/v1/invoices/${id}`);
}

export async function createInvoice(
  data: Omit<Invoice, "id" | "tenantId" | "createdAt" | "updatedAt"> & {
    lines: Omit<InvoiceLine, "id" | "tenantId" | "invoiceId" | "createdAt" | "updatedAt">[];
  }
): Promise<{ data: Invoice }> {
  return apiRequest<{ data: Invoice }>("/api/v1/invoices", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateInvoice(
  id: string,
  data: Partial<Omit<Invoice, "id" | "tenantId" | "createdAt" | "updatedAt">> & {
    lines?: Omit<InvoiceLine, "id" | "tenantId" | "invoiceId" | "createdAt" | "updatedAt">[];
  }
): Promise<{ data: Invoice }> {
  return apiRequest<{ data: Invoice }>(`/api/v1/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function updateInvoiceStatus(
  id: string,
  status: Invoice["status"]
): Promise<{ data: Invoice }> {
  return apiRequest<{ data: Invoice }>(`/api/v1/invoices/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteInvoice(id: string): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(`/api/v1/invoices/${id}`, {
    method: "DELETE",
  });
}

