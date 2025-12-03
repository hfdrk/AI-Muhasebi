const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3800";

export interface Transaction {
  id: string;
  tenantId: string;
  clientCompanyId: string | null;
  date: Date;
  referenceNo: string | null;
  description: string | null;
  source: "manual" | "import" | "integration";
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionLine {
  id: string;
  tenantId: string;
  transactionId: string;
  ledgerAccountId: string;
  debitAmount: number;
  creditAmount: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListTransactionsParams {
  clientCompanyId?: string;
  dateFrom?: string;
  dateTo?: string;
  referenceNo?: string;
  page?: number;
  pageSize?: number;
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

export interface TrialBalanceEntry {
  ledgerAccountId: string;
  ledgerAccountCode: string;
  ledgerAccountName: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface TrialBalanceResult {
  entries: TrialBalanceEntry[];
  totalDebit: number;
  totalCredit: number;
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

export async function listTransactions(
  params?: ListTransactionsParams
): Promise<PaginatedResponse<Transaction & { totalDebit: number; totalCredit: number }>> {
  const queryParams = new URLSearchParams();
  if (params?.clientCompanyId) {
    queryParams.append("clientCompanyId", params.clientCompanyId);
  }
  if (params?.dateFrom) {
    queryParams.append("dateFrom", params.dateFrom);
  }
  if (params?.dateTo) {
    queryParams.append("dateTo", params.dateTo);
  }
  if (params?.referenceNo) {
    queryParams.append("referenceNo", params.referenceNo);
  }
  if (params?.page) {
    queryParams.append("page", params.page.toString());
  }
  if (params?.pageSize) {
    queryParams.append("pageSize", params.pageSize.toString());
  }

  return apiRequest<PaginatedResponse<Transaction & { totalDebit: number; totalCredit: number }>>(
    `/api/v1/transactions?${queryParams.toString()}`
  );
}

export async function getTransaction(id: string): Promise<{ data: Transaction & { lines: TransactionLine[] } }> {
  return apiRequest<{ data: Transaction & { lines: TransactionLine[] } }>(
    `/api/v1/transactions/${id}`
  );
}

export async function createTransaction(
  data: Omit<Transaction, "id" | "tenantId" | "createdAt" | "updatedAt"> & {
    lines: Omit<TransactionLine, "id" | "tenantId" | "transactionId" | "createdAt" | "updatedAt">[];
  }
): Promise<{ data: Transaction }> {
  return apiRequest<{ data: Transaction }>("/api/v1/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTransaction(
  id: string,
  data: Partial<Omit<Transaction, "id" | "tenantId" | "createdAt" | "updatedAt">> & {
    lines?: Omit<TransactionLine, "id" | "tenantId" | "transactionId" | "createdAt" | "updatedAt">[];
  }
): Promise<{ data: Transaction }> {
  return apiRequest<{ data: Transaction }>(`/api/v1/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(id: string): Promise<{ data: { message: string } }> {
  return apiRequest<{ data: { message: string } }>(`/api/v1/transactions/${id}`, {
    method: "DELETE",
  });
}

export async function getTrialBalance(
  clientCompanyId: string | null,
  dateFrom: string,
  dateTo: string
): Promise<{ data: TrialBalanceResult }> {
  const queryParams = new URLSearchParams();
  if (clientCompanyId) {
    queryParams.append("clientCompanyId", clientCompanyId);
  }
  queryParams.append("dateFrom", dateFrom);
  queryParams.append("dateTo", dateTo);

  return apiRequest<{ data: TrialBalanceResult }>(
    `/api/v1/transactions/trial-balance?${queryParams.toString()}`
  );
}

