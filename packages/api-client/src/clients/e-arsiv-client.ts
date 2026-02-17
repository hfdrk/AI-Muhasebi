import { getAccessToken } from "../token-store";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface EArsivArchiveResult {
  success: boolean;
  archiveId?: string;
  archiveDate?: Date;
  message?: string;
}

export interface EArsivSearchFilters {
  startDate?: string;
  endDate?: string;
  invoiceNumber?: string;
  customerName?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface EArsivInvoice {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: Date;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  currency: string;
  supplierVKN: string;
  customerName?: string | null;
  customerTaxNumber?: string | null;
  customerEmail?: string | null;
  archiveId?: string;
  archiveDate?: Date;
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

export async function archiveInvoiceToEArsiv(
  invoiceId: string
): Promise<{ data: EArsivArchiveResult }> {
  return apiRequest<{ data: EArsivArchiveResult }>("/api/v1/e-arsiv/archive", {
    method: "POST",
    body: JSON.stringify({ invoiceId }),
  });
}

export async function searchArchivedInvoices(
  filters?: EArsivSearchFilters
): Promise<{ data: EArsivInvoice[] }> {
  const queryParams = new URLSearchParams();
  if (filters?.startDate) {
    queryParams.append("startDate", filters.startDate);
  }
  if (filters?.endDate) {
    queryParams.append("endDate", filters.endDate);
  }
  if (filters?.invoiceNumber) {
    queryParams.append("invoiceNumber", filters.invoiceNumber);
  }
  if (filters?.customerName) {
    queryParams.append("customerName", filters.customerName);
  }
  if (filters?.minAmount !== undefined) {
    queryParams.append("minAmount", filters.minAmount.toString());
  }
  if (filters?.maxAmount !== undefined) {
    queryParams.append("maxAmount", filters.maxAmount.toString());
  }

  const queryString = queryParams.toString();
  return apiRequest<{ data: EArsivInvoice[] }>(
    `/api/v1/e-arsiv/search${queryString ? `?${queryString}` : ""}`
  );
}

export async function getArchivedInvoice(
  invoiceId: string
): Promise<{ data: EArsivInvoice }> {
  return apiRequest<{ data: EArsivInvoice }>(`/api/v1/e-arsiv/${invoiceId}`);
}

export async function autoArchiveOldInvoices(
  retentionDays?: number
): Promise<{ data: { archivedCount: number; message: string } }> {
  return apiRequest<{ data: { archivedCount: number; message: string } }>("/api/v1/e-arsiv/auto-archive", {
    method: "POST",
    body: JSON.stringify({ retentionDays }),
  });
}


