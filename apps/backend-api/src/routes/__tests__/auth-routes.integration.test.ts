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
  const prisma = getTestPrisma();

  beforeEach(async () => {
    // Database is reset before each test by test-setup.ts
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

      await request(app)
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
    });

    it("should fail with duplicate tenant slug", async () => {
      const testUser = await createTestUser({
        tenantSlug: "duplicate-slug",
      });

      await request(app)
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
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should succeed with correct credentials", async () => {
      const testUser = await createTestUser({
        email: "login-test@example.com",
        password: "CorrectPassword123!@#",
      });

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
      expect(response.body.error.message).toBeDefined();
    });

    it("should fail with non-existent email", async () => {
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "AnyPassword123!@#",
        })
        .expect(401);
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
      const companyB = await prisma.clientCompany.create({
        data: {
          tenantId: tenantB.tenant.id,
          name: "Tenant B Company",
          taxNumber: "9999999999",
          legalType: "Limited",
          isActive: true,
        },
      });

      // Get auth token for Tenant A user
      const tokenA = await getAuthToken(
        tenantA.user.email,
        "Test123!@#",
        app
      );

      // Try to access Tenant B's company using Tenant A's token
      // Note: This test assumes the API validates tenant context from the token
      // We'll test this by making a request and checking it fails or returns empty
      const response = await request(app)
        .get(`/api/v1/client-companies/${companyB.id}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Tenant-Id", tenantA.tenant.id)
        .expect(403); // Should be forbidden or not found

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


