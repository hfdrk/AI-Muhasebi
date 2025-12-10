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

describe("RBAC User Management Tests", () => {
  const app = createTestApp();

  let tenantOwner: Awaited<ReturnType<typeof createTestUser>>;
  let accountant: Awaited<ReturnType<typeof createTestUser>>;
  let staff: Awaited<ReturnType<typeof createTestUser>>;
  let readOnly: Awaited<ReturnType<typeof createTestUser>>;
  let tenantB: Awaited<ReturnType<typeof createTestUser>>;
  let tenantBUser: Awaited<ReturnType<typeof createTestUser>>;

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

    // Create a separate tenant for isolation tests
    tenantB = await createTestUser({
      email: `tenantb-owner-${Date.now()}@example.com`,
      role: TENANT_ROLES.TENANT_OWNER,
      tenantName: `Tenant B ${Date.now()}`,
      tenantSlug: `tenant-b-${Date.now()}`,
    });

    tenantBUser = await createTestUser({
      email: `tenantb-user-${Date.now()}@example.com`,
      role: TENANT_ROLES.STAFF,
      tenantId: tenantB.tenant.id,
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

  describe("GET /api/v1/tenants/:tenantId/users", () => {
    it("should allow TenantOwner to read users list", async () => {
      const token = await getTokenForUser(tenantOwner.user);
      
      const response = await request(app)
        .get(`/api/v1/tenants/${tenantOwner.tenant.id}/users`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify response format
      const user = response.body.data[0];
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("status");
      expect(user).toHaveProperty("createdAt");
    });

    it("should allow Accountant to read users list", async () => {
      const token = await getTokenForUser(accountant.user);
      
      const response = await request(app)
        .get(`/api/v1/tenants/${tenantOwner.tenant.id}/users`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should allow Staff to read users list", async () => {
      const token = await getTokenForUser(staff.user);
      
      const response = await request(app)
        .get(`/api/v1/tenants/${tenantOwner.tenant.id}/users`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should allow ReadOnly to read users list", async () => {
      const token = await getTokenForUser(readOnly.user);
      
      const response = await request(app)
        .get(`/api/v1/tenants/${tenantOwner.tenant.id}/users`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

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
          name: "Test User",
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBeDefined();
      expect(response.body.data.role).toBe(TENANT_ROLES.STAFF);
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

    it("should deny Staff from inviting users", async () => {
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

    it("should deny ReadOnly from inviting users", async () => {
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
    });
  });

  describe("PATCH /api/v1/tenants/:tenantId/users/:userId/role", () => {
    it("should allow TenantOwner to change user role", async () => {
      const token = await getTokenForUser(tenantOwner.user);
      
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${staff.user.id}/role`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          role: TENANT_ROLES.ACCOUNTANT,
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.message).toBeDefined();
    });

    it("should allow Accountant to change user role", async () => {
      const token = await getTokenForUser(accountant.user);
      
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${staff.user.id}/role`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          role: TENANT_ROLES.READ_ONLY,
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it("should deny Staff from changing user role", async () => {
      const token = await getTokenForUser(staff.user);
      
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${readOnly.user.id}/role`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          role: TENANT_ROLES.STAFF,
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });

    it("should deny ReadOnly from changing user role", async () => {
      const token = await getTokenForUser(readOnly.user);
      
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${staff.user.id}/role`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          role: TENANT_ROLES.ACCOUNTANT,
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });
  });

  describe("PATCH /api/v1/tenants/:tenantId/users/:userId/status", () => {
    it("should allow TenantOwner to suspend user", async () => {
      const token = await getTokenForUser(tenantOwner.user);
      
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${staff.user.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          status: "suspended",
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.message).toBeDefined();
    });

    it("should allow TenantOwner to reactivate user", async () => {
      const token = await getTokenForUser(tenantOwner.user);
      
      // First suspend
      await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${staff.user.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          status: "suspended",
        })
        .expect(200);

      // Then reactivate
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${staff.user.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          status: "active",
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it("should allow Accountant to suspend user", async () => {
      const token = await getTokenForUser(accountant.user);
      
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${staff.user.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          status: "suspended",
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it("should deny Staff from changing user status", async () => {
      const token = await getTokenForUser(staff.user);
      
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${readOnly.user.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          status: "suspended",
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });

    it("should deny ReadOnly from changing user status", async () => {
      const token = await getTokenForUser(readOnly.user);
      
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${staff.user.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          status: "suspended",
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });
  });

  describe("PATCH /api/v1/tenants/:tenantId/users/:userId (unified route)", () => {
    it("should allow TenantOwner to update user role via unified route", async () => {
      const token = await getTokenForUser(tenantOwner.user);
      
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${staff.user.id}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          role: TENANT_ROLES.ACCOUNTANT,
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.message).toBeDefined();
    });

    it("should allow TenantOwner to update user status via unified route", async () => {
      const token = await getTokenForUser(tenantOwner.user);
      
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${staff.user.id}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          status: "suspended",
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.message).toBeDefined();
    });

    it("should allow Accountant to update user via unified route", async () => {
      const token = await getTokenForUser(accountant.user);
      
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${staff.user.id}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          role: TENANT_ROLES.READ_ONLY,
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it("should deny Staff from updating user via unified route", async () => {
      const token = await getTokenForUser(staff.user);
      
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantOwner.tenant.id}/users/${readOnly.user.id}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantOwner.tenant.id)
        .send({
          role: TENANT_ROLES.STAFF,
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe("Tenant Isolation", () => {
    it("should prevent Tenant A user from modifying Tenant B users", async () => {
      const token = await getTokenForUser(tenantOwner.user);
      
      // Try to change role of user in different tenant
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantB.tenant.id}/users/${tenantBUser.user.id}/role`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantB.tenant.id) // Try to access tenant B
        .send({
          role: TENANT_ROLES.ACCOUNTANT,
        })
        .expect(403); // Should be forbidden due to tenant mismatch

      expect(response.body.error).toBeDefined();
    });

    it("should prevent Tenant A user from suspending Tenant B users", async () => {
      const token = await getTokenForUser(tenantOwner.user);
      
      // Try to suspend user in different tenant
      const response = await request(app)
        .patch(`/api/v1/tenants/${tenantB.tenant.id}/users/${tenantBUser.user.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantB.tenant.id) // Try to access tenant B
        .send({
          status: "suspended",
        })
        .expect(403); // Should be forbidden due to tenant mismatch

      expect(response.body.error).toBeDefined();
    });

    it("should prevent Tenant A user from inviting to Tenant B", async () => {
      const token = await getTokenForUser(tenantOwner.user);
      
      // Try to invite user to different tenant
      const response = await request(app)
        .post(`/api/v1/tenants/${tenantB.tenant.id}/users/invite`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Tenant-Id", tenantB.tenant.id) // Try to access tenant B
        .send({
          email: `newuser-${Date.now()}@example.com`,
          role: TENANT_ROLES.STAFF,
        })
        .expect(403); // Should be forbidden due to tenant mismatch

      expect(response.body.error).toBeDefined();
    });
  });
});


