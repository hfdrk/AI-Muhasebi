import { getAccessToken } from "../token-store";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface EDefterPeriod {
  startDate: string;
  endDate: string;
  periodType: "monthly" | "quarterly" | "yearly";
}

export interface EDefterGenerationResult {
  success: boolean;
  ledgerId?: string;
  entryCount: number;
  totalDebit: number;
  totalCredit: number;
  generationDate: Date;
  message?: string;
}

export interface EDefterSubmissionResult {
  success: boolean;
  submissionId?: string;
  submissionDate?: Date;
  status?: "submitted" | "accepted" | "rejected";
  message?: string;
}

export interface EDefterEntry {
  date: Date;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
  documentNumber?: string;
  documentType?: string;
  counterpartyName?: string;
  counterpartyTaxNumber?: string;
}

export interface EDefterLedger {
  ledgerId: string;
  clientCompanyId: string;
  clientCompanyName: string;
  period: {
    startDate: string | Date;
    endDate: string | Date;
    periodType: "monthly" | "quarterly" | "yearly";
  };
  entryCount: number;
  totalDebit: number;
  totalCredit: number;
  generationDate: Date | string;
  submissionStatus?: "draft" | "submitted" | "accepted" | "rejected";
  submissionDate?: Date | string;
  entries?: EDefterEntry[];
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

export async function generateEDefter(
  clientCompanyId: string,
  period: EDefterPeriod
): Promise<{ data: EDefterGenerationResult }> {
  return apiRequest<{ data: EDefterGenerationResult }>("/api/v1/e-defter/generate", {
    method: "POST",
    body: JSON.stringify({
      clientCompanyId,
      periodStart: period.startDate,
      periodEnd: period.endDate,
      periodType: period.periodType,
    }),
  });
}

export async function submitEDefter(
  clientCompanyId: string,
  ledgerId: string
): Promise<{ data: EDefterSubmissionResult }> {
  return apiRequest<{ data: EDefterSubmissionResult }>("/api/v1/e-defter/submit", {
    method: "POST",
    body: JSON.stringify({ clientCompanyId, ledgerId }),
  });
}

export async function getEDefterLedger(
  clientCompanyId: string,
  ledgerId: string
): Promise<{ data: EDefterLedger }> {
  return apiRequest<{ data: EDefterLedger }>(`/api/v1/e-defter/${clientCompanyId}/${ledgerId}`);
}

export async function listEDefterLedgers(
  clientCompanyId: string
): Promise<{ data: EDefterLedger[] }> {
  return apiRequest<{ data: EDefterLedger[] }>(`/api/v1/e-defter/${clientCompanyId}`);
}

