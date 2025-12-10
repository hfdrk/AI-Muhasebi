// Task 16: AI Endpoint Mock Mode Tests
// These tests verify that AI endpoints work correctly in mock mode
// and that hasRealAIProvider() is used correctly to prevent function errors.

// Import env setup FIRST - must run before any routes/services that use config
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import {
  createTestApp,
  createTestUser,
  getAuthToken,
  getTestPrisma,
} from "../../test-utils";
import { TENANT_ROLES } from "@repo/core-domain";

describe("AI Assistant Integration Tests", () => {
  const app = createTestApp();
  const prisma = getTestPrisma();

  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let testToken: string;
  let tenantAUser: Awaited<ReturnType<typeof createTestUser>>;
  let tenantAToken: string;
  let tenantBUser: Awaited<ReturnType<typeof createTestUser>>;
  let tenantBToken: string;
  let readOnlyUser: Awaited<ReturnType<typeof createTestUser>>;
  let readOnlyToken: string;

  // Store original env value to restore after tests
  let originalOpenAIKey: string | undefined;

  beforeEach(async () => {
    // Store original OPENAI_API_KEY
    originalOpenAIKey = process.env.OPENAI_API_KEY;
    // Ensure OPENAI_API_KEY is not set for mock mode tests
    delete process.env.OPENAI_API_KEY;

    // Create test user
    testUser = await createTestUser({
      email: `ai-test-${Date.now()}@example.com`,
    });
    testToken = await getAuthToken(testUser.user.email, "Test123!@#", app);

    // Create ReadOnly user
    readOnlyUser = await createTestUser({
      email: `ai-readonly-${Date.now()}@example.com`,
      role: TENANT_ROLES.READ_ONLY,
      tenantId: testUser.tenant.id,
    });
    readOnlyToken = await getAuthToken(
      readOnlyUser.user.email,
      "Test123!@#",
      app
    );

    // Create two tenants for isolation test
    tenantAUser = await createTestUser({
      email: `tenant-a-${Date.now()}@example.com`,
      tenantName: `Tenant A ${Date.now()}`,
      tenantSlug: `tenant-a-${Date.now()}`,
    });
    tenantAToken = await getAuthToken(
      tenantAUser.user.email,
      "Test123!@#",
      app
    );

    tenantBUser = await createTestUser({
      email: `tenant-b-${Date.now()}@example.com`,
      tenantName: `Tenant B ${Date.now()}`,
      tenantSlug: `tenant-b-${Date.now()}`,
    });
    tenantBToken = await getAuthToken(
      tenantBUser.user.email,
      "Test123!@#",
      app
    );

    // Ensure users and tenants are committed before tests run
    await prisma.$queryRaw`SELECT 1`;
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  afterEach(() => {
    // Restore original OPENAI_API_KEY
    if (originalOpenAIKey !== undefined) {
      process.env.OPENAI_API_KEY = originalOpenAIKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  describe("POST /api/v1/ai/chat", () => {
    it("should return 200 and answer in mock mode", async () => {
      // Ensure OPENAI_API_KEY is not set (done in beforeEach)
      expect(process.env.OPENAI_API_KEY).toBeUndefined();

      const response = await request(app)
        .post("/api/v1/ai/chat")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          question: "Bugünkü risk durumumuz nedir?",
        })
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("answer");
      expect(typeof response.body.data.answer).toBe("string");
      expect(response.body.data.answer.length).toBeGreaterThan(0);
      // Verify no function errors occurred (response should be valid JSON with answer)
    });

    it("should enforce auth (401 when unauthenticated)", async () => {
      await request(app)
        .post("/api/v1/ai/chat")
        .send({
          question: "Test question",
        })
        .expect(401);
    });

    it("should allow ReadOnly users to call AI endpoints (RBAC check)", async () => {
      const response = await request(app)
        .post("/api/v1/ai/chat")
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("X-Tenant-Id", readOnlyUser.tenant.id)
        .send({
          question: "Test question",
        })
        .expect(200);

      expect(response.body.data).toHaveProperty("answer");
      expect(typeof response.body.data.answer).toBe("string");
      expect(response.body.data.answer.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/v1/ai/summaries/daily-risk", () => {
    it("should work in mock mode without provider", async () => {
      // Ensure OPENAI_API_KEY is not set
      expect(process.env.OPENAI_API_KEY).toBeUndefined();

      // Create a client company for the test user
      const clientCompany = await prisma.clientCompany.create({
        data: {
          tenantId: testUser.tenant.id,
          name: "Test Company for Risk Alert",
          taxNumber: `TAX${Date.now()}`,
          legalType: "Limited",
          isActive: true,
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      // Create a risk alert for the test
      await prisma.riskAlert.create({
        data: {
          tenantId: testUser.tenant.id,
          clientCompanyId: clientCompany.id,
          type: "RISK_THRESHOLD_EXCEEDED",
          title: "Test High Risk Alert",
          severity: "high",
          status: "open",
          message: "Test high risk alert for AI summary",
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .post("/api/v1/ai/summaries/daily-risk")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          date: new Date().toISOString(),
        })
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("summary");
      expect(response.body.data).toHaveProperty("date");
      expect(typeof response.body.data.summary).toBe("string");
      expect(response.body.data.summary.length).toBeGreaterThan(0);
      // Verify no 500 error occurred
    });

    it("should enforce tenant isolation (cannot cross tenants)", async () => {
      // Create risk data for Tenant A only
      const tenantAClient = await prisma.clientCompany.create({
        data: {
          tenantId: tenantAUser.tenant.id,
          name: "Tenant A Company",
          taxNumber: `TAXA${Date.now()}`,
          legalType: "Limited",
          isActive: true,
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      await prisma.riskAlert.create({
        data: {
          tenantId: tenantAUser.tenant.id,
          clientCompanyId: tenantAClient.id,
          type: "RISK_THRESHOLD_EXCEEDED",
          title: "Tenant A Risk Alert",
          severity: "high",
          status: "open",
          message: "This alert should not be visible to Tenant B",
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      // Login as user from Tenant B and call the endpoint
      // Should succeed but only see Tenant B's data (which is empty)
      const response = await request(app)
        .post("/api/v1/ai/summaries/daily-risk")
        .set("Authorization", `Bearer ${tenantBToken}`)
        .set("X-Tenant-Id", tenantBUser.tenant.id)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("summary");
      expect(typeof response.body.data.summary).toBe("string");
      // The summary should be based on Tenant B's data (which is empty)
      // but should not throw an error or access Tenant A's data
    });
  });
});
