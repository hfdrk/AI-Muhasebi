// Import env setup FIRST
import "../../../backend-api/src/test-utils/env-setup.js";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "../../lib/prisma";
import { emailService } from "../../services/email-service";

// Mock the email service
vi.mock("../../services/email-service", () => ({
  emailService: {
    sendEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock dynamic imports by creating a testable version
vi.mock("../../../backend-api/src/services/reporting-service", () => ({
  reportingService: {
    generateCompanyFinancialSummary: vi.fn().mockResolvedValue({
      title: "Test Report",
      period: { start_date: "2024-01-01T00:00:00Z", end_date: "2024-12-31T23:59:59Z" },
      generated_at: new Date().toISOString(),
      rows: [],
      totals: {},
    }),
    generateCompanyRiskSummary: vi.fn().mockResolvedValue({
      title: "Test Report",
      period: { start_date: "2024-01-01T00:00:00Z", end_date: "2024-12-31T23:59:59Z" },
      generated_at: new Date().toISOString(),
      rows: [],
      totals: {},
    }),
    generateTenantPortfolioReport: vi.fn().mockResolvedValue({
      title: "Test Report",
      period: { start_date: "2024-01-01T00:00:00Z", end_date: "2024-12-31T23:59:59Z" },
      generated_at: new Date().toISOString(),
      rows: [],
      totals: {},
    }),
    generateDocumentActivityReport: vi.fn().mockResolvedValue({
      title: "Test Report",
      period: { start_date: "2024-01-01T00:00:00Z", end_date: "2024-12-31T23:59:59Z" },
      generated_at: new Date().toISOString(),
      rows: [],
      totals: {},
    }),
  },
}));

vi.mock("../../../backend-api/src/services/export-service", () => ({
  exportService: {
    exportToPdf: vi.fn().mockResolvedValue(Buffer.from("fake pdf content")),
    exportToExcel: vi.fn().mockResolvedValue(Buffer.from("fake csv content")),
  },
}));

// Import after mocks
import { scheduledReportRunner } from "../scheduled-report-runner";

describe("ScheduledReportRunner", () => {
  let testTenantId: string;
  let testScheduledReportId: string;
  let testCompanyId: string;

  beforeEach(async () => {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: "Test Tenant",
        slug: `test-tenant-${Date.now()}`,
      },
    });
    testTenantId = tenant.id;

    // Create test company
    const company = await prisma.clientCompany.create({
      data: {
        tenantId: testTenantId,
        name: "Test Company",
        taxNumber: `test-tax-${Date.now()}`,
        legalType: "Limited",
        isActive: true,
      },
    });
    testCompanyId = company.id;

    // Create report definitions
    await prisma.reportDefinition.upsert({
      where: { code: "TENANT_PORTFOLIO" },
      update: { isActive: true },
      create: {
        code: "TENANT_PORTFOLIO",
        name: "Test Report",
        description: "Test",
        isActive: true,
      },
    });

    await prisma.reportDefinition.upsert({
      where: { code: "COMPANY_FINANCIAL_SUMMARY" },
      update: { isActive: true },
      create: {
        code: "COMPANY_FINANCIAL_SUMMARY",
        name: "Financial Summary",
        description: "Test",
        isActive: true,
      },
    });

    // Reset email service mock
    vi.mocked(emailService.sendEmail).mockClear();
  });

  afterEach(async () => {
    // Cleanup
    await prisma.reportExecutionLog.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.scheduledReport.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.clientCompany.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.tenant.delete({
      where: { id: testTenantId },
    });
  });

  describe("Due Report Detection", () => {
    it("should pick daily schedule with lastRunAt in past (>= 1 day)", async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "TENANT_PORTFOLIO",
          name: "Daily Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["test@example.com"],
          isActive: true,
          lastRunAt: twoDaysAgo, // Run 2 days ago, should be due
        },
      });

      await scheduledReportRunner.runOnce();

      // Verify execution log was created
      const logs = await prisma.reportExecutionLog.findMany({
        where: { scheduledReportId: scheduledReport.id },
      });
      expect(logs.length).toBeGreaterThan(0);
    });

    it("should pick weekly schedule with lastRunAt 8 days ago (>= 7 days)", async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "TENANT_PORTFOLIO",
          name: "Weekly Report",
          format: "pdf",
          scheduleCron: "weekly",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["test@example.com"],
          isActive: true,
          lastRunAt: eightDaysAgo, // Run 8 days ago, should be due
        },
      });

      await scheduledReportRunner.runOnce();

      const logs = await prisma.reportExecutionLog.findMany({
        where: { scheduledReportId: scheduledReport.id },
      });
      expect(logs.length).toBeGreaterThan(0);
    });

    it("should pick monthly schedule with lastRunAt 31 days ago (>= 30 days)", async () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "TENANT_PORTFOLIO",
          name: "Monthly Report",
          format: "pdf",
          scheduleCron: "monthly",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["test@example.com"],
          isActive: true,
          lastRunAt: thirtyOneDaysAgo, // Run 31 days ago, should be due
        },
      });

      await scheduledReportRunner.runOnce();

      const logs = await prisma.reportExecutionLog.findMany({
        where: { scheduledReportId: scheduledReport.id },
      });
      expect(logs.length).toBeGreaterThan(0);
    });

    it("should NOT pick report with lastRunAt today", async () => {
      const today = new Date();

      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "TENANT_PORTFOLIO",
          name: "Today Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["test@example.com"],
          isActive: true,
          lastRunAt: today, // Run today, should NOT be due
        },
      });

      await scheduledReportRunner.runOnce();

      const logs = await prisma.reportExecutionLog.findMany({
        where: { scheduledReportId: scheduledReport.id },
      });
      expect(logs.length).toBe(0);
    });

    it("should prevent duplicate runs within the same minute", async () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000); // 30 seconds ago

      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "TENANT_PORTFOLIO",
          name: "Recent Run Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["test@example.com"],
          isActive: true,
          lastRunAt: thirtySecondsAgo, // Run 30 seconds ago, should NOT be due (needs 60+ seconds)
        },
      });

      await scheduledReportRunner.runOnce();

      const logs = await prisma.reportExecutionLog.findMany({
        where: { scheduledReportId: scheduledReport.id },
      });
      expect(logs.length).toBe(0); // Should not run again
    });

    it("should pick report that has never been run (lastRunAt is null)", async () => {
      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "TENANT_PORTFOLIO",
          name: "Never Run Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["test@example.com"],
          isActive: true,
          lastRunAt: null, // Never run, should be due
        },
      });

      await scheduledReportRunner.runOnce();

      const logs = await prisma.reportExecutionLog.findMany({
        where: { scheduledReportId: scheduledReport.id },
      });
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe("ReportExecutionLog Creation", () => {
    it("should create log with status='success' on successful run", async () => {
      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "TENANT_PORTFOLIO",
          name: "Success Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["test@example.com"],
          isActive: true,
          lastRunAt: null,
        },
      });

      await scheduledReportRunner.runOnce();

      const logs = await prisma.reportExecutionLog.findMany({
        where: { scheduledReportId: scheduledReport.id },
      });
      expect(logs.length).toBe(1);
      const log = logs[0];
      expect(log.status).toBe("success");
      expect(log.startedAt).toBeDefined();
      expect(log.finishedAt).toBeDefined();
      expect(log.reportCode).toBe("TENANT_PORTFOLIO");
      expect(log.message).toContain("başarıyla");
    });

    it("should create log with status='failed' when ReportingService throws", async () => {
      // Mock ReportingService to throw
      const { reportingService } = await import("../../../backend-api/src/services/reporting-service");
      vi.mocked(reportingService.generateTenantPortfolioReport).mockRejectedValueOnce(
        new Error("Reporting service error")
      );

      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "TENANT_PORTFOLIO",
          name: "Failed Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["test@example.com"],
          isActive: true,
          lastRunAt: null,
        },
      });

      await scheduledReportRunner.runOnce();

      const logs = await prisma.reportExecutionLog.findMany({
        where: { scheduledReportId: scheduledReport.id },
      });
      expect(logs.length).toBe(1);
      const log = logs[0];
      expect(log.status).toBe("failed");
      expect(log.startedAt).toBeDefined();
      expect(log.finishedAt).toBeDefined();
      expect(log.message).toBeDefined();
      expect(log.message).not.toContain("stack"); // No stack trace
      expect(log.message!.length).toBeLessThanOrEqual(200); // Safe message length
    });
  });

  describe("ScheduledReport Updates", () => {
    it("should update lastRunAt and lastRunStatus='success' after successful run", async () => {
      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "TENANT_PORTFOLIO",
          name: "Update Test Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["test@example.com"],
          isActive: true,
          lastRunAt: null,
          lastRunStatus: null,
        },
      });

      await scheduledReportRunner.runOnce();

      const updated = await prisma.scheduledReport.findUnique({
        where: { id: scheduledReport.id },
      });
      expect(updated).toBeDefined();
      expect(updated!.lastRunAt).toBeDefined();
      expect(updated!.lastRunStatus).toBe("success");
    });

    it("should update lastRunAt and lastRunStatus='failed' when error occurs", async () => {
      // Mock ExportService to throw
      const { exportService } = await import("../../../backend-api/src/services/export-service");
      vi.mocked(exportService.exportToPdf).mockRejectedValueOnce(new Error("Export service error"));

      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "TENANT_PORTFOLIO",
          name: "Failed Update Test",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["test@example.com"],
          isActive: true,
          lastRunAt: null,
          lastRunStatus: null,
        },
      });

      await scheduledReportRunner.runOnce();

      const updated = await prisma.scheduledReport.findUnique({
        where: { id: scheduledReport.id },
      });
      expect(updated).toBeDefined();
      expect(updated!.lastRunAt).toBeDefined();
      expect(updated!.lastRunStatus).toBe("failed");
    });
  });

  describe("Error Handling", () => {
    it("should log failed execution for invalid filters JSON", async () => {
      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "TENANT_PORTFOLIO",
          name: "Invalid Filters Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: "invalid json string", // Invalid JSON
          recipients: ["test@example.com"],
          isActive: true,
          lastRunAt: null,
        },
      });

      await scheduledReportRunner.runOnce();

      const logs = await prisma.reportExecutionLog.findMany({
        where: { scheduledReportId: scheduledReport.id },
      });
      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe("failed");
      expect(logs[0].message).toBe("Geçersiz filtre yapılandırması.");

      const updatedReport = await prisma.scheduledReport.findUnique({
        where: { id: scheduledReport.id },
      });
      expect(updatedReport?.lastRunStatus).toBe("failed");
    });

    it("should log failed execution for missing report definition", async () => {
      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "NONEXISTENT_REPORT", // Report definition doesn't exist
          name: "Missing Definition Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["test@example.com"],
          isActive: true,
          lastRunAt: null,
        },
      });

      await scheduledReportRunner.runOnce();

      const logs = await prisma.reportExecutionLog.findMany({
        where: { scheduledReportId: scheduledReport.id },
      });
      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe("failed");
      expect(logs[0].message).toBe("Rapor tanımı bulunamadı.");

      const updatedReport = await prisma.scheduledReport.findUnique({
        where: { id: scheduledReport.id },
      });
      expect(updatedReport?.lastRunStatus).toBe("failed");
    });

    it("should handle EmailService errors gracefully", async () => {
      // Mock EmailService to throw
      vi.mocked(emailService.sendEmail).mockRejectedValueOnce(new Error("Email service error"));

      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "TENANT_PORTFOLIO",
          name: "Email Error Test",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients: ["test@example.com"],
          isActive: true,
          lastRunAt: null,
        },
      });

      await scheduledReportRunner.runOnce();

      const logs = await prisma.reportExecutionLog.findMany({
        where: { scheduledReportId: scheduledReport.id },
      });
      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe("failed");
      expect(logs[0].message).toBeDefined();
      expect(logs[0].message).not.toContain("stack");
    });
  });

  describe("EmailService Calls", () => {
    it("should call sendEmail with correct recipients", async () => {
      const recipients = ["test1@example.com", "test2@example.com"];

      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          tenantId: testTenantId,
          reportCode: "TENANT_PORTFOLIO",
          name: "Email Test Report",
          format: "pdf",
          scheduleCron: "daily",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          recipients,
          isActive: true,
          lastRunAt: null,
        },
      });

      await scheduledReportRunner.runOnce();

      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(emailService.sendEmail).mock.calls[0][0];
      expect(callArgs.to).toEqual(recipients);
      expect(callArgs.subject).toBeDefined();
      expect(callArgs.body).toBeDefined();
      expect(callArgs.attachments).toBeDefined();
      expect(callArgs.attachments!.length).toBe(1);
      expect(callArgs.attachments![0].filename).toBeDefined();
      expect(callArgs.attachments![0].content).toBeInstanceOf(Buffer);
      expect(callArgs.attachments![0].contentType).toBe("application/pdf");
    });
  });
});
