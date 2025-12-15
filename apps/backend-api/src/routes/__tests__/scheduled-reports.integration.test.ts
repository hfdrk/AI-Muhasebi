// Import env setup FIRST - must run before any routes/services that use config
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  createTestApp,
  createTestUser,
  getAuthToken,
  createTestClientCompany,
  prisma,
} from "../../test-utils";
import { TENANT_ROLES } from "@repo/core-domain";

describe("Scheduled Reports Routes Integration Tests", () => {
  const app = createTestApp();

  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let authToken: string;
  let otherUser: Awaited<ReturnType<typeof createTestUser>>;
  let company1: Awaited<ReturnType<typeof createTestClientCompany>>;

  beforeEach(async () => {
    // Seed report definitions
    await prisma.reportDefinition.upsert({
      where: { code: "COMPANY_FINANCIAL_SUMMARY" },
      update: { isActive: true },
      create: {
        code: "COMPANY_FINANCIAL_SUMMARY",
        name: "Müşteri Finansal Özeti",
        description: "Test report",
        isActive: true,
      },
    });

    await prisma.reportDefinition.upsert({
      where: { code: "TENANT_PORTFOLIO" },
      update: { isActive: true },
      create: {
        code: "TENANT_PORTFOLIO",
        name: "Kiracı Portföy Raporu",
        description: "Test report",
        isActive: true,
      },
    });
    await prisma.$queryRaw`SELECT 1`;

    // Create test users
    testUser = await createTestUser({
      email: `scheduled-routes-${Date.now()}@example.com`,
    });
    await prisma.$queryRaw`SELECT 1`;

    // Wait for user to be visible
    for (let i = 0; i < 5; i++) {
      await prisma.$queryRaw`SELECT 1`;
      const user = await prisma.user.findUnique({
        where: { id: testUser.user.id },
        include: {
          memberships: {
            where: { status: "active" },
          },
        },
      });
      if (user && user.isActive && user.memberships.length > 0) {
        await prisma.$queryRaw`SELECT 1`;
        await new Promise((resolve) => setTimeout(resolve, 150));
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    authToken = await getAuthToken(testUser.user.email, "Test123!@#", app);

    otherUser = await createTestUser({
      email: `other-scheduled-${Date.now()}@example.com`,
    });
    await prisma.$queryRaw`SELECT 1`;

    for (let i = 0; i < 5; i++) {
      await prisma.$queryRaw`SELECT 1`;
      const user = await prisma.user.findUnique({
        where: { id: otherUser.user.id },
        include: {
          memberships: {
            where: { status: "active" },
          },
        },
      });
      if (user && user.isActive && user.memberships.length > 0) {
        await prisma.$queryRaw`SELECT 1`;
        await new Promise((resolve) => setTimeout(resolve, 150));
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    company1 = await createTestClientCompany({
      tenantId: testUser.tenant.id,
      name: "Test Company for Scheduled Reports",
    });
    await prisma.$queryRaw`SELECT 1`;
  });

  describe("POST /api/v1/scheduled-reports", () => {
    it("should allow TenantOwner to create scheduled report", async () => {
      const response = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Daily Financial Report",
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          client_company_id: company1.id,
          format: "pdf",
          schedule_cron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["test@example.com"],
          is_active: true,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe("Daily Financial Report");
      expect(response.body.data.reportCode).toBe("COMPANY_FINANCIAL_SUMMARY");
    });

    it("should allow Accountant to create scheduled report", async () => {
      const accountantUser = await createTestUser({
        email: `accountant-scheduled-${Date.now()}@example.com`,
        tenantId: testUser.tenant.id,
        role: TENANT_ROLES.ACCOUNTANT,
      });
      await prisma.$queryRaw`SELECT 1`;

      for (let i = 0; i < 5; i++) {
        await prisma.$queryRaw`SELECT 1`;
        const user = await prisma.user.findUnique({
          where: { id: accountantUser.user.id },
          include: {
            memberships: {
              where: { status: "active" },
            },
          },
        });
        if (user && user.isActive && user.memberships.length > 0) {
          await prisma.$queryRaw`SELECT 1`;
          await new Promise((resolve) => setTimeout(resolve, 150));
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const accountantToken = await getAuthToken(accountantUser.user.email, "Test123!@#", app);

      const response = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${accountantToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Weekly Report",
          report_code: "TENANT_PORTFOLIO",
          format: "excel",
          schedule_cron: "weekly",
          filters: {},
          recipients: ["accountant@example.com"],
          is_active: true,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
    });

    it("should reject Staff from creating scheduled report", async () => {
      const staffUser = await createTestUser({
        email: `staff-scheduled-${Date.now()}@example.com`,
        tenantId: testUser.tenant.id,
        role: TENANT_ROLES.STAFF,
      });
      await prisma.$queryRaw`SELECT 1`;

      for (let i = 0; i < 5; i++) {
        await prisma.$queryRaw`SELECT 1`;
        const user = await prisma.user.findUnique({
          where: { id: staffUser.user.id },
          include: {
            memberships: {
              where: { status: "active" },
            },
          },
        });
        if (user && user.isActive && user.memberships.length > 0) {
          await prisma.$queryRaw`SELECT 1`;
          await new Promise((resolve) => setTimeout(resolve, 150));
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const staffToken = await getAuthToken(staffUser.user.email, "Test123!@#", app);

      await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${staffToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Test Report",
          report_code: "TENANT_PORTFOLIO",
          format: "pdf",
          schedule_cron: "daily",
          filters: {},
          recipients: ["staff@example.com"],
          is_active: true,
        })
        .expect(403);
    });

    it("should reject ReadOnly from creating scheduled report", async () => {
      const readOnlyUser = await createTestUser({
        email: `readonly-scheduled-${Date.now()}@example.com`,
        tenantId: testUser.tenant.id,
        role: TENANT_ROLES.READ_ONLY,
      });
      await prisma.$queryRaw`SELECT 1`;

      for (let i = 0; i < 5; i++) {
        await prisma.$queryRaw`SELECT 1`;
        const user = await prisma.user.findUnique({
          where: { id: readOnlyUser.user.id },
          include: {
            memberships: {
              where: { status: "active" },
            },
          },
        });
        if (user && user.isActive && user.memberships.length > 0) {
          await prisma.$queryRaw`SELECT 1`;
          await new Promise((resolve) => setTimeout(resolve, 150));
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const readOnlyToken = await getAuthToken(readOnlyUser.user.email, "Test123!@#", app);

      await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Test Report",
          report_code: "TENANT_PORTFOLIO",
          format: "pdf",
          schedule_cron: "daily",
          filters: {},
          recipients: ["readonly@example.com"],
          is_active: true,
        })
        .expect(403);
    });
  });

  describe("GET /api/v1/scheduled-reports", () => {
    it("should list scheduled reports for tenant", async () => {
      // Create a scheduled report
      const createResponse = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Test Report",
          report_code: "TENANT_PORTFOLIO",
          format: "pdf",
          schedule_cron: "daily",
          filters: {},
          recipients: ["test@example.com"],
          is_active: true,
        })
        .expect(201);

      const reportId = createResponse.body.data.id;

      const response = await request(app)
        .get("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some((r: any) => r.id === reportId)).toBe(true);
    });
  });

  describe("PUT /api/v1/scheduled-reports/:id", () => {
    it("should update scheduled report", async () => {
      const createResponse = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Original Name",
          report_code: "TENANT_PORTFOLIO",
          format: "pdf",
          schedule_cron: "daily",
          filters: {},
          recipients: ["test@example.com"],
          is_active: true,
        })
        .expect(201);

      const reportId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/v1/scheduled-reports/${reportId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Updated Name",
          schedule_cron: "weekly",
        })
        .expect(200);

      expect(response.body.data.name).toBe("Updated Name");
      expect(response.body.data.scheduleCron).toBe("weekly");
    });
  });

  describe("DELETE /api/v1/scheduled-reports/:id", () => {
    it("should deactivate scheduled report", async () => {
      const createResponse = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Test Report",
          report_code: "TENANT_PORTFOLIO",
          format: "pdf",
          schedule_cron: "daily",
          filters: {},
          recipients: ["test@example.com"],
          is_active: true,
        })
        .expect(201);

      const reportId = createResponse.body.data.id;

      await request(app)
        .delete(`/api/v1/scheduled-reports/${reportId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(204);

      // Verify it's deactivated
      const report = await prisma.scheduledReport.findUnique({
        where: { id: reportId },
      });

      expect(report?.isActive).toBe(false);
    });
  });

  describe("Tenant Isolation", () => {
    it("should prevent accessing other tenant's scheduled reports", async () => {
      // Create report for otherUser
      const otherToken = await getAuthToken(otherUser.user.email, "Test123!@#", app);
      const otherCompany = await createTestClientCompany({
        tenantId: otherUser.tenant.id,
        name: "Other Company",
      });
      await prisma.$queryRaw`SELECT 1`;

      const createResponse = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${otherToken}`)
        .set("X-Tenant-Id", otherUser.tenant.id)
        .send({
          name: "Other Tenant Report",
          report_code: "TENANT_PORTFOLIO",
          format: "pdf",
          schedule_cron: "daily",
          filters: {},
          recipients: ["other@example.com"],
          is_active: true,
        })
        .expect(201);

      const otherReportId = createResponse.body.data.id;

      // Try to access from testUser's tenant
      await request(app)
        .get(`/api/v1/scheduled-reports/${otherReportId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(404);
    });
  });
});






