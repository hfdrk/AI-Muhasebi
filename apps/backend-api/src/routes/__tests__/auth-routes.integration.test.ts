// Import env setup FIRST - must run before any routes/services that use config
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  createTestApp,
  createTestUser,
  getAuthToken,
  getTestPrisma,
} from "../../test-utils";
import { TENANT_ROLES } from "@repo/core-domain";

describe("Auth & Tenant Flow Integration Tests", () => {
  const app = createTestApp();

  beforeEach(async () => {
    // Database is reset before each test by test-setup.ts
    // getTestPrisma() is called inside each test to ensure credentials are resolved
  });

  describe("POST /api/v1/auth/register", () => {
    it("should create User, Tenant, and UserTenantMembership with TenantOwner role", async () => {
      const uniqueEmail = `register-test-${Date.now()}@example.com`;
      const uniqueSlug = `test-tenant-${Date.now()}`;

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          user: {
            email: uniqueEmail,
            password: "Test123!@#Password",
            fullName: "Test User",
          },
          tenant: {
            name: "Test Tenant",
            slug: uniqueSlug,
            taxNumber: "1234567890",
          },
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(uniqueEmail);
      expect(response.body.data.accessToken).toBeDefined();

      // Verify User was created
      const prisma = getTestPrisma();
      const user = await prisma.user.findUnique({
        where: { email: uniqueEmail },
      });
      expect(user).toBeDefined();
      expect(user?.email).toBe(uniqueEmail);
      expect(user?.fullName).toBe("Test User");

      // Verify Tenant was created
      const tenant = await prisma.tenant.findUnique({
        where: { slug: uniqueSlug },
      });
      expect(tenant).toBeDefined();
      expect(tenant?.name).toBe("Test Tenant");

      // Verify UserTenantMembership was created with TenantOwner role
      const membership = await prisma.userTenantMembership.findFirst({
        where: {
          userId: user!.id,
          tenantId: tenant!.id,
        },
      });
      expect(membership).toBeDefined();
      expect(membership?.role).toBe(TENANT_ROLES.TENANT_OWNER);
      expect(membership?.status).toBe("active");
    });

    it("should fail with duplicate email", async () => {
      const testUser = await createTestUser({
        email: "duplicate@example.com",
      });

      // Ensure user is visible before attempting duplicate registration
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;
      const verifyUser = await prisma.user.findUnique({
        where: { email: testUser.user.email },
      });
      if (!verifyUser) {
        // Wait a bit for user to be visible
        await new Promise((resolve) => setTimeout(resolve, 200));
        await prisma.$queryRaw`SELECT 1`;
      }

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          user: {
            email: testUser.user.email,
            password: "Test123!@#Password",
            fullName: "Another User",
          },
          tenant: {
            name: "Another Tenant",
            slug: `test-tenant-${Date.now()}`,
          },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("Bu e-posta adresi zaten kullanılıyor.");
    });

    it("should fail with duplicate tenant slug", async () => {
      const testUser = await createTestUser({
        tenantSlug: "duplicate-slug",
      });

      // Ensure tenant is visible before attempting duplicate registration
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;
      
      // Wait for tenant to be visible (retry up to 10 times)
      for (let i = 0; i < 10; i++) {
        await prisma.$queryRaw`SELECT 1`;
        const tenant = await prisma.tenant.findUnique({
          where: { slug: testUser.tenant.slug },
        });
        if (tenant) {
          await prisma.$queryRaw`SELECT 1`;
          await new Promise((resolve) => setTimeout(resolve, 150));
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          user: {
            email: `another-${Date.now()}@example.com`,
            password: "Test123!@#Password",
            fullName: "Another User",
          },
          tenant: {
            name: "Another Tenant",
            slug: testUser.tenant.slug,
          },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("Bu ofis adı zaten kullanılıyor.");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should succeed with correct credentials", async () => {
      const testUser = await createTestUser({
        email: "login-test@example.com",
        password: "CorrectPassword123!@#",
      });

      // Ensure user and membership are visible before login
      // createTestUser already ensures this, but verify membership is visible
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;
      
      // Wait for membership to be visible (login service queries for active memberships)
      for (let i = 0; i < 15; i++) {
        await prisma.$queryRaw`SELECT 1`;
        const user = await prisma.user.findUnique({
          where: { email: testUser.user.email },
          include: {
            memberships: {
              where: { status: "active" },
            },
          },
        });
        if (user && user.isActive && user.memberships.length > 0 && user.hashedPassword) {
          // Verify membership tenant matches
          const membership = user.memberships[0];
          if (membership.tenantId === testUser.tenant.id) {
            await prisma.$queryRaw`SELECT 1`;
            await new Promise((resolve) => setTimeout(resolve, 200));
            break;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testUser.user.email,
          password: "CorrectPassword123!@#",
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.user.email);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.tenantId).toBe(testUser.tenant.id);
    });

    it("should fail with wrong password", async () => {
      const testUser = await createTestUser({
        email: "wrong-password-test@example.com",
        password: "CorrectPassword123!@#",
      });

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testUser.user.email,
          password: "WrongPassword123!@#",
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("E-posta veya şifre hatalı.");
    });

    it("should fail with non-existent email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "AnyPassword123!@#",
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("E-posta veya şifre hatalı.");
    });
  });

  describe("Tenant Isolation", () => {
    it("should prevent user from Tenant A accessing Tenant B's data", async () => {
      // Create two tenants with users
      const tenantA = await createTestUser({
        email: "tenanta@example.com",
        tenantName: "Tenant A",
        tenantSlug: `tenant-a-${Date.now()}`,
      });

      const tenantB = await createTestUser({
        email: "tenantb@example.com",
        tenantName: "Tenant B",
        tenantSlug: `tenant-b-${Date.now()}`,
      });

      // Create a client company in Tenant B
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`; // Ensure tenantB is committed
      
      const companyB = await prisma.clientCompany.create({
        data: {
          tenantId: tenantB.tenant.id,
          name: "Tenant B Company",
          taxNumber: "9999999999",
          legalType: "Limited",
          isActive: true,
        },
      });
      await prisma.$queryRaw`SELECT 1`; // Ensure companyB is committed

      // Ensure tenantA is visible before getting token
      await prisma.$queryRaw`SELECT 1`;
      
      // Wait for user to be visible with active membership (as auth service requires)
      for (let i = 0; i < 10; i++) {
        await prisma.$queryRaw`SELECT 1`;
        const found = await prisma.user.findUnique({ 
          where: { email: tenantA.user.email },
          include: {
            memberships: {
              where: { status: "active" },
            },
          },
        });
        if (found && found.isActive && found.memberships.length > 0) {
          // User exists, is active, and has active membership
          await prisma.$queryRaw`SELECT 1`;
          await new Promise((resolve) => setTimeout(resolve, 150));
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Get auth token for Tenant A user (getAuthToken already has retry logic)
      // createTestUser already ensures user is visible, so token should work
      const tokenA = await getAuthToken(
        tenantA.user.email,
        "Test123!@#",
        app
      );

      // Ensure user is visible to auth middleware (it looks up by ID from token)
      // createTestUser already did this, but verify one more time
      await prisma.$queryRaw`SELECT 1`;
      const verifyUser = await prisma.user.findUnique({
        where: { id: tenantA.user.id },
      });
      if (!verifyUser || !verifyUser.isActive) {
        // Wait a bit more
        await new Promise((resolve) => setTimeout(resolve, 200));
        await prisma.$queryRaw`SELECT 1`;
      }

      // Try to access Tenant B's company using Tenant A's token
      // Note: This test assumes the API validates tenant context from the token
      // We'll test this by making a request and checking it fails or returns empty
      const response = await request(app)
        .get(`/api/v1/client-companies/${companyB.id}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Tenant-Id", tenantA.tenant.id)
        .expect(404); // Should be not found (tenant isolation returns 404)

      // Also verify that listing companies only returns Tenant A's companies
      const listResponse = await request(app)
        .get("/api/v1/client-companies")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Tenant-Id", tenantA.tenant.id)
        .expect(200);

      // Tenant A should not see Tenant B's company
      const companyIds = listResponse.body.data.data.map((c: any) => c.id);
      expect(companyIds).not.toContain(companyB.id);
    });
  });
});


