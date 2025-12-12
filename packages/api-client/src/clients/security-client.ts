const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface TwoFactorAuth {
  enabled: boolean;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
}

export interface IPWhitelist {
  id: string;
  tenantId: string;
  userId?: string;
  ipAddress: string;
  description?: string;
  createdAt: string;
}

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export interface AccountLockoutStatus {
  locked: boolean;
  lockoutUntil?: string;
  failedAttempts: number;
  remainingAttempts: number;
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit & { params?: Record<string, string | number | boolean | undefined> }
): Promise<T> {
  let url = `${API_URL}${endpoint}`;
  
  if (options?.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const { params, ...fetchOptions } = options || {};

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...fetchOptions?.headers,
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
      errorMessage = error.error?.message || error.message || errorMessage;
    } catch {
      errorMessage = response.statusText || `HTTP ${response.status} hatası`;
    }
    
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

export const securityClient = {
  /**
   * Enable 2FA
   */
  async enable2FA(userId?: string): Promise<{ data: TwoFactorAuth }> {
    return apiRequest<{ data: TwoFactorAuth }>("/api/v1/security/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },

  /**
   * Verify and enable 2FA
   */
  async verifyAndEnable2FA(
    token: string,
    userId?: string
  ): Promise<{ data: { success: boolean; message: string } }> {
    return apiRequest<{ data: { success: boolean; message: string } }>("/api/v1/security/2fa/verify", {
      method: "POST",
      body: JSON.stringify({ token, userId }),
    });
  },

  /**
   * Disable 2FA
   */
  async disable2FA(userId?: string): Promise<{ data: { message: string } }> {
    return apiRequest<{ data: { message: string } }>("/api/v1/security/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },

  /**
   * Add IP to whitelist
   */
  async addIPWhitelist(
    ipAddress: string,
    description?: string,
    userId?: string
  ): Promise<{ data: IPWhitelist }> {
    return apiRequest<{ data: IPWhitelist }>("/api/v1/security/ip-whitelist", {
      method: "POST",
      body: JSON.stringify({ ipAddress, description, userId }),
    });
  },

  /**
   * Check IP whitelist status
   */
  async checkIPWhitelist(): Promise<{ data: { isWhitelisted: boolean; ipAddress: string } }> {
    return apiRequest<{ data: { isWhitelisted: boolean; ipAddress: string } }>(
      "/api/v1/security/ip-whitelist/check"
    );
  },

  /**
   * Validate password
   */
  async validatePassword(password: string): Promise<{ data: PasswordValidation }> {
    return apiRequest<{ data: PasswordValidation }>("/api/v1/security/password/validate", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },

  /**
   * Get account lockout status
   */
  async getAccountLockoutStatus(userId: string): Promise<{ data: AccountLockoutStatus }> {
    return apiRequest<{ data: AccountLockoutStatus }>(`/api/v1/security/account-lockout/${userId}`);
  },
};

