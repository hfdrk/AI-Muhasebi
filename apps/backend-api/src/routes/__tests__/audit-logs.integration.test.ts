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

describe("Audit Logs Integration Tests", () => {
  const app = createTestApp();
  const prisma = getTestPrisma();

  let tenantOwner: Awaited<ReturnType<typeof createTestUser>>;
  let accountant: Awaited<ReturnType<typeof createTestUser>>;
  let staff: Awaited<ReturnType<typeof createTestUser>>;
  let readOnly: Awaited<ReturnType<typeof createTestUser>>;
  let tenantOwnerToken: string;
  let accountantToken: string;
  let staffToken: string;
  let readOnlyToken: string;

  beforeEach(async () => {
    // Create users with different roles
    tenantOwner = await createTestUser({
      email: `owner-${Date.now()}@example.com`,
      role: TENANT_ROLES.TENANT_OWNER,
      tenantName: `Audit Test Tenant ${Date.now()}`,
      tenantSlug: `audit-test-${Date.now()}`,
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

    // Ensure users are visible
    await prisma.$queryRaw`SELECT 1`;

    // Get tokens
    tenantOwnerToken = await getAuthToken(tenantOwner.user.email, "Test123!@#", app);
    accountantToken = await getAuthToken(accountant.user.email, "Test123!@#", app);
    staffToken = await getAuthToken(staff.user.email, "Test123!@#", app);
    readOnlyToken = await getAuthToken(readOnly.user.email, "Test123!@#", app);

    // Create some test audit logs
    await prisma.auditLog.createMany({
      data: [
        {
          tenantId: tenantOwner.tenant.id,
          userId: tenantOwner.user.id,
          action: "LOGIN_SUCCESS",
          resourceType: "User",
          resourceId: tenantOwner.user.id,
          ipAddress: "192.168.1.1",
        },
        {
          tenantId: tenantOwner.tenant.id,
          userId: accountant.user.id,
          action: "DOCUMENT_UPLOADED",
          resourceType: "Document",
          resourceId: "doc-123",
          ipAddress: "192.168.1.2",
        },
        {
          tenantId: tenantOwner.tenant.id,
          userId: staff.user.id,
          action: "INVOICE_CREATED",
          resourceType: "Invoice",
          resourceId: "inv-456",
          ipAddress: "192.168.1.3",
        },
      ],
    });

    await prisma.$queryRaw`SELECT 1`;
  });

  describe("GET /api/v1/audit-logs", () => {
    it("should allow TenantOwner to view audit logs", async () => {
      const response = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.total).toBeGreaterThan(0);
    });

    it("should allow Accountant to view audit logs", async () => {
      const response = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${accountantToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should reject Staff from viewing audit logs", async () => {
      await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${staffToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .expect(403);
    });

    it("should reject ReadOnly from viewing audit logs", async () => {
      await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .expect(403);
    });

    it("should filter by user_id", async () => {
      const response = await request(app)
        .get("/api/v1/audit-logs")
        .query({ user_id: tenantOwner.user.id })
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((log: any) => {
        expect(log.user?.id).toBe(tenantOwner.user.id);
      });
    });

    it("should filter by action", async () => {
      const response = await request(app)
        .get("/api/v1/audit-logs")
        .query({ action: "LOGIN_SUCCESS" })
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((log: any) => {
        expect(log.action).toContain("LOGIN_SUCCESS");
      });
    });

    it("should filter by resource_type", async () => {
      const response = await request(app)
        .get("/api/v1/audit-logs")
        .query({ resource_type: "Document" })
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((log: any) => {
        expect(log.resourceType).toBe("Document");
      });
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/api/v1/audit-logs")
        .query({ page: 1, pageSize: 2 })
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.pageSize).toBe(2);
      expect(response.body.meta.totalPages).toBeDefined();
    });

    it("should include user information in response", async () => {
      const response = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .expect(200);

      const logWithUser = response.body.data.find((log: any) => log.user !== null);
      if (logWithUser) {
        expect(logWithUser.user).toHaveProperty("id");
        expect(logWithUser.user).toHaveProperty("name");
        expect(logWithUser.user).toHaveProperty("email");
      }
    });
  });

  describe("Tenant Isolation", () => {
    it("should only return audit logs for current tenant", async () => {
      // Create another tenant with audit logs
      const otherTenant = await createTestUser({
        email: `other-${Date.now()}@example.com`,
        role: TENANT_ROLES.TENANT_OWNER,
        tenantName: `Other Tenant ${Date.now()}`,
        tenantSlug: `other-${Date.now()}`,
      });

      const otherToken = await getAuthToken(otherTenant.user.email, "Test123!@#", app);

      // Create audit log for other tenant
      await prisma.auditLog.create({
        data: {
          tenantId: otherTenant.tenant.id,
          userId: otherTenant.user.id,
          action: "OTHER_TENANT_ACTION",
          resourceType: "Other",
          resourceId: "other-123",
        },
      });

      await prisma.$queryRaw`SELECT 1`;

      // Get audit logs for first tenant
      const response = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .expect(200);

      // Should not see other tenant's logs
      const otherTenantLogs = response.body.data.filter(
        (log: any) => log.action === "OTHER_TENANT_ACTION"
      );
      expect(otherTenantLogs.length).toBe(0);
    });

    it("should not allow cross-tenant access", async () => {
      // Create another tenant
      const otherTenant = await createTestUser({
        email: `other2-${Date.now()}@example.com`,
        role: TENANT_ROLES.TENANT_OWNER,
        tenantName: `Other Tenant 2 ${Date.now()}`,
        tenantSlug: `other2-${Date.now()}`,
      });

      // Try to access other tenant's audit logs with first tenant's token
      // This should return 401 because user is not a member of the other tenant
      const response = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", otherTenant.tenant.id)
        .expect(401); // Should fail because user is not a member of other tenant

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("erişim yetkiniz yok");
    });
  });
});


