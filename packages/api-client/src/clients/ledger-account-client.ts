import { getAccessToken } from "../token-store";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface LedgerAccount {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export async function listLedgerAccounts(): Promise<{ data: LedgerAccount[] }> {
  return apiRequest<{ data: LedgerAccount[] }>("/api/v1/ledger-accounts");
}

export async function getLedgerAccount(id: string): Promise<{ data: LedgerAccount }> {
  return apiRequest<{ data: LedgerAccount }>(`/api/v1/ledger-accounts/${id}`);
}

export async function createLedgerAccount(
  data: Omit<LedgerAccount, "id" | "tenantId" | "createdAt" | "updatedAt">
): Promise<{ data: LedgerAccount }> {
  return apiRequest<{ data: LedgerAccount }>("/api/v1/ledger-accounts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLedgerAccount(
  id: string,
  data: Partial<Omit<LedgerAccount, "id" | "tenantId" | "createdAt" | "updatedAt">>
): Promise<{ data: LedgerAccount }> {
  return apiRequest<{ data: LedgerAccount }>(`/api/v1/ledger-accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

