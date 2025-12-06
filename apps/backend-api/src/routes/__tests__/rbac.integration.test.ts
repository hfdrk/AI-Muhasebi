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

describe("RBAC Integration Tests", () => {
  const app = createTestApp();

  let tenantOwner: Awaited<ReturnType<typeof createTestUser>>;
  let accountant: Awaited<ReturnType<typeof createTestUser>>;
  let staff: Awaited<ReturnType<typeof createTestUser>>;
  let readOnly: Awaited<ReturnType<typeof createTestUser>>;

  beforeEach(async () => {
    // Create users with different roles in the same tenant
    const baseTenant = await createTestUser({
      email: `owner-${Date.now()}@example.com`,
      role: TENANT_ROLES.TENANT_OWNER,
      tenantName: `RBAC Test Tenant ${Date.now()}`,
      tenantSlug: `rbac-test-${Date.now()}`,
    });

    tenantOwner = baseTenant;

    // Create other users in the same tenant
    accountant = await createTestUser({
      email: `accountant-${Date.now()}@example.com`,
      role: TENANT_ROLES.ACCOUNTANT,
      tenantId: tenantOwner.tenant.id,
    });

    staff = await createTestUser({
      email: `staff-${Date.now()}@example.com`,
      role: TENANT_ROLES.STAFF,
      tenantId: tenantOwner.tenant.id,
    });

    readOnly = await createTestUser({
      email: `readonly-${Date.now()}@example.com`,
      role: TENANT_ROLES.READ_ONLY,
      tenantId: tenantOwner.tenant.id,
    });
    
    // Ensure all users are visible
    const prisma = getTestPrisma();
    await prisma.$queryRaw`SELECT 1`;
  });

  // Helper function to get token with retry
  async function getTokenForUser(user: typeof tenantOwner.user): Promise<string> {
    const prisma = getTestPrisma();
    // Wait for user to be visible with active membership (as required by auth service)
    for (let i = 0; i < 15; i++) {
      await prisma.$queryRaw`SELECT 1`;
      const found = await prisma.user.findUnique({ 
        where: { email: user.email },
        include: {
          memberships: {
            where: { status: "active" },
          },
        },
      });
      if (found && found.isActive && found.memberships.length > 0) {
        // User exists, is active, and has active membership - ready for login
        await prisma.$queryRaw`SELECT 1`;
        // Additional delay to ensure everything is committed
        await new Promise((resolve) => setTimeout(resolve, 200));
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    // getAuthToken already has retry logic, but let's ensure user is visible
    return await getAuthToken(user.email, "Test123!@#", app);
  }

  describe("POST /api/v1/tenants/:tenantId/users/invite", () => {
    it("should allow TenantOwner to invite users", async () => {
      const token = await getTokenForUser(tenantOwner.user);
      
      const response = await request(app)
        .post(`/api/v1/tenants/${tenantOwner.tenant.id}/users/invite`)
        .set("Authorization", `Bearer ${token}`)
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
      const token = await getTokenForUser(accountant.user);
      
      const response = await request(app)
        .post(`/api/v1/tenants/${tenantOwner.tenant.id}/users/invite`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          email: `newuser-${Date.now()}@example.com`,
          role: TENANT_ROLES.STAFF,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
    });

    it("should deny ReadOnly user from inviting users", async () => {
      const token = await getTokenForUser(readOnly.user);
      
      const response = await request(app)
        .post(`/api/v1/tenants/${tenantOwner.tenant.id}/users/invite`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          email: `newuser-${Date.now()}@example.com`,
          role: TENANT_ROLES.STAFF,
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
      // Error message is in Turkish: "Bu işlemi yapmak için yetkiniz yok."
    });

    it("should deny Staff user from inviting users", async () => {
      const token = await getTokenForUser(staff.user);
      
      const response = await request(app)
        .post(`/api/v1/tenants/${tenantOwner.tenant.id}/users/invite`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          email: `newuser-${Date.now()}@example.com`,
          role: TENANT_ROLES.STAFF,
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });
  });

  describe("GET /api/v1/tenants/:tenantId/users", () => {
    it("should allow all roles to read users list", async () => {
      const ownerToken = await getTokenForUser(tenantOwner.user);
      const accToken = await getTokenForUser(accountant.user);
      const stfToken = await getTokenForUser(staff.user);
      const roToken = await getTokenForUser(readOnly.user);
      
      // TenantOwner
      await request(app)
        .get(`/api/v1/tenants/${tenantOwner.tenant.id}/users`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(200);

      // Accountant
      await request(app)
        .get(`/api/v1/tenants/${tenantOwner.tenant.id}/users`)
        .set("Authorization", `Bearer ${accToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(200);

      // Staff
      await request(app)
        .get(`/api/v1/tenants/${tenantOwner.tenant.id}/users`)
        .set("Authorization", `Bearer ${stfToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(200);

      // ReadOnly
      await request(app)
        .get(`/api/v1/tenants/${tenantOwner.tenant.id}/users`)
        .set("Authorization", `Bearer ${roToken}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(200);
    });
  });

  describe("Document operations", () => {
    it("should allow TenantOwner to create documents", async () => {
      const token = await getTokenForUser(tenantOwner.user);
      
      // This test would require a file upload, so we'll test the permission check
      // by attempting to access the endpoint
      const response = await request(app)
        .post("/api/v1/documents/upload")
        .set("Authorization", `Bearer ${token}`)
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
      const token = await getTokenForUser(readOnly.user);
      
      const response = await request(app)
        .post("/api/v1/documents/upload")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
      // Error message is in Turkish: "Bu işlemi yapmak için yetkiniz yok."
    });
  });
});


