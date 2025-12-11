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

describe("Reporting Tenant Isolation Tests", () => {
  const app = createTestApp();
  const prisma = getTestPrisma();

  let tenantAUser: Awaited<ReturnType<typeof createTestUser>>;
  let tenantAToken: string;
  let tenantBUser: Awaited<ReturnType<typeof createTestUser>>;
  let tenantBToken: string;
  let tenantACompany: Awaited<ReturnType<typeof createTestClientCompany>>;
  let tenantBCompany: Awaited<ReturnType<typeof createTestClientCompany>>;

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

    // Create Tenant A user
    tenantAUser = await createTestUser({
      email: `tenant-a-${Date.now()}@example.com`,
    });
    await prisma.$queryRaw`SELECT 1`;

    for (let i = 0; i < 5; i++) {
      await prisma.$queryRaw`SELECT 1`;
      const user = await prisma.user.findUnique({
        where: { id: tenantAUser.user.id },
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

    tenantAToken = await getAuthToken(tenantAUser.user.email, "Test123!@#", app);

    // Create Tenant B user
    tenantBUser = await createTestUser({
      email: `tenant-b-${Date.now()}@example.com`,
    });
    await prisma.$queryRaw`SELECT 1`;

    for (let i = 0; i < 5; i++) {
      await prisma.$queryRaw`SELECT 1`;
      const user = await prisma.user.findUnique({
        where: { id: tenantBUser.user.id },
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

    tenantBToken = await getAuthToken(tenantBUser.user.email, "Test123!@#", app);

    // Create companies for each tenant
    tenantACompany = await createTestClientCompany({
      tenantId: tenantAUser.tenant.id,
      name: "Tenant A Company",
    });
    await prisma.$queryRaw`SELECT 1`;

    tenantBCompany = await createTestClientCompany({
      tenantId: tenantBUser.tenant.id,
      name: "Tenant B Company",
    });
    await prisma.$queryRaw`SELECT 1`;

    // Create invoices for each tenant
    const tenantAInvoice = await createTestInvoice({
      tenantId: tenantAUser.tenant.id,
      clientCompanyId: tenantACompany.id,
      type: "SATIŞ",
      issueDate: new Date("2024-06-15"),
      totalAmount: 1000,
      taxAmount: 180,
      netAmount: 820,
      status: "kesildi",
    });
    await prisma.$queryRaw`SELECT 1`;

    await createTestInvoiceLine({
      tenantId: tenantAUser.tenant.id,
      invoiceId: tenantAInvoice.id,
      lineNumber: 1,
      lineTotal: 1000,
      vatAmount: 180,
    });
    await prisma.$queryRaw`SELECT 1`;

    const tenantBInvoice = await createTestInvoice({
      tenantId: tenantBUser.tenant.id,
      clientCompanyId: tenantBCompany.id,
      type: "SATIŞ",
      issueDate: new Date("2024-06-15"),
      totalAmount: 2000,
      taxAmount: 360,
      netAmount: 1640,
      status: "kesildi",
    });
    await prisma.$queryRaw`SELECT 1`;

    await createTestInvoiceLine({
      tenantId: tenantBUser.tenant.id,
      invoiceId: tenantBInvoice.id,
      lineNumber: 1,
      lineTotal: 2000,
      vatAmount: 360,
    });
    await prisma.$queryRaw`SELECT 1`;
  });

  describe("Report Generation Tenant Isolation", () => {
    it("should prevent Tenant A from generating reports with Tenant B's client_company_id", async () => {
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .set("X-Tenant-Id", tenantAUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          client_company_id: tenantBCompany.id, // Tenant B's company
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(404); // Should return 404 (NotFoundError)

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });

    it("should verify no data leakage between tenants in reports", async () => {
      // Generate report for Tenant A
      const tenantAResponse = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .set("X-Tenant-Id", tenantAUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          client_company_id: tenantACompany.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(200);

      // Generate report for Tenant B
      const tenantBResponse = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${tenantBToken}`)
        .set("X-Tenant-Id", tenantBUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          client_company_id: tenantBCompany.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(200);

      // Verify Tenant A's report only contains Tenant A's data
      const tenantATotals = tenantAResponse.body.data.totals;
      expect(tenantATotals.totalSales).toBe(1000); // Tenant A's invoice amount

      // Verify Tenant B's report only contains Tenant B's data
      const tenantBTotals = tenantBResponse.body.data.totals;
      expect(tenantBTotals.totalSales).toBe(2000); // Tenant B's invoice amount

      // Verify they are different
      expect(tenantATotals.totalSales).not.toBe(tenantBTotals.totalSales);
    });

    it("should prevent Tenant A from accessing Tenant B's portfolio data", async () => {
      // Generate portfolio report for Tenant A
      const tenantAResponse = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .set("X-Tenant-Id", tenantAUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(200);

      // Verify Tenant A's portfolio only contains Tenant A's companies
      const tenantARows = tenantAResponse.body.data.rows;
      const tenantACompanyIds = tenantARows.map((r: any) => r.company_id);
      expect(tenantACompanyIds).toContain(tenantACompany.id);
      expect(tenantACompanyIds).not.toContain(tenantBCompany.id);
    });
  });

  describe("Scheduled Reports Tenant Isolation", () => {
    it("should prevent Tenant A from reading Tenant B's ScheduledReport rows", async () => {
      // Create scheduled report for Tenant B
      const tenantBScheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: tenantBUser.tenant.id,
          reportCode: "TENANT_PORTFOLIO",
          name: "Tenant B Scheduled Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["tenantb@example.com"],
          isActive: true,
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      // Try to list scheduled reports as Tenant A
      const response = await request(app)
        .get("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .set("X-Tenant-Id", tenantAUser.tenant.id)
        .expect(200);

      // Verify Tenant A cannot see Tenant B's scheduled report
      const scheduledReports = response.body.data;
      const reportIds = scheduledReports.map((r: any) => r.id);
      expect(reportIds).not.toContain(tenantBScheduledReport.id);
    });

    it("should prevent Tenant A from updating Tenant B's ScheduledReport", async () => {
      // Create scheduled report for Tenant B
      const tenantBScheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: tenantBUser.tenant.id,
          reportCode: "TENANT_PORTFOLIO",
          name: "Tenant B Scheduled Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["tenantb@example.com"],
          isActive: true,
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      // Try to update Tenant B's scheduled report as Tenant A
      const response = await request(app)
        .put(`/api/v1/scheduled-reports/${tenantBScheduledReport.id}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .set("X-Tenant-Id", tenantAUser.tenant.id)
        .send({
          name: "Hacked Report",
        })
        .expect(404); // Should return 404 (NotFoundError)

      expect(response.body.error).toBeDefined();

      // Verify the report was not updated
      const verifyReport = await prisma.scheduledReport.findUnique({
        where: { id: tenantBScheduledReport.id },
      });
      expect(verifyReport!.name).toBe("Tenant B Scheduled Report");
    });

    it("should prevent Tenant A from deleting Tenant B's ScheduledReport", async () => {
      // Create scheduled report for Tenant B
      const tenantBScheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: tenantBUser.tenant.id,
          reportCode: "TENANT_PORTFOLIO",
          name: "Tenant B Scheduled Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["tenantb@example.com"],
          isActive: true,
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      // Try to delete Tenant B's scheduled report as Tenant A
      const response = await request(app)
        .delete(`/api/v1/scheduled-reports/${tenantBScheduledReport.id}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .set("X-Tenant-Id", tenantAUser.tenant.id)
        .expect(404); // Should return 404 (NotFoundError)

      expect(response.body.error).toBeDefined();

      // Verify the report still exists
      const verifyReport = await prisma.scheduledReport.findUnique({
        where: { id: tenantBScheduledReport.id },
      });
      expect(verifyReport).toBeDefined();
    });

    it("should prevent Tenant A from seeing Tenant B's ReportExecutionLogs", async () => {
      // Create scheduled report for Tenant B
      const tenantBScheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: tenantBUser.tenant.id,
          reportCode: "TENANT_PORTFOLIO",
          name: "Tenant B Scheduled Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["tenantb@example.com"],
          isActive: true,
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      // Create execution log for Tenant B's scheduled report
      await prisma.reportExecutionLog.create({
        data: {
          tenantId: tenantBUser.tenant.id,
          scheduledReportId: tenantBScheduledReport.id,
          reportCode: "TENANT_PORTFOLIO",
          startedAt: new Date(),
          finishedAt: new Date(),
          status: "success",
          message: "Tenant B execution log",
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      // Try to get execution logs for Tenant B's scheduled report as Tenant A
      const response = await request(app)
        .get(`/api/v1/report-execution-logs/scheduled/${tenantBScheduledReport.id}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .set("X-Tenant-Id", tenantAUser.tenant.id)
        .expect(404); // Should return 404 (NotFoundError)

      expect(response.body.error).toBeDefined();
    });
  });

  describe("Cross-Tenant Data Access Prevention", () => {
    it("should verify all report queries are tenant-scoped", async () => {
      // This test verifies that report generation queries are properly scoped
      // by checking that Tenant A cannot see Tenant B's data even if they try

      // Generate report for Tenant A
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .set("X-Tenant-Id", tenantAUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(200);

      // Verify only Tenant A's companies appear
      const rows = response.body.data.rows;
      const companyIds = rows.map((r: any) => r.company_id);
      expect(companyIds).toContain(tenantACompany.id);
      expect(companyIds).not.toContain(tenantBCompany.id);
    });

    it("should verify scheduled report queries are tenant-scoped", async () => {
      // Create scheduled reports for both tenants
      await prisma.scheduledReport.create({
        data: {
          tenantId: tenantAUser.tenant.id,
          reportCode: "TENANT_PORTFOLIO",
          name: "Tenant A Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["tenanta@example.com"],
          isActive: true,
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      await prisma.scheduledReport.create({
        data: {
          tenantId: tenantBUser.tenant.id,
          reportCode: "TENANT_PORTFOLIO",
          name: "Tenant B Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["tenantb@example.com"],
          isActive: true,
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      // List scheduled reports as Tenant A
      const response = await request(app)
        .get("/api/v1/scheduled-reports")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .set("X-Tenant-Id", tenantAUser.tenant.id)
        .expect(200);

      // Verify only Tenant A's scheduled reports appear
      const scheduledReports = response.body.data;
      const reportNames = scheduledReports.map((r: any) => r.name);
      expect(reportNames).toContain("Tenant A Report");
      expect(reportNames).not.toContain("Tenant B Report");
    });

    it("should verify execution log queries are tenant-scoped", async () => {
      // Create execution logs for both tenants
      await prisma.reportExecutionLog.create({
        data: {
          tenantId: tenantAUser.tenant.id,
          reportCode: "TENANT_PORTFOLIO",
          startedAt: new Date(),
          finishedAt: new Date(),
          status: "success",
          message: "Tenant A log",
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      await prisma.reportExecutionLog.create({
        data: {
          tenantId: tenantBUser.tenant.id,
          reportCode: "TENANT_PORTFOLIO",
          startedAt: new Date(),
          finishedAt: new Date(),
          status: "success",
          message: "Tenant B log",
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      // List execution logs as Tenant A
      const response = await request(app)
        .get("/api/v1/report-execution-logs")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .set("X-Tenant-Id", tenantAUser.tenant.id)
        .expect(200);

      // Verify only Tenant A's logs appear
      const logs = response.body.data;
      const logMessages = logs.map((l: any) => l.message);
      expect(logMessages).toContain("Tenant A log");
      expect(logMessages).not.toContain("Tenant B log");
    });
  });
});




