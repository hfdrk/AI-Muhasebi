// Import env setup FIRST - must run before any routes/services that use config
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  createTestApp,
  createTestUser,
  getAuthToken,
  createTestClientCompany,
  createTestInvoice,
  createTestInvoiceLine,
  getTestPrisma,
} from "../../test-utils";
import { TENANT_ROLES } from "@repo/core-domain";

describe("Reporting RBAC Tests", () => {
  const app = createTestApp();
  const prisma = getTestPrisma();

  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let authToken: string;
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

    // Create test user (TenantOwner by default)
    testUser = await createTestUser({
      email: `rbac-reports-${Date.now()}@example.com`,
    });
    await prisma.$queryRaw`SELECT 1`;

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

    // Create test company
    company1 = await createTestClientCompany({
      tenantId: testUser.tenant.id,
      name: "Test Company for RBAC",
    });
    await prisma.$queryRaw`SELECT 1`;

    // Create test invoice
    const invoice = await createTestInvoice({
      tenantId: testUser.tenant.id,
      clientCompanyId: company1.id,
      type: "SATIŞ",
      issueDate: new Date("2024-06-15"),
      totalAmount: 2000,
      taxAmount: 360,
      netAmount: 1640,
      status: "kesildi",
    });
    await prisma.$queryRaw`SELECT 1`;

    await createTestInvoiceLine({
      tenantId: testUser.tenant.id,
      invoiceId: invoice.id,
      lineNumber: 1,
      lineTotal: 2000,
      vatAmount: 360,
    });
    await prisma.$queryRaw`SELECT 1`;
  });

  describe("Report Generation RBAC", () => {
    it("should allow TenantOwner to generate on-demand reports", async () => {
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it("should allow Accountant to generate on-demand reports", async () => {
      const accountantUser = await createTestUser({
        email: `accountant-rbac-${Date.now()}@example.com`,
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
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${accountantToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it("should allow Staff to generate on-demand reports", async () => {
      const staffUser = await createTestUser({
        email: `staff-rbac-${Date.now()}@example.com`,
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

      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${staffToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it("should allow ReadOnly to generate on-demand reports", async () => {
      const readOnlyUser = await createTestUser({
        email: `readonly-rbac-${Date.now()}@example.com`,
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

      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe("Report Download RBAC", () => {
    it("should allow TenantOwner to download reports", async () => {
      const response = await request(app)
        .post("/api/v1/reports/download")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          format: "pdf",
        })
        .expect(200);

      expect(response.headers["content-type"]).toContain("application/pdf");
    });

    it("should allow Accountant to download reports", async () => {
      const accountantUser = await createTestUser({
        email: `accountant-download-rbac-${Date.now()}@example.com`,
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
        .post("/api/v1/reports/download")
        .set("Authorization", `Bearer ${accountantToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          format: "pdf",
        })
        .expect(200);

      expect(response.headers["content-type"]).toContain("application/pdf");
    });

    it("should allow Staff to download reports", async () => {
      const staffUser = await createTestUser({
        email: `staff-download-rbac-${Date.now()}@example.com`,
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

      const response = await request(app)
        .post("/api/v1/reports/download")
        .set("Authorization", `Bearer ${staffToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          format: "pdf",
        })
        .expect(200);

      expect(response.headers["content-type"]).toContain("application/pdf");
    });

    it("should allow ReadOnly to download reports", async () => {
      const readOnlyUser = await createTestUser({
        email: `readonly-download-rbac-${Date.now()}@example.com`,
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

      const response = await request(app)
        .post("/api/v1/reports/download")
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          format: "pdf",
        })
        .expect(200);

      expect(response.headers["content-type"]).toContain("application/pdf");
    });
  });

  describe("Scheduled Reports RBAC", () => {
    it("should allow TenantOwner to create scheduled reports", async () => {
      const response = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "TenantOwner Scheduled Report",
          report_code: "TENANT_PORTFOLIO",
          format: "pdf",
          schedule_cron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["owner@example.com"],
          is_active: true,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe("TenantOwner Scheduled Report");
    });

    it("should allow Accountant to create scheduled reports", async () => {
      const accountantUser = await createTestUser({
        email: `accountant-scheduled-rbac-${Date.now()}@example.com`,
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
          name: "Accountant Scheduled Report",
          report_code: "TENANT_PORTFOLIO",
          format: "pdf",
          schedule_cron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["accountant@example.com"],
          is_active: true,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
    });

    it("should prevent Staff from creating scheduled reports (403)", async () => {
      const staffUser = await createTestUser({
        email: `staff-scheduled-rbac-${Date.now()}@example.com`,
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

      const response = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${staffToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Staff Scheduled Report",
          report_code: "TENANT_PORTFOLIO",
          format: "pdf",
          schedule_cron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["staff@example.com"],
          is_active: true,
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it("should prevent ReadOnly from creating scheduled reports (403)", async () => {
      const readOnlyUser = await createTestUser({
        email: `readonly-scheduled-rbac-${Date.now()}@example.com`,
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

      const response = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "ReadOnly Scheduled Report",
          report_code: "TENANT_PORTFOLIO",
          format: "pdf",
          schedule_cron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["readonly@example.com"],
          is_active: true,
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it("should allow TenantOwner to update scheduled reports", async () => {
      // Create a scheduled report first
      const createResponse = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Original Name",
          report_code: "TENANT_PORTFOLIO",
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

      const reportId = createResponse.body.data.id;

      // Update it
      const updateResponse = await request(app)
        .put(`/api/v1/scheduled-reports/${reportId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Updated Name",
        })
        .expect(200);

      expect(updateResponse.body.data.name).toBe("Updated Name");
    });

    it("should allow Accountant to update scheduled reports", async () => {
      const accountantUser = await createTestUser({
        email: `accountant-update-rbac-${Date.now()}@example.com`,
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

      // Create a scheduled report
      const createResponse = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${accountantToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Accountant Report",
          report_code: "TENANT_PORTFOLIO",
          format: "pdf",
          schedule_cron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["accountant@example.com"],
          is_active: true,
        })
        .expect(201);

      const reportId = createResponse.body.data.id;

      // Update it
      const updateResponse = await request(app)
        .put(`/api/v1/scheduled-reports/${reportId}`)
        .set("Authorization", `Bearer ${accountantToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Updated Accountant Report",
        })
        .expect(200);

      expect(updateResponse.body.data.name).toBe("Updated Accountant Report");
    });

    it("should prevent Staff from updating scheduled reports (403)", async () => {
      // Create a scheduled report as TenantOwner
      const createResponse = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Staff Update Test",
          report_code: "TENANT_PORTFOLIO",
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

      const reportId = createResponse.body.data.id;

      // Create Staff user
      const staffUser = await createTestUser({
        email: `staff-update-rbac-${Date.now()}@example.com`,
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

      // Try to update as Staff
      const response = await request(app)
        .put(`/api/v1/scheduled-reports/${reportId}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Hacked Name",
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it("should prevent ReadOnly from updating scheduled reports (403)", async () => {
      // Create a scheduled report as TenantOwner
      const createResponse = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "ReadOnly Update Test",
          report_code: "TENANT_PORTFOLIO",
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

      const reportId = createResponse.body.data.id;

      // Create ReadOnly user
      const readOnlyUser = await createTestUser({
        email: `readonly-update-rbac-${Date.now()}@example.com`,
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

      // Try to update as ReadOnly
      const response = await request(app)
        .put(`/api/v1/scheduled-reports/${reportId}`)
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Hacked Name",
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it("should allow TenantOwner to delete scheduled reports", async () => {
      // Create a scheduled report
      const createResponse = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Delete Test Report",
          report_code: "TENANT_PORTFOLIO",
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

      const reportId = createResponse.body.data.id;

      // Delete it
      await request(app)
        .delete(`/api/v1/scheduled-reports/${reportId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(204);

      // Verify it's deleted
      const verifyResponse = await request(app)
        .get(`/api/v1/scheduled-reports/${reportId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(404);
    });

    it("should prevent Staff from deleting scheduled reports (403)", async () => {
      // Create a scheduled report as TenantOwner
      const createResponse = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Staff Delete Test",
          report_code: "TENANT_PORTFOLIO",
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

      const reportId = createResponse.body.data.id;

      // Create Staff user
      const staffUser = await createTestUser({
        email: `staff-delete-rbac-${Date.now()}@example.com`,
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

      // Try to delete as Staff
      const response = await request(app)
        .delete(`/api/v1/scheduled-reports/${reportId}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it("should prevent ReadOnly from deleting scheduled reports (403)", async () => {
      // Create a scheduled report as TenantOwner
      const createResponse = await request(app)
        .post("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "ReadOnly Delete Test",
          report_code: "TENANT_PORTFOLIO",
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

      const reportId = createResponse.body.data.id;

      // Create ReadOnly user
      const readOnlyUser = await createTestUser({
        email: `readonly-delete-rbac-${Date.now()}@example.com`,
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

      // Try to delete as ReadOnly
      const response = await request(app)
        .delete(`/api/v1/scheduled-reports/${reportId}`)
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });
});

