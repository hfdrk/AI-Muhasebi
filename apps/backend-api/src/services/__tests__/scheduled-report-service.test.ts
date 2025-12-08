// Import env setup FIRST - must run before any routes/services that use config
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import { scheduledReportService } from "../scheduled-report-service";
import {
  createTestUser,
  createTestClientCompany,
  prisma,
} from "../../test-utils";

describe("ScheduledReportService", () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
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
      email: `scheduled-report-test-${Date.now()}@example.com`,
    });
    await prisma.$queryRaw`SELECT 1`;

    otherUser = await createTestUser({
      email: `other-scheduled-${Date.now()}@example.com`,
    });
    await prisma.$queryRaw`SELECT 1`;

    company1 = await createTestClientCompany({
      tenantId: testUser.tenant.id,
      name: "Test Company for Scheduled Reports",
    });
    await prisma.$queryRaw`SELECT 1`;
  });

  describe("createScheduledReport", () => {
    it("should create a scheduled report with valid data", async () => {
      const report = await scheduledReportService.createScheduledReport({
        tenantId: testUser.tenant.id,
        createdByUserId: testUser.user.id,
        reportCode: "COMPANY_FINANCIAL_SUMMARY",
        clientCompanyId: company1.id,
        name: "Test Scheduled Report",
        format: "pdf",
        scheduleCron: "daily",
        filters: { start_date: "2024-01-01T00:00:00Z", end_date: "2024-12-31T23:59:59Z" },
        recipients: ["test@example.com"],
        isActive: true,
      });

      expect(report).toBeDefined();
      expect(report.name).toBe("Test Scheduled Report");
      expect(report.reportCode).toBe("COMPANY_FINANCIAL_SUMMARY");
      expect(report.format).toBe("pdf");
      expect(report.scheduleCron).toBe("daily");
      expect(report.tenantId).toBe(testUser.tenant.id);
    });

    it("should throw ValidationError for invalid report code", async () => {
      await expect(
        scheduledReportService.createScheduledReport({
          tenantId: testUser.tenant.id,
          createdByUserId: testUser.user.id,
          reportCode: "INVALID_REPORT",
          name: "Test Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {},
          recipients: ["test@example.com"],
          isActive: true,
        })
      ).rejects.toThrow("Geçersiz rapor kodu");
    });

    it("should throw NotFoundError for client company from different tenant", async () => {
      const otherCompany = await createTestClientCompany({
        tenantId: otherUser.tenant.id,
        name: "Other Tenant Company",
      });
      await prisma.$queryRaw`SELECT 1`;

      await expect(
        scheduledReportService.createScheduledReport({
          tenantId: testUser.tenant.id,
          createdByUserId: testUser.user.id,
          reportCode: "COMPANY_FINANCIAL_SUMMARY",
          clientCompanyId: otherCompany.id,
          name: "Test Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {},
          recipients: ["test@example.com"],
          isActive: true,
        })
      ).rejects.toThrow("Müşteri şirketi bulunamadı");
    });

    it("should validate recipients array", async () => {
      await expect(
        scheduledReportService.createScheduledReport({
          tenantId: testUser.tenant.id,
          createdByUserId: testUser.user.id,
          reportCode: "TENANT_PORTFOLIO",
          name: "Test Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {},
          recipients: [],
          isActive: true,
        })
      ).rejects.toThrow("En az bir alıcı e-posta adresi gerekli");
    });
  });

  describe("listScheduledReports", () => {
    it("should return only scheduled reports for the tenant", async () => {
      // Create report for testUser
      await scheduledReportService.createScheduledReport({
        tenantId: testUser.tenant.id,
        createdByUserId: testUser.user.id,
        reportCode: "TENANT_PORTFOLIO",
        name: "Test Report 1",
        format: "pdf",
        scheduleCron: "daily",
        filters: {},
        recipients: ["test@example.com"],
        isActive: true,
      });

      // Create report for otherUser
      await scheduledReportService.createScheduledReport({
        tenantId: otherUser.tenant.id,
        createdByUserId: otherUser.user.id,
        reportCode: "TENANT_PORTFOLIO",
        name: "Other Tenant Report",
        format: "pdf",
        scheduleCron: "daily",
        filters: {},
        recipients: ["other@example.com"],
        isActive: true,
      });

      const reports = await scheduledReportService.listScheduledReports(testUser.tenant.id);

      expect(reports.length).toBe(1);
      expect(reports[0].name).toBe("Test Report 1");
      expect(reports[0].tenantId).toBe(testUser.tenant.id);
    });
  });

  describe("getScheduledReportById", () => {
    it("should return scheduled report for correct tenant", async () => {
      const created = await scheduledReportService.createScheduledReport({
        tenantId: testUser.tenant.id,
        createdByUserId: testUser.user.id,
        reportCode: "TENANT_PORTFOLIO",
        name: "Test Report",
        format: "pdf",
        scheduleCron: "daily",
        filters: {},
        recipients: ["test@example.com"],
        isActive: true,
      });

      const report = await scheduledReportService.getScheduledReportById(
        created.id,
        testUser.tenant.id
      );

      expect(report).toBeDefined();
      expect(report.id).toBe(created.id);
    });

    it("should throw NotFoundError for report from different tenant", async () => {
      const created = await scheduledReportService.createScheduledReport({
        tenantId: otherUser.tenant.id,
        createdByUserId: otherUser.user.id,
        reportCode: "TENANT_PORTFOLIO",
        name: "Other Report",
        format: "pdf",
        scheduleCron: "daily",
        filters: {},
        recipients: ["other@example.com"],
        isActive: true,
      });

      await expect(
        scheduledReportService.getScheduledReportById(created.id, testUser.tenant.id)
      ).rejects.toThrow("Zamanlanmış rapor bulunamadı");
    });
  });

  describe("updateScheduledReport", () => {
    it("should update scheduled report", async () => {
      const created = await scheduledReportService.createScheduledReport({
        tenantId: testUser.tenant.id,
        createdByUserId: testUser.user.id,
        reportCode: "TENANT_PORTFOLIO",
        name: "Original Name",
        format: "pdf",
        scheduleCron: "daily",
        filters: {},
        recipients: ["test@example.com"],
        isActive: true,
      });

      const updated = await scheduledReportService.updateScheduledReport(
        created.id,
        testUser.tenant.id,
        {
          name: "Updated Name",
          scheduleCron: "weekly",
        }
      );

      expect(updated.name).toBe("Updated Name");
      expect(updated.scheduleCron).toBe("weekly");
    });
  });

  describe("deactivateScheduledReport", () => {
    it("should deactivate scheduled report", async () => {
      const created = await scheduledReportService.createScheduledReport({
        tenantId: testUser.tenant.id,
        createdByUserId: testUser.user.id,
        reportCode: "TENANT_PORTFOLIO",
        name: "Test Report",
        format: "pdf",
        scheduleCron: "daily",
        filters: {},
        recipients: ["test@example.com"],
        isActive: true,
      });

      await scheduledReportService.deactivateScheduledReport(created.id, testUser.tenant.id);

      const report = await prisma.scheduledReport.findUnique({
        where: { id: created.id },
      });

      expect(report?.isActive).toBe(false);
    });
  });

  describe("listExecutionLogsForScheduledReport", () => {
    it("should return execution logs for scheduled report", async () => {
      const created = await scheduledReportService.createScheduledReport({
        tenantId: testUser.tenant.id,
        createdByUserId: testUser.user.id,
        reportCode: "TENANT_PORTFOLIO",
        name: "Test Report",
        format: "pdf",
        scheduleCron: "daily",
        filters: {},
        recipients: ["test@example.com"],
        isActive: true,
      });

      // Create execution log
      await prisma.reportExecutionLog.create({
        data: {
          tenantId: testUser.tenant.id,
          scheduledReportId: created.id,
          reportCode: "TENANT_PORTFOLIO",
          startedAt: new Date(),
          status: "success",
          message: "Test log",
        },
      });

      const logs = await scheduledReportService.listExecutionLogsForScheduledReport(
        testUser.tenant.id,
        created.id
      );

      expect(logs.length).toBe(1);
      expect(logs[0].scheduledReportId).toBe(created.id);
    });
  });

  describe("listRecentExecutionLogsForTenant", () => {
    it("should return recent execution logs for tenant", async () => {
      // Create execution logs
      await prisma.reportExecutionLog.create({
        data: {
          tenantId: testUser.tenant.id,
          reportCode: "TENANT_PORTFOLIO",
          startedAt: new Date(),
          status: "success",
          message: "Log 1",
        },
      });

      await prisma.reportExecutionLog.create({
        data: {
          tenantId: testUser.tenant.id,
          reportCode: "COMPANY_FINANCIAL_SUMMARY",
          startedAt: new Date(),
          status: "failed",
          message: "Log 2",
        },
      });

      const logs = await scheduledReportService.listRecentExecutionLogsForTenant(
        testUser.tenant.id,
        10
      );

      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs[0].tenantId).toBe(testUser.tenant.id);
    });
  });
});


