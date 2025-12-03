const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3800";

export interface Invoice {
  id: string;
  tenantId: string;
  clientCompanyId: string;
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

export interface PaginatedResponse<T> {
  data: {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
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

