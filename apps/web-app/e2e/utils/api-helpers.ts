/**
 * Direct API calls for test setup/teardown
 * 
 * Note: These functions use native fetch (Node 18+) or undici
 * For Playwright tests, prefer using page.request API when possible
 */

const API_BASE_URL = process.env.API_URL || "http://localhost:3800";

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  tenantName: string;
  tenantSlug: string;
}

// Helper to get fetch function
async function getFetch() {
  if (typeof fetch !== "undefined") {
    return fetch;
  }
  // Fallback to undici for older Node versions
  const { fetch: undiciFetch } = await import("undici");
  return undiciFetch;
}

export async function createTestUserViaAPI(user: TestUser): Promise<{
  user: { id: string; email: string };
  tenant: { id: string; name: string };
  accessToken: string;
}> {
  const fetchFn = await getFetch();
  
  const response = await fetchFn(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user: {
        email: user.email,
        password: user.password,
        fullName: user.fullName,
      },
      tenant: {
        name: user.tenantName,
        slug: user.tenantSlug,
      },
    }),
  } as any);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Registration failed" } }));
    throw new Error(`Failed to create test user: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return {
    user: data.data.user,
    tenant: { id: data.data.tenantId, name: user.tenantName },
    accessToken: data.data.accessToken,
  };
}

export async function loginViaAPI(email: string, password: string): Promise<string> {
  const fetchFn = await getFetch();
  
  const response = await fetchFn(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  } as any);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Login failed" } }));
    throw new Error(`Failed to login: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return data.data.accessToken;
}

export async function createClientCompanyViaAPI(
  token: string,
  tenantId: string,
  company: {
    name: string;
    taxNumber: string;
    legalType: string;
  }
): Promise<{ id: string }> {
  const fetchFn = await getFetch();
  
  const response = await fetchFn(`${API_BASE_URL}/api/v1/client-companies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Tenant-Id": tenantId,
    },
    body: JSON.stringify({
      ...company,
      isActive: true,
    }),
  } as any);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Failed to create company" } }));
    throw new Error(`Failed to create client company: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return { id: data.data.id };
}

export async function cleanupTestData(token: string, tenantId: string) {
  // Optional: Add cleanup logic if needed
  // For now, tests will rely on database reset between runs
}
