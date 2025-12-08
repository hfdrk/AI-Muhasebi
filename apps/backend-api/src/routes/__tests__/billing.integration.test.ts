import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp } from "../../test-utils/test-server";
import { createTestUser, getAuthToken, type TestUserResult } from "../../test-utils/test-auth";
import { getTestPrisma } from "../../test-utils/test-db";
import { createTestClientCompany } from "../../test-utils/test-factories";
import request from "supertest";

describe("Billing API Integration Tests", () => {
  let app: any;
  let tenant1: TestUserResult;
  let tenant2: TestUserResult;
  let tenant1Token: string;
  let tenant2Token: string;

  beforeAll(async () => {
    app = createTestApp();
    const prisma = getTestPrisma();

    // Create two test tenants
    tenant1 = await createTestUser({
      email: `billing-test-tenant1-${Date.now()}@example.com`,
      password: "Test123!@#",
      tenantName: "Billing Test Tenant 1",
      tenantSlug: `billing-test-tenant1-${Date.now()}`,
      role: "TenantOwner",
    });

    tenant2 = await createTestUser({
      email: `billing-test-tenant2-${Date.now()}@example.com`,
      password: "Test123!@#",
      tenantName: "Billing Test Tenant 2",
      tenantSlug: `billing-test-tenant2-${Date.now()}`,
      role: "TenantOwner",
    });

    // Get auth tokens using the helper which has retry logic
    tenant1Token = await getAuthToken(tenant1.user.email, "Test123!@#");
    tenant2Token = await getAuthToken(tenant2.user.email, "Test123!@#");
  });

  afterAll(async () => {
    const prisma = getTestPrisma();
    // Cleanup is handled by test database reset
  });

  describe("GET /api/v1/billing/subscription", () => {
    it("should return default FREE plan if no subscription exists", async () => {
      const response = await request(app)
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${tenant1Token}`)
        .set("x-tenant-id", tenant1.tenant.id)
        .expect(200);

      expect(response.body.data).toMatchObject({
        plan: "FREE",
        status: "ACTIVE",
      });
      expect(response.body.data.limits).toBeDefined();
      expect(response.body.data.limits.maxClientCompanies).toBe(3);
    });

    it("should return correct plan and limits for PRO plan", async () => {
      const prisma = getTestPrisma();
      
      // Update tenant1 to PRO plan
      await prisma.tenantSubscription.upsert({
        where: { tenantId: tenant1.tenant.id },
        create: {
          tenantId: tenant1.tenant.id,
          plan: "PRO",
          status: "ACTIVE",
        },
        update: {
          plan: "PRO",
        },
      });

      const response = await request(app)
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${tenant1Token}`)
        .set("x-tenant-id", tenant1.tenant.id)
        .expect(200);

      expect(response.body.data.plan).toBe("PRO");
      expect(response.body.data.limits.maxClientCompanies).toBe(50);
    });

    it("should show limited data for Staff role", async () => {
      // Create a Staff user for tenant1
      const staffUser = await createTestUser({
        email: `billing-staff-${Date.now()}@example.com`,
        password: "Test123!@#",
        tenantId: tenant1.tenant.id,
        role: "Staff",
      });

      const staffLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: staffUser.user.email,
          password: "Test123!@#",
        })
        .expect(200);

      const staffToken = staffLogin.body.data.accessToken;

      const response = await request(app)
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${staffToken}`)
        .set("x-tenant-id", tenant1.tenant.id)
        .expect(200);

      expect(response.body.data.plan).toBeDefined();
      expect(response.body.data.status).toBeDefined();
      // Staff should not see limits
      expect(response.body.data.limits).toBeUndefined();
    });

    it("should enforce tenant isolation", async () => {
      const response = await request(app)
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${tenant2Token}`)
        .set("x-tenant-id", tenant2.tenant.id)
        .expect(200);

      // Tenant2 should get their own subscription (default FREE)
      expect(response.body.data.plan).toBe("FREE");
    });
  });

  describe("GET /api/v1/billing/usage", () => {
    it("should return usage summary with zero usage initially", async () => {
      const response = await request(app)
        .get("/api/v1/billing/usage")
        .set("Authorization", `Bearer ${tenant1Token}`)
        .set("x-tenant-id", tenant1.tenant.id)
        .expect(200);

      expect(response.body.data).toMatchObject({
        clientCompanies: { used: 0, limit: expect.any(Number), remaining: expect.any(Number) },
        documents: { used: 0, limit: expect.any(Number), remaining: expect.any(Number) },
        aiAnalyses: { used: 0, limit: expect.any(Number), remaining: expect.any(Number) },
        users: { used: 0, limit: expect.any(Number), remaining: expect.any(Number) },
        scheduledReports: { used: 0, limit: expect.any(Number), remaining: expect.any(Number) },
      });
    });

    it("should reflect correct usage after creating resources", async () => {
      // Create client companies
      await createTestClientCompany({ tenantId: tenant1.tenant.id });
      await createTestClientCompany({ tenantId: tenant1.tenant.id });
      await createTestClientCompany({ tenantId: tenant1.tenant.id });

      const response = await request(app)
        .get("/api/v1/billing/usage")
        .set("Authorization", `Bearer ${tenant1Token}`)
        .set("x-tenant-id", tenant1.tenant.id)
        .expect(200);

      expect(response.body.data.clientCompanies.used).toBe(3);
      expect(response.body.data.clientCompanies.remaining).toBe(0); // FREE plan limit is 3
    });

    it("should enforce tenant isolation for usage", async () => {
      // Tenant2 should have different usage
      const response = await request(app)
        .get("/api/v1/billing/usage")
        .set("Authorization", `Bearer ${tenant2Token}`)
        .set("x-tenant-id", tenant2.tenant.id)
        .expect(200);

      expect(response.body.data.clientCompanies.used).toBe(0);
    });
  });

  describe("Limit Enforcement", () => {
    it("should prevent creating 4th client company on FREE plan", async () => {
      // FREE plan limit is 3, we already created 3 above
      const response = await request(app)
        .post("/api/v1/client-companies")
        .set("Authorization", `Bearer ${tenant1Token}`)
        .set("x-tenant-id", tenant1.tenant.id)
        .send({
          name: "Fourth Company",
          legalType: "Limited",
          taxNumber: `TAX${Date.now()}`,
        })
        .expect(422);

      expect(response.body.error.message).toContain("limitine ulaşıldı");
    });

    it("should allow creating more companies on PRO plan", async () => {
      const prisma = getTestPrisma();
      
      // Ensure tenant exists and is visible
      await prisma.$queryRaw`SELECT 1`;
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenant1.tenant.id },
      });
      if (!tenant) {
        throw new Error(`Tenant ${tenant1.tenant.id} not found`);
      }
      
      // Update to PRO plan with retry logic
      let retries = 5;
      let attempt = 0;
      while (retries > 0) {
        try {
          await prisma.tenantSubscription.upsert({
            where: { tenantId: tenant1.tenant.id },
            create: {
              tenantId: tenant1.tenant.id,
              plan: "PRO",
              status: "ACTIVE",
            },
            update: {
              plan: "PRO",
            },
          });
          break;
        } catch (error: any) {
          if ((error?.code === "P2003" || error?.code === "40P01") && retries > 1) {
            await prisma.$queryRaw`SELECT 1`;
            const delay = Math.min(200 * Math.pow(2, attempt), 2000) + Math.random() * 100;
            await new Promise(resolve => setTimeout(resolve, delay));
            retries--;
            attempt++;
            continue;
          }
          throw error;
        }
      }

      // PRO plan limit is 50, so 4th company should be allowed
      const response = await request(app)
        .post("/api/v1/client-companies")
        .set("Authorization", `Bearer ${tenant1Token}`)
        .set("x-tenant-id", tenant1.tenant.id)
        .send({
          name: "Fourth Company",
          legalType: "Limited",
          taxNumber: `TAX${Date.now()}`,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
    });
  });

  describe("RBAC", () => {
    it("should allow TenantOwner to see full subscription data", async () => {
      const response = await request(app)
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${tenant1Token}`)
        .set("x-tenant-id", tenant1.tenant.id)
        .expect(200);

      expect(response.body.data.limits).toBeDefined();
      expect(response.body.data.valid_until).toBeDefined();
    });

    it("should allow Accountant to see full subscription data", async () => {
      const accountantUser = await createTestUser({
        email: `billing-accountant-${Date.now()}@example.com`,
        password: "Test123!@#",
        tenantId: tenant1.tenant.id,
        role: "Accountant",
      });

      const accountantLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: accountantUser.user.email,
          password: "Test123!@#",
        })
        .expect(200);

      const accountantToken = accountantLogin.body.data.accessToken;

      const response = await request(app)
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${accountantToken}`)
        .set("x-tenant-id", tenant1.tenant.id)
        .expect(200);

      expect(response.body.data.limits).toBeDefined();
    });

    it("should allow all roles to view usage", async () => {
      const readOnlyUser = await createTestUser({
        email: `billing-readonly-${Date.now()}@example.com`,
        password: "Test123!@#",
        tenantId: tenant1.tenant.id,
        role: "ReadOnly",
      });

      const readOnlyLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: readOnlyUser.user.email,
          password: "Test123!@#",
        })
        .expect(200);

      const readOnlyToken = readOnlyLogin.body.data.accessToken;

      const response = await request(app)
        .get("/api/v1/billing/usage")
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("x-tenant-id", tenant1.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });
});

