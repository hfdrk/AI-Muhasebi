const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3800";

export interface TenantSettings {
  id: string;
  tenantId: string;
  displayName: string | null;
  logoUrl: string | null;
  locale: string;
  timezone: string;
  emailFromName: string | null;
  riskThresholds: {
    high: number;
    critical: number;
  };
  defaultReportPeriod: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTenantSettingsInput {
  displayName?: string | null;
  logoUrl?: string | null;
  locale?: string;
  timezone?: string;
  emailFromName?: string | null;
  riskThresholds?: {
    high: number;
    critical: number;
  };
  defaultReportPeriod?: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  locale: string | null;
  timezone: string | null;
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EffectiveUserSettings {
  userSettings: UserSettings;
  effectiveLocale: string;
  effectiveTimezone: string;
  effectiveEmailNotificationsEnabled: boolean;
  effectiveInAppNotificationsEnabled: boolean;
}

export interface UpdateUserSettingsInput {
  locale?: string | null;
  timezone?: string | null;
  emailNotificationsEnabled?: boolean;
  inAppNotificationsEnabled?: boolean;
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

export async function getTenantSettings(): Promise<{ data: TenantSettings }> {
  return apiRequest<{ data: TenantSettings }>("/api/v1/settings/tenant");
}

export async function updateTenantSettings(
  input: UpdateTenantSettingsInput
): Promise<{ data: TenantSettings }> {
  return apiRequest<{ data: TenantSettings }>("/api/v1/settings/tenant", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function getUserSettings(): Promise<{ data: EffectiveUserSettings }> {
  return apiRequest<{ data: EffectiveUserSettings }>("/api/v1/settings/user");
}

export async function updateUserSettings(
  input: UpdateUserSettingsInput
): Promise<{ data: EffectiveUserSettings }> {
  return apiRequest<{ data: EffectiveUserSettings }>("/api/v1/settings/user", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}


