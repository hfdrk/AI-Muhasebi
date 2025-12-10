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
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

export async function login(input: LoginInput): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  
  // Store access token
  if (typeof window !== "undefined" && response.data.accessToken) {
    localStorage.setItem("accessToken", response.data.accessToken);
  }
  
  return response;
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  const response = await apiRequest<RegisterResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  
  // Store access token
  if (typeof window !== "undefined" && response.data.accessToken) {
    localStorage.setItem("accessToken", response.data.accessToken);
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

export async function logout(): Promise<void> {
  try {
    await apiRequest("/api/v1/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    // Ignore errors on logout
  } finally {
    // Always clear the token
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
    }
  }
}

