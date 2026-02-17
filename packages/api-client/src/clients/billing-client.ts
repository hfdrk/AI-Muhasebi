import { getAccessToken } from "../token-store";

export interface SubscriptionResponse {
  plan: "FREE" | "PRO" | "ENTERPRISE";
  status: "ACTIVE" | "PAST_DUE" | "CANCELLED";
  valid_until: string | null;
  trial_until: string | null;
  limits?: {
    maxClientCompanies: number;
    maxDocumentsPerMonth: number;
    maxAiAnalysesPerMonth: number;
    maxUsers: number;
    maxScheduledReports: number;
  };
}

export interface UsageMetric {
  used: number;
  limit: number;
  remaining: number;
}

export interface UsageResponse {
  clientCompanies: UsageMetric;
  documents: UsageMetric;
  aiAnalyses: UsageMetric;
  users: UsageMetric;
  scheduledReports: UsageMetric;
}

export interface UpdateSubscriptionInput {
  plan?: "FREE" | "PRO" | "ENTERPRISE";
  status?: "ACTIVE" | "PAST_DUE" | "CANCELLED";
  valid_until?: string | null;
  trial_until?: string | null;
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

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
    
    // Attach status code for React Query to detect
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusCode = response.status;
    (error as any).response = { status: response.status };
    throw error;
  }

  return response.json();
}

export async function getSubscription(): Promise<{ data: SubscriptionResponse }> {
  return apiRequest<{ data: SubscriptionResponse }>("/api/v1/billing/subscription");
}

export async function getUsage(): Promise<{ data: UsageResponse }> {
  return apiRequest<{ data: UsageResponse }>("/api/v1/billing/usage");
}

export async function updateSubscription(
  data: UpdateSubscriptionInput
): Promise<{ data: SubscriptionResponse }> {
  return apiRequest<{ data: SubscriptionResponse }>("/api/v1/billing/subscription", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}


