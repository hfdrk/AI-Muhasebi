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
import { TENANT_ROLES, PLATFORM_ROLES } from "@repo/core-domain";

describe("Admin Console Integration Tests", () => {
  const app = createTestApp();

  let platformAdmin: Awaited<ReturnType<typeof createTestUser>>;
  let platformAdminToken: string;
  let tenantOwner: Awaited<ReturnType<typeof createTestUser>>;
  let tenantOwnerToken: string;
  let accountant: Awaited<ReturnType<typeof createTestUser>>;
  let accountantToken: string;
  let staff: Awaited<ReturnType<typeof createTestUser>>;
  let staffToken: string;
  let readOnly: Awaited<ReturnType<typeof createTestUser>>;
  let readOnlyToken: string;

  beforeEach(async () => {
    const prisma = getTestPrisma();

    // Create platform admin user
    const adminUser = await createTestUser({
      email: `platform-admin-${Date.now()}@example.com`,
      role: TENANT_ROLES.TENANT_OWNER,
      tenantName: `Admin Tenant ${Date.now()}`,
      tenantSlug: `admin-tenant-${Date.now()}`,
    });

    // Update user to have platform admin role
    await prisma.user.update({
      where: { id: adminUser.user.id },
      data: { platformRole: PLATFORM_ROLES.PLATFORM_ADMIN },
    });

    platformAdmin = adminUser;

    // Create tenant-only users
    tenantOwner = await createTestUser({
      email: `tenant-owner-${Date.now()}@example.com`,
      role: TENANT_ROLES.TENANT_OWNER,
      tenantName: `Test Tenant ${Date.now()}`,
      tenantSlug: `test-tenant-${Date.now()}`,
    });

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

    // Wait for users to be visible
    await prisma.$queryRaw`SELECT 1`;
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Get auth tokens
    platformAdminToken = await getAuthToken(platformAdmin.user.email, "Test123!@#", app);
    tenantOwnerToken = await getAuthToken(tenantOwner.user.email, "Test123!@#", app);
    accountantToken = await getAuthToken(accountant.user.email, "Test123!@#", app);
    staffToken = await getAuthToken(staff.user.email, "Test123!@#", app);
    readOnlyToken = await getAuthToken(readOnly.user.email, "Test123!@#", app);
  });

  describe("Platform Admin Access", () => {
    it("should allow platform admin to access admin endpoints", async () => {
      const response = await request(app)
        .get("/api/v1/admin/tenants")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should allow platform admin to get platform metrics", async () => {
      const response = await request(app)
        .get("/api/v1/admin/metrics/overview")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.total_tenants).toBeDefined();
      expect(response.body.data.active_tenants).toBeDefined();
      expect(response.body.data.total_users).toBeDefined();
    });
  });

  describe("Tenant-Only User Access Denied", () => {
    it("should deny TenantOwner access to admin endpoints", async () => {
      await request(app)
        .get("/api/v1/admin/tenants")
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .expect(403);
    });

    it("should deny Accountant access to admin endpoints", async () => {
      await request(app)
        .get("/api/v1/admin/tenants")
        .set("Authorization", `Bearer ${accountantToken}`)
        .expect(403);
    });

    it("should deny Staff access to admin endpoints", async () => {
      await request(app)
        .get("/api/v1/admin/tenants")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(403);
    });

    it("should deny ReadOnly access to admin endpoints", async () => {
      await request(app)
        .get("/api/v1/admin/tenants")
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .expect(403);
    });
  });

  describe("GET /api/v1/admin/tenants", () => {
    it("should return paginated list of tenants with stats", async () => {
      const response = await request(app)
        .get("/api/v1/admin/tenants")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.pagination).toBeDefined();

      if (response.body.data.length > 0) {
        const tenant = response.body.data[0];
        expect(tenant.id).toBeDefined();
        expect(tenant.name).toBeDefined();
        expect(tenant.slug).toBeDefined();
        expect(tenant.status).toBeDefined();
        expect(tenant.userCount).toBeDefined();
        expect(tenant.clientCompanyCount).toBeDefined();
      }
    });

    it("should filter tenants by status", async () => {
      const prisma = getTestPrisma();
      
      // Create a suspended tenant
      const suspendedTenant = await createTestUser({
        email: `suspended-${Date.now()}@example.com`,
        tenantName: `Suspended Tenant ${Date.now()}`,
        tenantSlug: `suspended-${Date.now()}`,
      });

      await prisma.tenant.update({
        where: { id: suspendedTenant.tenant.id },
        data: { status: "SUSPENDED" },
      });

      await prisma.$queryRaw`SELECT 1`;
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app)
        .get("/api/v1/admin/tenants?status=SUSPENDED")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      // All returned tenants should be suspended
      response.body.data.forEach((tenant: any) => {
        expect(tenant.status).toBe("SUSPENDED");
      });
    });
  });

  describe("GET /api/v1/admin/tenants/:tenantId", () => {
    it("should return detailed tenant info", async () => {
      const response = await request(app)
        .get(`/api/v1/admin/tenants/${tenantOwner.tenant.id}`)
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(tenantOwner.tenant.id);
      expect(response.body.data.name).toBeDefined();
      expect(response.body.data.quotaUsage).toBeDefined();
      expect(response.body.data.recentRiskAlertsCount).toBeDefined();
      expect(response.body.data.recentFailedIntegrationsCount).toBeDefined();
    });

    it("should log ADMIN_TENANT_VIEWED audit event", async () => {
      const prisma = getTestPrisma();
      
      await request(app)
        .get(`/api/v1/admin/tenants/${tenantOwner.tenant.id}`)
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      // Check audit log
      await prisma.$queryRaw`SELECT 1`;
      await new Promise((resolve) => setTimeout(resolve, 200));

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: "ADMIN_TENANT_VIEWED",
          userId: platformAdmin.user.id,
          tenantId: tenantOwner.tenant.id,
        },
        orderBy: { createdAt: "desc" },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe("ADMIN_TENANT_VIEWED");
    });
  });

  describe("PATCH /api/v1/admin/tenants/:tenantId/status", () => {
    it("should update tenant status to SUSPENDED", async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/tenants/${tenantOwner.tenant.id}/status`)
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({ status: "SUSPENDED" })
        .expect(200);

      expect(response.body.data.status).toBe("SUSPENDED");
      expect(response.body.message).toBeDefined();
    });

    it("should update tenant status to ACTIVE", async () => {
      const prisma = getTestPrisma();
      
      // First suspend it
      await prisma.tenant.update({
        where: { id: tenantOwner.tenant.id },
        data: { status: "SUSPENDED" },
      });

      await prisma.$queryRaw`SELECT 1`;
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app)
        .patch(`/api/v1/admin/tenants/${tenantOwner.tenant.id}/status`)
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({ status: "ACTIVE" })
        .expect(200);

      expect(response.body.data.status).toBe("ACTIVE");
    });

    it("should log TENANT_SUSPEND audit event", async () => {
      const prisma = getTestPrisma();

      await request(app)
        .patch(`/api/v1/admin/tenants/${tenantOwner.tenant.id}/status`)
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({ status: "SUSPENDED" })
        .expect(200);

      await prisma.$queryRaw`SELECT 1`;
      await new Promise((resolve) => setTimeout(resolve, 200));

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: "TENANT_SUSPEND",
          userId: platformAdmin.user.id,
          tenantId: tenantOwner.tenant.id,
        },
        orderBy: { createdAt: "desc" },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe("TENANT_SUSPEND");
    });
  });

  describe("GET /api/v1/admin/users", () => {
    it("should return paginated list of users", async () => {
      const response = await request(app)
        .get("/api/v1/admin/users")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.pagination).toBeDefined();

      if (response.body.data.length > 0) {
        const user = response.body.data[0];
        expect(user.id).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.platformRoles).toBeDefined();
        expect(user.tenantMemberships).toBeDefined();
      }
    });

    it("should filter users by email", async () => {
      const response = await request(app)
        .get(`/api/v1/admin/users?email=${platformAdmin.user.email}`)
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      // Should find the platform admin user
      const found = response.body.data.find((u: any) => u.email === platformAdmin.user.email);
      expect(found).toBeDefined();
    });
  });

  describe("GET /api/v1/admin/support/incidents", () => {
    it("should return support incidents", async () => {
      const response = await request(app)
        .get("/api/v1/admin/support/incidents")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.pagination).toBeDefined();
    });
  });

  describe("POST /api/v1/admin/impersonation/start", () => {
    it("should create impersonation token", async () => {
      const response = await request(app)
        .post("/api/v1/admin/impersonation/start")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({
          targetUserId: tenantOwner.user.id,
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.impersonationToken).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();
      expect(response.body.data.targetUser).toBeDefined();
      expect(response.body.data.targetUser.id).toBe(tenantOwner.user.id);
    });

    it("should log IMPERSONATION_START audit event", async () => {
      const prisma = getTestPrisma();

      await request(app)
        .post("/api/v1/admin/impersonation/start")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({
          targetUserId: tenantOwner.user.id,
        })
        .expect(200);

      await prisma.$queryRaw`SELECT 1`;
      await new Promise((resolve) => setTimeout(resolve, 200));

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: "IMPERSONATION_START",
          userId: platformAdmin.user.id,
        },
        orderBy: { createdAt: "desc" },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe("IMPERSONATION_START");
      expect(auditLog?.metadata).toBeDefined();
      const metadata = auditLog?.metadata as any;
      expect(metadata.impersonatorId).toBe(platformAdmin.user.id);
      expect(metadata.targetUserId).toBe(tenantOwner.user.id);
    });

    it("should work with targetUserEmail", async () => {
      const response = await request(app)
        .post("/api/v1/admin/impersonation/start")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({
          targetUserEmail: tenantOwner.user.email,
        })
        .expect(200);

      expect(response.body.data.impersonationToken).toBeDefined();
      expect(response.body.data.targetUser.id).toBe(tenantOwner.user.id);
    });
  });

  describe("POST /api/v1/admin/impersonation/stop", () => {
    it("should allow stopping impersonation", async () => {
      const prisma = getTestPrisma();

      // First start impersonation
      const startResponse = await request(app)
        .post("/api/v1/admin/impersonation/start")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({
          targetUserId: tenantOwner.user.id,
        })
        .expect(200);

      expect(startResponse.body.data.impersonationToken).toBeDefined();

      // Stop impersonation using the original platform admin token
      // (The stop endpoint is a no-op API that just acknowledges the stop)
      const stopResponse = await request(app)
        .post("/api/v1/admin/impersonation/stop")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(stopResponse.body.data.message).toBeDefined();

      // Verify IMPERSONATION_START was logged
      await prisma.$queryRaw`SELECT 1`;
      await new Promise((resolve) => setTimeout(resolve, 200));

      const startAuditLog = await prisma.auditLog.findFirst({
        where: {
          action: "IMPERSONATION_START",
          userId: platformAdmin.user.id,
        },
        orderBy: { createdAt: "desc" },
      });

      expect(startAuditLog).toBeDefined();
      expect(startAuditLog?.action).toBe("IMPERSONATION_START");
    });
  });
});

