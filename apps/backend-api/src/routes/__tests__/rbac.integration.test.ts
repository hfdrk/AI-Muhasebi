// Import env setup FIRST - must run before any routes/services that use config
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  createTestApp,
  createTestUser,
  getAuthToken,
} from "../../test-utils";
import { TENANT_ROLES } from "@repo/core-domain";

describe("RBAC Integration Tests", () => {
  const app = createTestApp();

  let tenantOwner: Awaited<ReturnType<typeof createTestUser>>;
  let accountant: Awaited<ReturnType<typeof createTestUser>>;
  let staff: Awaited<ReturnType<typeof createTestUser>>;
  let readOnly: Awaited<ReturnType<typeof createTestUser>>;
  let tenantOwnerToken: string;
  let accountantToken: string;
  let staffToken: string;
  let readOnlyToken: string;

  beforeEach(async () => {
    // Create users with different roles in the same tenant
    const baseTenant = await createTestUser({
      email: `owner-${Date.now()}@example.com`,
      role: TENANT_ROLES.TENANT_OWNER,
      tenantName: `RBAC Test Tenant ${Date.now()}`,
      tenantSlug: `rbac-test-${Date.now()}`,
    });

    tenantOwner = baseTenant;
    tenantOwnerToken = await getAuthToken(
      tenantOwner.user.email,
      "Test123!@#",
      app
    );

    // Create other users in the same tenant
    accountant = await createTestUser({
      email: `accountant-${Date.now()}@example.com`,
      role: TENANT_ROLES.ACCOUNTANT,
      tenantId: tenantOwner.tenant.id,
    });
    accountantToken = await getAuthToken(
      accountant.user.email,
      "Test123!@#",
      app
    );

    staff = await createTestUser({
      email: `staff-${Date.now()}@example.com`,
      role: TENANT_ROLES.STAFF,
      tenantId: tenantOwner.tenant.id,
    });
    staffToken = await getAuthToken(
      staff.user.email,
      "Test123!@#",
      app
    );

    readOnly = await createTestUser({
      email: `readonly-${Date.now()}@example.com`,
      role: TENANT_ROLES.READ_ONLY,
      tenantId: tenantOwner.tenant.id,
    });
    readOnlyToken = await getAuthToken(
      readOnly.user.email,
      "Test123!@#",
      app
    );
  });

  describe("POST /api/v1/tenants/:tenantId/users/invite", () => {
    it("should allow TenantOwner to invite users", async () => {
      const response = await request(app)
        .post(`/api/v1/tenants/${tenantOwner.tenant.id}/users/invite`)
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          email: `newuser-${Date.now()}@example.com`,
          role: TENANT_ROLES.STAFF,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBeDefined();
    });

    it("should allow Accountant to invite users", async () => {
      const response = await request(app)
        .post(`/api/v1/tenants/${tenantOwner.tenant.id}/users/invite`)
        .set("Authorization", `Bearer ${accountantToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          email: `newuser-${Date.now()}@example.com`,
          role: TENANT_ROLES.STAFF,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
    });

    it("should deny ReadOnly user from inviting users", async () => {
      const response = await request(app)
        .post(`/api/v1/tenants/${tenantOwner.tenant.id}/users/invite`)
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          email: `newuser-${Date.now()}@example.com`,
          role: TENANT_ROLES.STAFF,
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("permission");
    });

    it("should deny Staff user from inviting users", async () => {
      const response = await request(app)
        .post(`/api/v1/tenants/${tenantOwner.tenant.id}/users/invite`)
        .set("Authorization", `Bearer ${staffToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          email: `newuser-${Date.now()}@example.com`,
          role: TENANT_ROLES.STAFF,
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe("GET /api/v1/tenants/:tenantId/users", () => {
    it("should allow all roles to read users list", async () => {
      // TenantOwner
      await request(app)
        .get(`/api/v1/tenants/${tenantOwner.tenant.id}/users`)
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(200);

      // Accountant
      await request(app)
        .get(`/api/v1/tenants/${tenantOwner.tenant.id}/users`)
        .set("Authorization", `Bearer ${accountantToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(200);

      // Staff
      await request(app)
        .get(`/api/v1/tenants/${tenantOwner.tenant.id}/users`)
        .set("Authorization", `Bearer ${staffToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(200);

      // ReadOnly
      await request(app)
        .get(`/api/v1/tenants/${tenantOwner.tenant.id}/users`)
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(200);
    });
  });

  describe("Document operations", () => {
    it("should allow TenantOwner to create documents", async () => {
      // This test would require a file upload, so we'll test the permission check
      // by attempting to access the endpoint
      const response = await request(app)
        .post("/api/v1/documents/upload")
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        // Note: Without actual file, this will fail validation, but should pass permission check
        .expect((res) => {
          // Should not be 403 (forbidden), might be 400 (bad request) due to missing file
          expect(res.status).not.toBe(403);
        });

      // If we get 400, it means permission check passed
      if (response.status === 400) {
        expect(response.body.error).toBeDefined();
      }
    });

    it("should deny ReadOnly user from creating documents", async () => {
      const response = await request(app)
        .post("/api/v1/documents/upload")
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("permission");
    });
  });
});


