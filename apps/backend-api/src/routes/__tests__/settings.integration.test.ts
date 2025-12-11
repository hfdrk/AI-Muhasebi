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

describe("Settings Integration Tests", () => {
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
    // Create users with different roles
    tenantOwner = await createTestUser({
      email: `owner-${Date.now()}@example.com`,
      role: TENANT_ROLES.TENANT_OWNER,
      tenantName: `Settings Test Tenant ${Date.now()}`,
      tenantSlug: `settings-test-${Date.now()}`,
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
    const prisma = getTestPrisma();
    await prisma.$queryRaw`SELECT 1`;

    // Get tokens
    tenantOwnerToken = await getAuthToken(tenantOwner.user.email, "Test123!@#", app);
    accountantToken = await getAuthToken(accountant.user.email, "Test123!@#", app);
    staffToken = await getAuthToken(staff.user.email, "Test123!@#", app);
    readOnlyToken = await getAuthToken(readOnly.user.email, "Test123!@#", app);
  });

  describe("GET /api/v1/settings/tenant", () => {
    it("should return default tenant settings if none exist", async () => {
      const response = await request(app)
        .get("/api/v1/settings/tenant")
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .expect(200);

      expect(response.body.data).toMatchObject({
        locale: "tr-TR",
        timezone: "Europe/Istanbul",
        riskThresholds: {
          high: 70,
          critical: 90,
        },
        defaultReportPeriod: "LAST_30_DAYS",
      });
    });

    it("should return existing tenant settings", async () => {
      const prisma = getTestPrisma();
      await prisma.tenantSettings.create({
        data: {
          tenantId: tenantOwner.tenant.id,
          displayName: "Test Office",
          locale: "en-US",
          timezone: "UTC",
          riskThresholds: { high: 60, critical: 80 },
          defaultReportPeriod: "LAST_7_DAYS",
        },
      });

      const response = await request(app)
        .get("/api/v1/settings/tenant")
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .expect(200);

      expect(response.body.data).toMatchObject({
        displayName: "Test Office",
        locale: "en-US",
        timezone: "UTC",
        riskThresholds: {
          high: 60,
          critical: 80,
        },
        defaultReportPeriod: "LAST_7_DAYS",
      });
    });
  });

  describe("PUT /api/v1/settings/tenant", () => {
    it("should allow TenantOwner to update settings", async () => {
      const response = await request(app)
        .put("/api/v1/settings/tenant")
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .send({
          displayName: "Updated Office",
          locale: "en-US",
          riskThresholds: { high: 65, critical: 85 },
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        displayName: "Updated Office",
        locale: "en-US",
        riskThresholds: {
          high: 65,
          critical: 85,
        },
      });
    });

    it("should allow Accountant to update settings", async () => {
      const response = await request(app)
        .put("/api/v1/settings/tenant")
        .set("Authorization", `Bearer ${accountantToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .send({
          displayName: "Accountant Updated",
        })
        .expect(200);

      expect(response.body.data.displayName).toBe("Accountant Updated");
    });

    it("should reject Staff from updating settings", async () => {
      await request(app)
        .put("/api/v1/settings/tenant")
        .set("Authorization", `Bearer ${staffToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .send({
          displayName: "Should Fail",
        })
        .expect(403);
    });

    it("should reject ReadOnly from updating settings", async () => {
      await request(app)
        .put("/api/v1/settings/tenant")
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .send({
          displayName: "Should Fail",
        })
        .expect(403);
    });
  });

  describe("GET /api/v1/settings/user", () => {
    it("should return user settings with effective values", async () => {
      const response = await request(app)
        .get("/api/v1/settings/user")
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .expect(200);

      expect(response.body.data).toHaveProperty("userSettings");
      expect(response.body.data).toHaveProperty("effectiveLocale");
      expect(response.body.data).toHaveProperty("effectiveTimezone");
      expect(response.body.data).toHaveProperty("effectiveEmailNotificationsEnabled");
      expect(response.body.data).toHaveProperty("effectiveInAppNotificationsEnabled");
    });
  });

  describe("PUT /api/v1/settings/user", () => {
    it("should allow user to update their own settings", async () => {
      const response = await request(app)
        .put("/api/v1/settings/user")
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .send({
          locale: "en-US",
          timezone: "UTC",
          emailNotificationsEnabled: false,
        })
        .expect(200);

      expect(response.body.data.userSettings).toMatchObject({
        locale: "en-US",
        timezone: "UTC",
        emailNotificationsEnabled: false,
      });
    });

    it("should return effective settings after update", async () => {
      const response = await request(app)
        .put("/api/v1/settings/user")
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .send({
          locale: "en-US",
        })
        .expect(200);

      expect(response.body.data.effectiveLocale).toBe("en-US");
    });
  });

  describe("Tenant Isolation", () => {
    it("should only return settings for current tenant", async () => {
      // Create another tenant
      const otherTenant = await createTestUser({
        email: `other-${Date.now()}@example.com`,
        role: TENANT_ROLES.TENANT_OWNER,
        tenantName: `Other Tenant ${Date.now()}`,
        tenantSlug: `other-${Date.now()}`,
      });

      const otherToken = await getAuthToken(otherTenant.user.email, "Test123!@#", app);

      // Update settings for first tenant
      await request(app)
        .put("/api/v1/settings/tenant")
        .set("Authorization", `Bearer ${tenantOwnerToken}`)
        .set("x-tenant-id", tenantOwner.tenant.id)
        .send({
          displayName: "First Tenant",
        })
        .expect(200);

      // Get settings for second tenant (should not see first tenant's settings)
      const response = await request(app)
        .get("/api/v1/settings/tenant")
        .set("Authorization", `Bearer ${otherToken}`)
        .set("x-tenant-id", otherTenant.tenant.id)
        .expect(200);

      // Should have default or different settings, not "First Tenant"
      expect(response.body.data.displayName).not.toBe("First Tenant");
    });
  });
});




