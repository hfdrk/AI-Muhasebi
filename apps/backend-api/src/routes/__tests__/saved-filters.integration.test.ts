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
import { SAVED_FILTER_TARGETS } from "@repo/core-domain";

describe("Saved Filters Integration Tests", () => {
  const app = createTestApp();

  beforeEach(async () => {
    // Database is reset before each test by test-setup.ts
  });

  describe("GET /api/v1/saved-filters", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const response = await request(app)
        .get("/api/v1/saved-filters")
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it("should return empty array when no saved filters exist", async () => {
      const testUser = await createTestUser();
      const token = await getAuthToken(testUser.user.email, "Test123!@#", app);

      const response = await request(app)
        .get("/api/v1/saved-filters")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it("should filter by target when provided", async () => {
      const testUser = await createTestUser();
      const token = await getAuthToken(testUser.user.email, "Test123!@#", app);
      const prisma = getTestPrisma();

      // Create filters for different targets
      await prisma.savedFilter.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          name: "Client Filter",
          target: SAVED_FILTER_TARGETS.CLIENT_COMPANIES,
          filters: { search: "test" },
        },
      });

      await prisma.savedFilter.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          name: "Invoice Filter",
          target: SAVED_FILTER_TARGETS.INVOICES,
          filters: { status: "active" },
        },
      });

      const response = await request(app)
        .get(`/api/v1/saved-filters?target=${SAVED_FILTER_TARGETS.CLIENT_COMPANIES}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].target).toBe(SAVED_FILTER_TARGETS.CLIENT_COMPANIES);
    });
  });

  describe("POST /api/v1/saved-filters", () => {
    it("should create a saved filter", async () => {
      const testUser = await createTestUser();
      const token = await getAuthToken(testUser.user.email, "Test123!@#", app);

      const response = await request(app)
        .post("/api/v1/saved-filters")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "My Filter",
          target: SAVED_FILTER_TARGETS.CLIENT_COMPANIES,
          filters: { search: "test", isActive: true },
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe("My Filter");
      expect(response.body.data.target).toBe(SAVED_FILTER_TARGETS.CLIENT_COMPANIES);
      expect(response.body.data.filters).toEqual({ search: "test", isActive: true });
      expect(response.body.data.isDefault).toBe(false);
    });

    it("should set isDefault and unset other defaults for same (tenant, user, target)", async () => {
      const testUser = await createTestUser();
      const token = await getAuthToken(testUser.user.email, "Test123!@#", app);
      const prisma = getTestPrisma();

      // Create first default filter
      const filter1 = await prisma.savedFilter.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          name: "First Default",
          target: SAVED_FILTER_TARGETS.CLIENT_COMPANIES,
          filters: {},
          isDefault: true,
        },
      });

      // Create second filter and set it as default
      const response = await request(app)
        .post("/api/v1/saved-filters")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Second Default",
          target: SAVED_FILTER_TARGETS.CLIENT_COMPANIES,
          filters: {},
          isDefault: true,
        })
        .expect(201);

      expect(response.body.data.isDefault).toBe(true);

      // Verify first filter is no longer default
      const updatedFilter1 = await prisma.savedFilter.findUnique({
        where: { id: filter1.id },
      });
      expect(updatedFilter1?.isDefault).toBe(false);
    });
  });

  describe("PUT /api/v1/saved-filters/:id", () => {
    it("should update a saved filter", async () => {
      const testUser = await createTestUser();
      const token = await getAuthToken(testUser.user.email, "Test123!@#", app);
      const prisma = getTestPrisma();

      const filter = await prisma.savedFilter.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          name: "Original Name",
          target: SAVED_FILTER_TARGETS.CLIENT_COMPANIES,
          filters: { search: "old" },
        },
      });

      const response = await request(app)
        .put(`/api/v1/saved-filters/${filter.id}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Updated Name",
          filters: { search: "new" },
        })
        .expect(200);

      expect(response.body.data.name).toBe("Updated Name");
      expect(response.body.data.filters).toEqual({ search: "new" });
    });

    it("should return 404 for non-existent filter", async () => {
      const testUser = await createTestUser();
      const token = await getAuthToken(testUser.user.email, "Test123!@#", app);

      const response = await request(app)
        .put("/api/v1/saved-filters/nonexistent-id")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Updated Name",
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it("should return 404 when user tries to update another user's filter", async () => {
      const testUser1 = await createTestUser();
      const testUser2 = await createTestUser();
      const token1 = await getAuthToken(testUser1.user.email, "Test123!@#", app);
      const prisma = getTestPrisma();

      // Create filter for user 2
      const filter = await prisma.savedFilter.create({
        data: {
          tenantId: testUser2.tenant.id,
          userId: testUser2.user.id,
          name: "User2 Filter",
          target: SAVED_FILTER_TARGETS.CLIENT_COMPANIES,
          filters: {},
        },
      });

      // User 1 tries to update user 2's filter (different tenant, should be 404)
      const response = await request(app)
        .put(`/api/v1/saved-filters/${filter.id}`)
        .set("Authorization", `Bearer ${token1}`)
        .set("X-Tenant-Id", testUser1.tenant.id)
        .send({
          name: "Hacked",
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe("DELETE /api/v1/saved-filters/:id", () => {
    it("should delete a saved filter", async () => {
      const testUser = await createTestUser();
      const token = await getAuthToken(testUser.user.email, "Test123!@#", app);
      const prisma = getTestPrisma();

      const filter = await prisma.savedFilter.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          name: "To Delete",
          target: SAVED_FILTER_TARGETS.CLIENT_COMPANIES,
          filters: {},
        },
      });

      await request(app)
        .delete(`/api/v1/saved-filters/${filter.id}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      // Verify it's deleted
      const deleted = await prisma.savedFilter.findUnique({
        where: { id: filter.id },
      });
      expect(deleted).toBeNull();
    });

    it("should return 404 for non-existent filter", async () => {
      const testUser = await createTestUser();
      const token = await getAuthToken(testUser.user.email, "Test123!@#", app);

      const response = await request(app)
        .delete("/api/v1/saved-filters/nonexistent-id")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it("should enforce tenant isolation - users cannot delete other tenants' filters", async () => {
      const testUser1 = await createTestUser();
      const testUser2 = await createTestUser();
      const token1 = await getAuthToken(testUser1.user.email, "Test123!@#", app);
      const prisma = getTestPrisma();

      // Create filter for user 2
      const filter = await prisma.savedFilter.create({
        data: {
          tenantId: testUser2.tenant.id,
          userId: testUser2.user.id,
          name: "User2 Filter",
          target: SAVED_FILTER_TARGETS.CLIENT_COMPANIES,
          filters: {},
        },
      });

      // User 1 tries to delete user 2's filter (different tenant, should be 404)
      const response = await request(app)
        .delete(`/api/v1/saved-filters/${filter.id}`)
        .set("Authorization", `Bearer ${token1}`)
        .set("X-Tenant-Id", testUser1.tenant.id)
        .expect(404);

      expect(response.body.error).toBeDefined();

      // Verify filter still exists
      const stillExists = await prisma.savedFilter.findUnique({
        where: { id: filter.id },
      });
      expect(stillExists).toBeDefined();
    });
  });
});

