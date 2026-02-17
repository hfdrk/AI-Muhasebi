import { getAccessToken } from "../token-store";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface OnboardingState {
  hasClientCompanies: boolean;
  hasInvoices: boolean;
  hasUploadedDocuments: boolean;
  hasGeneratedReports: boolean;
}

export interface GetOnboardingStateResponse {
  data: OnboardingState;
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
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

export const onboardingClient = {
  /**
   * Get onboarding state for the current tenant
   */
  async getOnboardingState(): Promise<GetOnboardingStateResponse> {
    return apiRequest<GetOnboardingStateResponse>("/api/v1/onboarding/state", {
      method: "GET",
    });
  },
};


