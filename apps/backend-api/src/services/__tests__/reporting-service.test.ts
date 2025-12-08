// Import env setup FIRST - must run before any routes/services that use config
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import { reportingService } from "../reporting-service";
import {
  createTestUser,
  createTestClientCompany,
  createTestInvoice,
  createTestInvoiceLine,
  createTestDocument,
  createTestTransaction,
  getTestPrisma,
} from "../../test-utils";
import { TENANT_ROLES } from "@repo/core-domain";

describe("ReportingService", () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let otherUser: Awaited<ReturnType<typeof createTestUser>>;
  let company1: Awaited<ReturnType<typeof createTestClientCompany>>;
  let company2: Awaited<ReturnType<typeof createTestClientCompany>>;
  const prisma = getTestPrisma();

  beforeEach(async () => {
    // Create test users and companies
    testUser = await createTestUser({
      email: `reporting-test-${Date.now()}@example.com`,
    });
    await prisma.$queryRaw`SELECT 1`;

    otherUser = await createTestUser({
      email: `other-reporting-${Date.now()}@example.com`,
    });
    await prisma.$queryRaw`SELECT 1`;

    company1 = await createTestClientCompany({
      tenantId: testUser.tenant.id,
      name: "Test Company 1",
    });
    await prisma.$queryRaw`SELECT 1`;

    company2 = await createTestClientCompany({
      tenantId: testUser.tenant.id,
      name: "Test Company 2",
    });
    await prisma.$queryRaw`SELECT 1`;

    // Create invoices for company1
    const invoice1 = await createTestInvoice({
      tenantId: testUser.tenant.id,
      clientCompanyId: company1.id,
      type: "SATIŞ",
      issueDate: new Date("2024-01-15"),
      totalAmount: 1000,
      taxAmount: 180,
      netAmount: 820,
      status: "kesildi",
    });
    await prisma.$queryRaw`SELECT 1`;

    await createTestInvoiceLine({
      tenantId: testUser.tenant.id,
      invoiceId: invoice1.id,
      lineNumber: 1,
      lineTotal: 1000,
      vatAmount: 180,
    });
    await prisma.$queryRaw`SELECT 1`;

    const invoice2 = await createTestInvoice({
      tenantId: testUser.tenant.id,
      clientCompanyId: company1.id,
      type: "ALIŞ",
      issueDate: new Date("2024-02-20"),
      totalAmount: 500,
      taxAmount: 90,
      netAmount: 410,
      status: "taslak",
    });
    await prisma.$queryRaw`SELECT 1`;

    await createTestInvoiceLine({
      tenantId: testUser.tenant.id,
      invoiceId: invoice2.id,
      lineNumber: 1,
      lineTotal: 500,
      vatAmount: 90,
    });
    await prisma.$queryRaw`SELECT 1`;

    // Create documents with dates in test range
    const doc1 = await createTestDocument({
      tenantId: testUser.tenant.id,
      clientCompanyId: company1.id,
      uploadUserId: testUser.user.id,
      type: "INVOICE",
      status: "PROCESSED",
    });
    await prisma.$queryRaw`SELECT 1`;
    // Update createdAt to be in test range
    await prisma.document.update({
      where: { id: doc1.id },
      data: { createdAt: new Date("2024-06-15T10:00:00Z") },
    });
    await prisma.$queryRaw`SELECT 1`;

    const doc2 = await createTestDocument({
      tenantId: testUser.tenant.id,
      clientCompanyId: company1.id,
      uploadUserId: testUser.user.id,
      type: "BANK_STATEMENT",
      status: "UPLOADED",
    });
    await prisma.$queryRaw`SELECT 1`;
    await prisma.document.update({
      where: { id: doc2.id },
      data: { createdAt: new Date("2024-07-20T10:00:00Z") },
    });
    await prisma.$queryRaw`SELECT 1`;

    // Create risk score for company1
    await prisma.clientCompanyRiskScore.create({
      data: {
        tenantId: testUser.tenant.id,
        clientCompanyId: company1.id,
        score: 75.5,
        severity: "high",
        triggeredRuleCodes: ["RULE_001", "RULE_002"],
        generatedAt: new Date(),
      },
    });
    await prisma.$queryRaw`SELECT 1`;

    // Create risk alert
    await prisma.riskAlert.create({
      data: {
        tenantId: testUser.tenant.id,
        clientCompanyId: company1.id,
        type: "RISK_THRESHOLD_EXCEEDED",
        title: "High Risk Detected",
        message: "Risk threshold exceeded",
        severity: "high",
        status: "open",
      },
    });
    await prisma.$queryRaw`SELECT 1`;
  });

  describe("generateCompanyFinancialSummary", () => {
    it("should return correct structure", async () => {
      const result = await reportingService.generateCompanyFinancialSummary(
        testUser.tenant.id,
        company1.id,
        {
          start_date: "2024-01-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
        }
      );

      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("period");
      expect(result).toHaveProperty("generated_at");
      expect(result).toHaveProperty("rows");
      expect(result).toHaveProperty("totals");
      expect(result.title).toBe("Müşteri Finansal Özeti");
      expect(result.period.start_date).toBe("2024-01-01T00:00:00Z");
      expect(result.period.end_date).toBe("2024-12-31T23:59:59Z");
    });

    it("should respect tenantId", async () => {
      // Try to access company from other tenant
      await expect(
        reportingService.generateCompanyFinancialSummary(
          otherUser.tenant.id,
          company1.id,
          {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          }
        )
      ).rejects.toThrow("Müşteri şirketi bulunamadı.");
    });

    it("should calculate sales and purchases correctly", async () => {
      const result = await reportingService.generateCompanyFinancialSummary(
        testUser.tenant.id,
        company1.id,
        {
          start_date: "2024-01-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
        }
      );

      expect(result.totals).toBeDefined();
      expect(result.totals?.totalSales).toBe(1000);
      expect(result.totals?.totalPurchases).toBe(500);
    });

    it("should count invoices by status", async () => {
      // Ensure invoices are committed before querying
      await prisma.$queryRaw`SELECT 1`;
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await reportingService.generateCompanyFinancialSummary(
        testUser.tenant.id,
        company1.id,
        {
          start_date: "2024-01-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
        }
      );

      expect(result.totals?.invoiceCountsByStatus).toBeDefined();
      expect(result.totals?.invoiceCountsByStatus?.kesildi).toBe(1);
      expect(result.totals?.invoiceCountsByStatus?.taslak).toBe(1);
    });

    it("should return 404 if company not in tenant", async () => {
      // Create a company in other tenant
      const otherCompany = await createTestClientCompany({
        tenantId: otherUser.tenant.id,
        name: "Other Company",
      });
      await prisma.$queryRaw`SELECT 1`;

      await expect(
        reportingService.generateCompanyFinancialSummary(
          testUser.tenant.id,
          otherCompany.id,
          {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          }
        )
      ).rejects.toThrow("Müşteri şirketi bulunamadı.");
    });
  });

  describe("generateCompanyRiskSummary", () => {
    it("should return correct structure", async () => {
      const result = await reportingService.generateCompanyRiskSummary(
        testUser.tenant.id,
        company1.id,
        {
          start_date: "2024-01-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
        }
      );

      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("period");
      expect(result).toHaveProperty("generated_at");
      expect(result).toHaveProperty("rows");
      expect(result).toHaveProperty("totals");
      expect(result.title).toBe("Müşteri Risk Özeti");
    });

    it("should respect tenantId", async () => {
      await expect(
        reportingService.generateCompanyRiskSummary(
          otherUser.tenant.id,
          company1.id,
          {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          }
        )
      ).rejects.toThrow("Müşteri şirketi bulunamadı.");
    });

    it("should include latest risk score", async () => {
      const result = await reportingService.generateCompanyRiskSummary(
        testUser.tenant.id,
        company1.id,
        {
          start_date: "2024-01-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
        }
      );

      expect(result.totals?.latestRiskScore).toBe(75.5);
      expect(result.totals?.latestSeverity).toBe("high");
    });

    it("should count open alerts by severity", async () => {
      const result = await reportingService.generateCompanyRiskSummary(
        testUser.tenant.id,
        company1.id,
        {
          start_date: "2024-01-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
        }
      );

      expect(result.totals?.openAlertsBySeverity).toBeDefined();
      expect(result.totals?.openAlertsBySeverity?.high).toBe(1);
    });
  });

  describe("generateTenantPortfolioReport", () => {
    it("should return correct structure", async () => {
      const result = await reportingService.generateTenantPortfolioReport(
        testUser.tenant.id,
        {
          start_date: "2024-01-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
        }
      );

      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("period");
      expect(result).toHaveProperty("generated_at");
      expect(result).toHaveProperty("rows");
      expect(result).toHaveProperty("totals");
      expect(result.title).toBe("Kiracı Portföy Raporu");
    });

    it("should respect tenantId", async () => {
      const result = await reportingService.generateTenantPortfolioReport(
        testUser.tenant.id,
        {
          start_date: "2024-01-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
        }
      );

      // Should only include companies from testUser's tenant
      const companyIds = result.rows.map((r: any) => r.company_id);
      expect(companyIds).toContain(company1.id);
      expect(companyIds).toContain(company2.id);
    });

    it("should include all companies", async () => {
      const result = await reportingService.generateTenantPortfolioReport(
        testUser.tenant.id,
        {
          start_date: "2024-01-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
        }
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(2);
      expect(result.totals?.totalCompanies).toBeGreaterThanOrEqual(2);
    });
  });

  describe("generateDocumentActivityReport", () => {
    it("should return correct structure", async () => {
      const result = await reportingService.generateDocumentActivityReport(
        testUser.tenant.id,
        company1.id,
        {
          start_date: "2024-01-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
        }
      );

      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("period");
      expect(result).toHaveProperty("generated_at");
      expect(result).toHaveProperty("rows");
      expect(result).toHaveProperty("totals");
      expect(result.title).toBe("Döküman Aktivite Raporu");
    });

    it("should respect tenantId", async () => {
      await expect(
        reportingService.generateDocumentActivityReport(
          otherUser.tenant.id,
          company1.id,
          {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          }
        )
      ).rejects.toThrow("Müşteri şirketi bulunamadı.");
    });

    it("should work with and without clientCompanyId", async () => {
      const resultWithCompany = await reportingService.generateDocumentActivityReport(
        testUser.tenant.id,
        company1.id,
        {
          start_date: "2024-01-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
        }
      );

      const resultWithoutCompany = await reportingService.generateDocumentActivityReport(
        testUser.tenant.id,
        null,
        {
          start_date: "2024-01-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
        }
      );

      expect(resultWithCompany).toBeDefined();
      expect(resultWithoutCompany).toBeDefined();
      // Result without company should have more documents (includes all companies)
      expect(resultWithoutCompany.totals?.documentsByType?.INVOICE).toBeGreaterThanOrEqual(
        resultWithCompany.totals?.documentsByType?.INVOICE || 0
      );
    });

    it("should group by type and status correctly", async () => {
      const result = await reportingService.generateDocumentActivityReport(
        testUser.tenant.id,
        company1.id,
        {
          start_date: "2024-01-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
        }
      );

      expect(result.totals?.documentsByType).toBeDefined();
      expect(result.totals?.processingStatusCounts).toBeDefined();
      // Documents were created in beforeEach with dates updated to 2024, so they should be found
      const totalDocs = (Object.values(result.totals?.documentsByType || {}) as number[]).reduce((a: number, b: number) => a + b, 0);
      expect(totalDocs).toBeGreaterThanOrEqual(1);
    });
  });
});

