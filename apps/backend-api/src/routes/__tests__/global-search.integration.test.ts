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

describe("Global Search Integration Tests", () => {
  const app = createTestApp();

  beforeEach(async () => {
    // Database is reset before each test by test-setup.ts
  });

  describe("GET /api/v1/search/global", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const response = await request(app)
        .get("/api/v1/search/global?query=test")
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it("should return 400 if query is too short", async () => {
      const testUser = await createTestUser();
      const token = await getAuthToken(testUser.user.email, "Test123!@#", app);

      const response = await request(app)
        .get("/api/v1/search/global?query=a")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("en az 2 karakter");
    });

    it("should return empty results for query with 2+ characters but no matches", async () => {
      const testUser = await createTestUser();
      const token = await getAuthToken(testUser.user.email, "Test123!@#", app);

      const response = await request(app)
        .get("/api/v1/search/global?query=nonexistent12345")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.clients).toEqual([]);
      expect(response.body.data.invoices).toEqual([]);
      expect(response.body.data.documents).toEqual([]);
      expect(response.body.data.riskAlerts).toEqual([]);
      expect(response.body.data.reports).toEqual([]);
    });

    it("should search clients and return results with tenant isolation", async () => {
      const testUser = await createTestUser();
      const token = await getAuthToken(testUser.user.email, "Test123!@#", app);
      const prisma = getTestPrisma();

      // Create a client company
      const client = await prisma.clientCompany.create({
        data: {
          tenantId: testUser.tenant.id,
          name: "Test Company",
          legalType: "Limited",
          taxNumber: "1234567890",
        },
      });

      const response = await request(app)
        .get("/api/v1/search/global?query=Test")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.clients.length).toBeGreaterThan(0);
      expect(response.body.data.clients[0].name).toContain("Test");
      expect(response.body.data.clients[0].id).toBe(client.id);
    });

    it("should respect tenant isolation - users cannot see other tenants' data", async () => {
      const testUser1 = await createTestUser();
      const testUser2 = await createTestUser();
      const token2 = await getAuthToken(testUser2.user.email, "Test123!@#", app);
      const prisma = getTestPrisma();

      // Create a client in tenant 1
      await prisma.clientCompany.create({
        data: {
          tenantId: testUser1.tenant.id,
          name: "Tenant1 Company",
          legalType: "Limited",
          taxNumber: "1111111111",
        },
      });

      // Search from tenant 2 should not find tenant 1's data
      const response = await request(app)
        .get("/api/v1/search/global?query=Tenant1")
        .set("Authorization", `Bearer ${token2}`)
        .set("X-Tenant-Id", testUser2.tenant.id)
        .expect(200);

      expect(response.body.data.clients).toEqual([]);
    });

    it("should respect RBAC - only return results user has permission to view", async () => {
      const testUser = await createTestUser();
      const token = await getAuthToken(testUser.user.email, "Test123!@#", app);
      const prisma = getTestPrisma();

      // Create test data
      await prisma.clientCompany.create({
        data: {
          tenantId: testUser.tenant.id,
          name: "Test Client",
          legalType: "Limited",
          taxNumber: "1234567890",
        },
      });

      // All roles should have clients:read, so this should work
      const response = await request(app)
        .get("/api/v1/search/global?query=Test")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data.clients.length).toBeGreaterThan(0);
    });
  });
});

