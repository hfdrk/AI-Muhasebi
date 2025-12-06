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
      tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
      });
      if (!tenant) {
        // Create tenant if it doesn't exist (prevents "No Tenant found" errors in tests)
        tenant = await tx.tenant.create({
          data: {
            id: tenantId,
            name: tenantName || `Test Tenant ${tenantId}`,
            slug: tenantSlug || `test-tenant-${tenantId}`,
            taxNumber: `123456789${Date.now() % 10000}`,
            settings: {},
          },
        });
      }
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

  // Ensure transaction is committed and visible to other connections
  // This is especially important in tests where the user is immediately used for login
  await prisma.$queryRaw`SELECT 1`;

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
    
    // Retry on 401 - user might not be visible immediately after creation
    // Don't use .expect(200) here because we need to check the status code for retries
    let lastError: any;
    const { getTestPrisma } = await import("./test-db.js");
    const prisma = getTestPrisma();
    const normalizedEmail = email.toLowerCase().trim();
    
    // Quick check if user is visible (non-blocking)
    await prisma.$queryRaw`SELECT 1`;
    
    // Now attempt login with retries
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const response = await request(baseUrlOrApp)
          .post("/api/v1/auth/login")
          .send({ email, password });

        if (response.status === 200 && response.body.data?.accessToken) {
          return response.body.data.accessToken;
        }

        // If 401 and not last attempt, retry after delay and verify user exists
        if (response.status === 401 && attempt < 4) {
          await prisma.$queryRaw`SELECT 1`;
          
          // Verify user exists with active membership
          const verifyUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: {
              memberships: {
                where: { status: "active" },
              },
            },
          });
          
          if (!verifyUser || !verifyUser.isActive || verifyUser.memberships.length === 0) {
            // User not ready yet, wait longer
            await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
            lastError = new Error(`Login failed: User not ready (attempt ${attempt + 1})`);
            continue;
          }
          
          await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
          lastError = new Error(`Login failed: ${response.body.error?.message || "Unauthorized"}`);
          continue;
        }

        // Otherwise throw immediately
        throw new Error(`Failed to get auth token: ${response.body.error?.message || `Status ${response.status}`}`);
      } catch (error: any) {
        // Check if it's a supertest assertion error for 401
        const is401Error = error.status === 401 || 
                          error.message?.includes("401") || 
                          error.message?.includes("Unauthorized") ||
                          (error.response && error.response.status === 401);
        
        if (is401Error && attempt < 4) {
          lastError = error;
          await prisma.$queryRaw`SELECT 1`;
          
          // Verify user exists
          const verifyUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: {
              memberships: {
                where: { status: "active" },
              },
            },
          });
          
          if (!verifyUser || !verifyUser.isActive || verifyUser.memberships.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
            continue;
          }
          
          await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
          continue;
        }
        
        // Otherwise throw
        throw error;
      }
    }
    
    throw lastError || new Error("Failed to get auth token after retries");
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

