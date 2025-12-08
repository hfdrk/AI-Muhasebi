const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3800";

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

