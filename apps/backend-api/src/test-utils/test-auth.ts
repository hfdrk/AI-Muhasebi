import { hashPassword } from "@repo/shared-utils";
import { TENANT_ROLES } from "@repo/core-domain";
import type { TenantRole } from "@repo/core-domain";
import { getTestPrisma } from "./test-db.js";

export interface CreateTestUserOptions {
  email?: string;
  password?: string;
  fullName?: string;
  tenantId?: string;
  role?: TenantRole;
  tenantName?: string;
  tenantSlug?: string;
}

export interface TestUserResult {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    id: string;
    role: TenantRole;
  };
  accessToken?: string;
}

/**
 * Create a test user with optional tenant
 * If tenantId is not provided, creates a new tenant
 */
export async function createTestUser(
  options: CreateTestUserOptions = {}
): Promise<TestUserResult> {
  const prisma = getTestPrisma();
  const {
    email = `test-${Date.now()}@example.com`,
    password = "Test123!@#",
    fullName = "Test User",
    tenantId,
    role = TENANT_ROLES.TENANT_OWNER,
    tenantName = `Test Tenant ${Date.now()}`,
    tenantSlug = `test-tenant-${Date.now()}`,
  } = options;

  const hashedPassword = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    // Create or use existing tenant
    let tenant;
    if (tenantId) {
      tenant = await tx.tenant.findUniqueOrThrow({
        where: { id: tenantId },
      });
    } else {
      tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: tenantSlug,
          taxNumber: `123456789${Date.now() % 10000}`,
          settings: {},
        },
      });
    }

    // Create user
    const user = await tx.user.create({
      data: {
        email,
        hashedPassword,
        fullName,
        locale: "tr-TR",
        isActive: true,
      },
    });

    // Create membership
    const membership = await tx.userTenantMembership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role,
        status: "active",
      },
    });

    return { user, tenant, membership };
  });

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
    },
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
    },
    membership: {
      id: result.membership.id,
      role: result.membership.role,
    },
  };
}

/**
 * Get auth token by logging in via API
 * If app is provided, uses supertest (for integration tests)
 * Otherwise, makes HTTP request (requires server to be running)
 */
export async function getAuthToken(
  email: string,
  password: string,
  baseUrlOrApp: string | any = "http://localhost:3800"
): Promise<string> {
  // Check if baseUrlOrApp is an Express app (has .post method)
  if (baseUrlOrApp && typeof baseUrlOrApp.post === "function") {
    // Use supertest for integration tests
    const request = (await import("supertest")).default;
    const response = await request(baseUrlOrApp)
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(200);

    if (!response.body.data?.accessToken) {
      throw new Error(`Failed to get auth token: ${response.body.error?.message || "No token in response"}`);
    }

    return response.body.data.accessToken;
  }

  // Fallback to HTTP request (for E2E tests or when server is running)
  const baseUrl = baseUrlOrApp as string;
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Login failed" } }));
    throw new Error(`Failed to get auth token: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return data.data.accessToken;
}

/**
 * Create test user and get auth token
 */
export async function createTestUserWithToken(
  options: CreateTestUserOptions = {},
  baseUrl: string = "http://localhost:3800"
): Promise<TestUserResult & { accessToken: string }> {
  const testUser = await createTestUser(options);
  
  // Register the user first (if not already registered)
  // For testing, we'll use the register endpoint or login
  // Since we created the user directly, we need to use login
  const accessToken = await getAuthToken(
    testUser.user.email,
    options.password || "Test123!@#",
    baseUrl
  );

  return {
    ...testUser,
    accessToken,
  };
}

