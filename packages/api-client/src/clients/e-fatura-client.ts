// Use Next.js rewrite proxy if API_URL is not set (for local development)
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface EFaturaSubmissionResult {
  success: boolean;
  externalId?: string;
  qrCode?: string;
  status?: "sent" | "accepted" | "rejected" | "pending";
  message?: string;
  submissionDate?: Date;
}

export interface EFaturaStatus {
  invoiceId: string;
  externalId: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "cancelled";
  submissionDate?: Date | null;
  acceptanceDate?: Date | null;
  rejectionReason?: string | null;
  qrCode?: string | null;
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  
  // If API_URL is empty, use Next.js rewrite proxy (relative path)
  // Otherwise use the full API URL
  const url = API_URL ? `${API_URL}${endpoint}` : endpoint;

  const response = await fetch(url, {
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
    const error = await response.json().catch(() => ({ error: { message: "Bir hata oluştu." } }));
    throw new Error(error.error?.message || "Bir hata oluştu.");
  }

  return response.json();
}

export async function submitInvoiceToEFatura(
  invoiceId: string,
  config?: Record<string, unknown>
): Promise<{ data: EFaturaSubmissionResult }> {
  const endpoint = "/api/v1/e-fatura/submit";
  const url = API_URL ? `${API_URL}${endpoint}` : endpoint;
  console.log("[API Client] submitInvoiceToEFatura - URL:", url, "invoiceId:", invoiceId);
  
  return apiRequest<{ data: EFaturaSubmissionResult }>(endpoint, {
    method: "POST",
    body: JSON.stringify({ invoiceId, config }),
  });
}

export async function checkEFaturaStatus(
  invoiceId: string
): Promise<{ data: EFaturaStatus }> {
  return apiRequest<{ data: EFaturaStatus }>(`/api/v1/e-fatura/status/${invoiceId}`);
}

export async function retryFailedEFaturaSubmissions(): Promise<{ data: { retryCount: number; message: string } }> {
  return apiRequest<{ data: { retryCount: number; message: string } }>("/api/v1/e-fatura/retry-failed", {
    method: "POST",
  });
}

