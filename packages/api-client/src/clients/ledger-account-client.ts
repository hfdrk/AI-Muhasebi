const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3800";

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

