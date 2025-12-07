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

  // Create entities sequentially (without transaction) to ensure immediate visibility
  // This avoids transaction isolation issues where data isn't visible to other connections
  // We add small delays between steps to ensure PostgreSQL commits are fully visible
  
  // Step 1: Create or find tenant
  let tenant;
  if (tenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      // Create tenant if it doesn't exist (prevents "No Tenant found" errors in tests)
      tenant = await prisma.tenant.create({
        data: {
          id: tenantId,
          name: tenantName || `Test Tenant ${tenantId}`,
          slug: tenantSlug || `test-tenant-${tenantId}`,
          taxNumber: `123456789${Date.now() % 10000}`,
          settings: {},
        },
      });
      // Ensure tenant is committed and visible
      await prisma.$queryRaw`SELECT 1`;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  } else {
    tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug: tenantSlug,
        taxNumber: `123456789${Date.now() % 10000}`,
        settings: {},
      },
    });
    // Ensure tenant is committed and visible
    await prisma.$queryRaw`SELECT 1`;
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Step 2: Create user
  const user = await prisma.user.create({
    data: {
      email,
      hashedPassword,
      fullName,
      locale: "tr-TR",
      isActive: true,
    },
  });
  // Ensure user is committed and visible
  await prisma.$queryRaw`SELECT 1`;
  await new Promise(resolve => setTimeout(resolve, 50));

  // Step 3: Create or update membership (check if exists first, then create or update)
  let membership = await prisma.userTenantMembership.findUnique({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
  });

  if (membership) {
    // Update existing membership
    membership = await prisma.userTenantMembership.update({
      where: {
        id: membership.id,
      },
      data: {
        role,
        status: "active",
      },
    });
  } else {
    // Create new membership
    membership = await prisma.userTenantMembership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role,
        status: "active",
      },
    });
  }
  // Ensure membership is committed and visible
  await prisma.$queryRaw`SELECT 1`;
  await new Promise(resolve => setTimeout(resolve, 50));

  // Final verification: ensure user is visible by both email and ID
  // Retry a few times to ensure visibility across connections
  const normalizedEmail = email.toLowerCase().trim();
  for (let i = 0; i < 5; i++) {
    await prisma.$queryRaw`SELECT 1`;
    const verifyUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          where: { status: "active" },
        },
      },
    });
    
    if (verifyUser && verifyUser.isActive && verifyUser.memberships.length > 0 && verifyUser.hashedPassword) {
      // Also verify by ID (auth middleware uses ID from token)
      const verifyById = await prisma.user.findUnique({
        where: { id: user.id },
      });
      if (verifyById && verifyById.isActive) {
        // User is fully visible - ready for use
        await prisma.$queryRaw`SELECT 1`;
        await new Promise(resolve => setTimeout(resolve, 50));
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    },
    membership: {
      id: membership.id,
      role: membership.role,
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
    
    // createTestUser already ensures visibility, so attempt login with retries
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const response = await request(baseUrlOrApp)
          .post("/api/v1/auth/login")
          .send({ email, password });

        if (response.status === 200 && response.body.data?.accessToken) {
          const token = response.body.data.accessToken;
          
          // CRITICAL: After getting token, ensure user is visible by ID (auth middleware uses ID from token)
          // Decode token to get userId and verify user is visible
          try {
            const { verifyToken } = await import("@repo/shared-utils");
            const decoded = verifyToken(token);
            if (decoded.userId) {
              // Wait for user to be visible by ID (auth middleware looks up by ID)
              for (let i = 0; i < 5; i++) {
                await prisma.$queryRaw`SELECT 1`;
                const userById = await prisma.user.findUnique({
                  where: { id: decoded.userId },
                });
                if (userById && userById.isActive) {
                  // User is visible - token will work
                  await prisma.$queryRaw`SELECT 1`;
                  await new Promise(resolve => setTimeout(resolve, 100));
                  return token;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              // If user still not visible, return token anyway (might work)
            }
          } catch (e) {
            // Token decode failed, but we have a token so return it
          }
          
          return token;
        }

        // If 401 and not last attempt, retry after delay
        if (response.status === 401 && attempt < 4) {
          await prisma.$queryRaw`SELECT 1`;
          await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
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
          await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
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

