import { setAccessToken as storeToken, clearAccessToken } from "../token-store";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  data: {
    user: {
      id: string;
      email: string;
      fullName: string;
      locale: string;
    };
    accessToken: string;
    tenantId?: string;
  };
}

export interface RegisterInput {
  user: {
    email: string;
    password: string;
    fullName: string;
  };
  tenant: {
    name: string;
    slug: string;
    taxNumber?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
}

export interface RegisterResponse {
  data: {
    user: {
      id: string;
      email: string;
      fullName: string;
      locale: string;
    };
    tenant: {
      id: string;
      name: string;
      slug: string;
    };
    accessToken: string;
  };
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  let response: Response;
  
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      credentials: "include",
    });
  } catch (networkError: any) {
    // Handle network errors (connection refused, timeout, etc.)
    const errorMessage = networkError.message || "Sunucuya bağlanılamadı.";
    const detailedError = API_URL 
      ? `${errorMessage} (API: ${API_URL})`
      : `${errorMessage} (API URL yapılandırılmamış. NEXT_PUBLIC_API_BASE_URL kontrol edin.)`;
    throw new Error(detailedError);
  }

  if (!response.ok) {
    let errorMessage = "Bir hata oluştu.";
    try {
      const error = await response.json();
      // Ensure error message is always a string
      const rawMessage = error.error?.message || error.message || error.error;
      if (typeof rawMessage === "string") {
        errorMessage = rawMessage;
      } else if (rawMessage != null) {
        // If it's not a string, convert it to string safely
        try {
          errorMessage = String(rawMessage);
        } catch {
          errorMessage = "Bir hata oluştu.";
        }
      }
    } catch (parseError) {
      // If response is not JSON (e.g., connection refused), use status text
      const statusText = response.statusText;
      if (typeof statusText === "string" && statusText.length > 0) {
        errorMessage = statusText;
      } else if (response.status) {
        errorMessage = `HTTP ${response.status} hatası`;
      } else {
        errorMessage = "Sunucuya bağlanılamadı. Backend API'nin çalıştığından emin olun.";
      }
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

export async function login(input: LoginInput): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  
  // Store access token in memory
  if (response.data.accessToken) {
    storeToken(response.data.accessToken);
  }

  return response;
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  const response = await apiRequest<RegisterResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });

  // Store access token in memory
  if (response.data.accessToken) {
    storeToken(response.data.accessToken);
  }

  return response;
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<{ data: { message: string } }> {
  return apiRequest("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function resetPassword(input: ResetPasswordInput): Promise<{ data: { message: string } }> {
  return apiRequest("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function refreshAccessToken(): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/api/v1/auth/refresh", {
    method: "POST",
  });

  // Store new access token in memory
  if (response.data.accessToken) {
    storeToken(response.data.accessToken);
  }

  return response;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest("/api/v1/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    // Ignore errors on logout
  } finally {
    clearAccessToken();
  }
}

