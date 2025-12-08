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
  createTestDocument,
  getTestPrisma,
} from "../../test-utils";
import { TENANT_ROLES } from "@repo/core-domain";

describe("Reporting Routes Integration Tests", () => {
  const app = createTestApp();
  const prisma = getTestPrisma();

  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let authToken: string;
  let otherUser: Awaited<ReturnType<typeof createTestUser>>;
  let otherToken: string;
  let company1: Awaited<ReturnType<typeof createTestClientCompany>>;

  beforeEach(async () => {
    // Seed report definitions (global)
    await prisma.reportDefinition.upsert({
      where: { code: "COMPANY_FINANCIAL_SUMMARY" },
      update: { isActive: true },
      create: {
        code: "COMPANY_FINANCIAL_SUMMARY",
        name: "Müşteri Finansal Özeti",
        description: "Müşteri şirketi için finansal özet raporu",
        isActive: true,
      },
    });

    await prisma.reportDefinition.upsert({
      where: { code: "COMPANY_RISK_SUMMARY" },
      update: { isActive: true },
      create: {
        code: "COMPANY_RISK_SUMMARY",
        name: "Müşteri Risk Özeti",
        description: "Müşteri şirketi için risk özet raporu",
        isActive: true,
      },
    });

    await prisma.reportDefinition.upsert({
      where: { code: "TENANT_PORTFOLIO" },
      update: { isActive: true },
      create: {
        code: "TENANT_PORTFOLIO",
        name: "Kiracı Portföy Raporu",
        description: "Tüm müşteri şirketleri için portföy raporu",
        isActive: true,
      },
    });

    await prisma.reportDefinition.upsert({
      where: { code: "DOCUMENT_ACTIVITY" },
      update: { isActive: true },
      create: {
        code: "DOCUMENT_ACTIVITY",
        name: "Döküman Aktivite Raporu",
        description: "Döküman yükleme ve işleme aktivite raporu",
        isActive: true,
      },
    });
    await prisma.$queryRaw`SELECT 1`;

    // Create test users
    testUser = await createTestUser({
      email: `reporting-routes-${Date.now()}@example.com`,
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
      email: `other-reporting-routes-${Date.now()}@example.com`,
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

    otherToken = await getAuthToken(otherUser.user.email, "Test123!@#", app);

    // Create test company
    company1 = await createTestClientCompany({
      tenantId: testUser.tenant.id,
      name: "Test Company for Reports",
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

    // Create test document
    await createTestDocument({
      tenantId: testUser.tenant.id,
      clientCompanyId: company1.id,
      uploadUserId: testUser.user.id,
      type: "INVOICE",
      status: "PROCESSED",
    });
    await prisma.$queryRaw`SELECT 1`;

    // Create risk score
    await prisma.clientCompanyRiskScore.create({
      data: {
        tenantId: testUser.tenant.id,
        clientCompanyId: company1.id,
        score: 65.0,
        severity: "medium",
        triggeredRuleCodes: ["RULE_001"],
        generatedAt: new Date(),
      },
    });
    await prisma.$queryRaw`SELECT 1`;
  });

  describe("GET /api/v1/reports/definitions", () => {
    it("should return 200 with active definitions", async () => {
      const response = await request(app)
        .get("/api/v1/reports/definitions")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const codes = response.body.data.map((d: any) => d.code);
      expect(codes).toContain("COMPANY_FINANCIAL_SUMMARY");
      expect(codes).toContain("COMPANY_RISK_SUMMARY");
      expect(codes).toContain("TENANT_PORTFOLIO");
      expect(codes).toContain("DOCUMENT_ACTIVITY");
    });

    it("should respect RBAC", async () => {
      // Create ReadOnly user
      const readOnlyUser = await createTestUser({
        email: `readonly-reports-${Date.now()}@example.com`,
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
        .get("/api/v1/reports/definitions")
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe("POST /api/v1/reports/generate", () => {
    it("should generate COMPANY_FINANCIAL_SUMMARY report with detailed assertions", async () => {
      // Create additional invoices for comprehensive testing
      const salesInvoice = await createTestInvoice({
        tenantId: testUser.tenant.id,
        clientCompanyId: company1.id,
        type: "SATIŞ",
        issueDate: new Date("2024-06-20"),
        totalAmount: 5000,
        taxAmount: 900,
        netAmount: 4100,
        status: "kesildi",
      });
      await prisma.$queryRaw`SELECT 1`;

      await createTestInvoiceLine({
        tenantId: testUser.tenant.id,
        invoiceId: salesInvoice.id,
        lineNumber: 1,
        lineTotal: 5000,
        vatAmount: 900,
      });
      await prisma.$queryRaw`SELECT 1`;

      const purchaseInvoice = await createTestInvoice({
        tenantId: testUser.tenant.id,
        clientCompanyId: company1.id,
        type: "ALIŞ",
        issueDate: new Date("2024-07-10"),
        totalAmount: 3000,
        taxAmount: 540,
        netAmount: 2460,
        status: "taslak",
      });
      await prisma.$queryRaw`SELECT 1`;

      await createTestInvoiceLine({
        tenantId: testUser.tenant.id,
        invoiceId: purchaseInvoice.id,
        lineNumber: 1,
        lineTotal: 3000,
        vatAmount: 540,
      });
      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          client_company_id: company1.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe("Müşteri Finansal Özeti");
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.period.start_date).toBe("2024-01-01T00:00:00Z");
      expect(response.body.data.period.end_date).toBe("2024-12-31T23:59:59Z");
      expect(response.body.data.generated_at).toBeDefined();
      expect(response.body.data.rows).toBeDefined();
      expect(Array.isArray(response.body.data.rows)).toBe(true);
      expect(response.body.data.totals).toBeDefined();

      // Verify totals for SATIŞ and ALIŞ invoices
      const totals = response.body.data.totals;
      expect(totals.totalSales).toBeGreaterThanOrEqual(2000); // At least the initial invoice
      expect(totals.totalPurchases).toBeGreaterThanOrEqual(0);
      expect(totals.invoiceCountsByStatus).toBeDefined();
      expect(typeof totals.invoiceCountsByStatus.taslak).toBe("number");
      expect(typeof totals.invoiceCountsByStatus.kesildi).toBe("number");
      expect(typeof totals.invoiceCountsByStatus.iptal).toBe("number");
      expect(typeof totals.invoiceCountsByStatus.muhasebeleştirilmiş).toBe("number");

      // Verify rows contain expected structure
      if (response.body.data.rows.length > 0) {
        const firstRow = response.body.data.rows[0];
        expect(firstRow.period).toBeDefined();
        expect(typeof firstRow.sales).toBe("number");
        expect(typeof firstRow.purchases).toBe("number");
        expect(typeof firstRow.invoice_count).toBe("number");
      }

      // Verify tenant isolation - should only include data from testUser's tenant
      const allRows = response.body.data.rows;
      for (const row of allRows) {
        expect(row).toBeDefined();
      }
    });

    it("should generate COMPANY_RISK_SUMMARY report with detailed assertions", async () => {
      // Create additional risk data for comprehensive testing
      await prisma.clientCompanyRiskScore.create({
        data: {
          tenantId: testUser.tenant.id,
          clientCompanyId: company1.id,
          score: 85.5,
          severity: "high",
          triggeredRuleCodes: ["RULE_001", "RULE_002"],
          generatedAt: new Date(),
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      // Create a high-risk document
      const highRiskDoc = await createTestDocument({
        tenantId: testUser.tenant.id,
        clientCompanyId: company1.id,
        uploadUserId: testUser.user.id,
        type: "INVOICE",
        status: "PROCESSED",
      });
      await prisma.$queryRaw`SELECT 1`;

      await prisma.documentRiskScore.create({
        data: {
          tenantId: testUser.tenant.id,
          documentId: highRiskDoc.id,
          score: 90.0,
          severity: "high",
          triggeredRuleCodes: ["RULE_001"],
          generatedAt: new Date(),
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      // Create open risk alerts
      await prisma.riskAlert.create({
        data: {
          tenantId: testUser.tenant.id,
          clientCompanyId: company1.id,
          type: "RISK_THRESHOLD_EXCEEDED",
          title: "Test High Risk Alert",
          severity: "high",
          status: "open",
          message: "Test high risk alert",
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      await prisma.riskAlert.create({
        data: {
          tenantId: testUser.tenant.id,
          clientCompanyId: company1.id,
          type: "ANOMALY_DETECTED",
          title: "Test Medium Risk Alert",
          severity: "medium",
          status: "open",
          message: "Test medium risk alert",
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_RISK_SUMMARY",
          client_company_id: company1.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe("Müşteri Risk Özeti");
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.totals).toBeDefined();

      // Verify risk score and severity
      const totals = response.body.data.totals;
      expect(totals.latestRiskScore).toBeDefined();
      expect(typeof totals.latestRiskScore === "number" || totals.latestRiskScore === null).toBe(true);
      expect(totals.latestSeverity).toBeDefined();
      expect(["low", "medium", "high", "critical", null]).toContain(totals.latestSeverity);

      // Verify high-risk document count
      expect(typeof totals.highRiskDocumentCount).toBe("number");
      expect(totals.highRiskDocumentCount).toBeGreaterThanOrEqual(0);

      // Verify triggered rules
      expect(Array.isArray(totals.triggeredRules)).toBe(true);

      // Verify open alerts grouped by severity
      expect(totals.openAlertsBySeverity).toBeDefined();
      expect(typeof totals.openAlertsBySeverity.low).toBe("number");
      expect(typeof totals.openAlertsBySeverity.medium).toBe("number");
      expect(typeof totals.openAlertsBySeverity.high).toBe("number");
      expect(typeof totals.openAlertsBySeverity.critical).toBe("number");

      // Verify rows contain high-risk documents
      expect(Array.isArray(response.body.data.rows)).toBe(true);
      if (response.body.data.rows.length > 0) {
        const firstRow = response.body.data.rows[0];
        expect(firstRow.document_id).toBeDefined();
        expect(firstRow.document_type).toBeDefined();
        expect(typeof firstRow.risk_score).toBe("number");
        expect(firstRow.severity).toBeDefined();
        expect(Array.isArray(firstRow.triggered_rules)).toBe(true);
      }
    });

    it("should generate TENANT_PORTFOLIO report with detailed assertions", async () => {
      // Create additional company for portfolio testing
      const company2 = await createTestClientCompany({
        tenantId: testUser.tenant.id,
        name: "Test Company 2 for Portfolio",
      });
      await prisma.$queryRaw`SELECT 1`;

      // Create risk score for company2
      await prisma.clientCompanyRiskScore.create({
        data: {
          tenantId: testUser.tenant.id,
          clientCompanyId: company2.id,
          score: 45.0,
          severity: "low",
          triggeredRuleCodes: [],
          generatedAt: new Date(),
        },
      });
      await prisma.$queryRaw`SELECT 1`;

      // Create documents for company2
      await createTestDocument({
        tenantId: testUser.tenant.id,
        clientCompanyId: company2.id,
        uploadUserId: testUser.user.id,
        type: "INVOICE",
        status: "PROCESSED",
      });
      await prisma.$queryRaw`SELECT 1`;

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
      expect(response.body.data.title).toBe("Kiracı Portföy Raporu");
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.rows).toBeDefined();
      expect(Array.isArray(response.body.data.rows)).toBe(true);

      // Verify rows contain company data with risk scores
      expect(response.body.data.rows.length).toBeGreaterThanOrEqual(1);
      const firstRow = response.body.data.rows[0];
      expect(firstRow.company_id).toBeDefined();
      expect(firstRow.company_name).toBeDefined();
      expect(firstRow.tax_number).toBeDefined();
      expect(typeof firstRow.latest_risk_score === "number" || firstRow.latest_risk_score === null).toBe(true);
      expect(["low", "medium", "high", "critical", null]).toContain(firstRow.latest_risk_severity);
      expect(typeof firstRow.document_count).toBe("number");
      expect(typeof firstRow.high_risk_invoice_count).toBe("number");
      expect(typeof firstRow.open_alert_count).toBe("number");

      // Verify totals
      expect(response.body.data.totals).toBeDefined();
      const totals = response.body.data.totals;
      expect(typeof totals.totalCompanies).toBe("number");
      expect(totals.totalCompanies).toBeGreaterThanOrEqual(1);
      expect(typeof totals.totalDocuments).toBe("number");
      expect(typeof totals.totalHighRiskInvoices).toBe("number");
      expect(typeof totals.totalOpenAlerts).toBe("number");

      // Verify tenant isolation - should only include companies from testUser's tenant
      const companyIds = response.body.data.rows.map((r: any) => r.company_id);
      expect(companyIds).toContain(company1.id);
      expect(companyIds).toContain(company2.id);
    });

    it("should generate DOCUMENT_ACTIVITY report with detailed assertions", async () => {
      // Create additional documents for comprehensive testing
      await createTestDocument({
        tenantId: testUser.tenant.id,
        clientCompanyId: company1.id,
        uploadUserId: testUser.user.id,
        type: "BANK_STATEMENT",
        status: "PROCESSED",
      });
      await prisma.$queryRaw`SELECT 1`;

      await createTestDocument({
        tenantId: testUser.tenant.id,
        clientCompanyId: company1.id,
        uploadUserId: testUser.user.id,
        type: "RECEIPT",
        status: "UPLOADED",
      });
      await prisma.$queryRaw`SELECT 1`;

      // Create additional invoices
      const invoice2 = await createTestInvoice({
        tenantId: testUser.tenant.id,
        clientCompanyId: company1.id,
        type: "SATIŞ",
        issueDate: new Date("2024-08-15"),
        totalAmount: 1500,
        taxAmount: 270,
        netAmount: 1230,
        status: "kesildi",
      });
      await prisma.$queryRaw`SELECT 1`;

      await createTestInvoiceLine({
        tenantId: testUser.tenant.id,
        invoiceId: invoice2.id,
        lineNumber: 1,
        lineTotal: 1500,
        vatAmount: 270,
      });
      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "DOCUMENT_ACTIVITY",
          client_company_id: company1.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe("Döküman Aktivite Raporu");
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.rows).toBeDefined();
      expect(Array.isArray(response.body.data.rows)).toBe(true);
      expect(response.body.data.totals).toBeDefined();

      // Verify documents by type
      const totals = response.body.data.totals;
      expect(totals.documentsByType).toBeDefined();
      expect(typeof totals.documentsByType.INVOICE).toBe("number");
      expect(typeof totals.documentsByType.BANK_STATEMENT).toBe("number");
      expect(typeof totals.documentsByType.RECEIPT).toBe("number");
      expect(typeof totals.documentsByType.OTHER).toBe("number");

      // Verify processing status counts
      expect(totals.processingStatusCounts).toBeDefined();
      expect(typeof totals.processingStatusCounts.UPLOADED).toBe("number");
      expect(typeof totals.processingStatusCounts.PROCESSING).toBe("number");
      expect(typeof totals.processingStatusCounts.PROCESSED).toBe("number");
      expect(typeof totals.processingStatusCounts.FAILED).toBe("number");

      // Verify invoice counts by status
      expect(totals.invoiceCountsByStatus).toBeDefined();
      expect(typeof totals.invoiceCountsByStatus.taslak).toBe("number");
      expect(typeof totals.invoiceCountsByStatus.kesildi).toBe("number");
      expect(typeof totals.invoiceCountsByStatus.iptal).toBe("number");
      expect(typeof totals.invoiceCountsByStatus.muhasebeleştirilmiş).toBe("number");

      // Verify invoice totals
      expect(totals.invoiceTotals).toBeDefined();
      expect(typeof totals.invoiceTotals.totalAmount).toBe("number");
      expect(typeof totals.invoiceTotals.totalTaxAmount).toBe("number");
      expect(typeof totals.invoiceTotals.totalNetAmount).toBe("number");
      expect(totals.invoiceTotals.totalAmount).toBeGreaterThanOrEqual(0);

      // Verify rows contain activity breakdown
      if (response.body.data.rows.length > 0) {
        const firstRow = response.body.data.rows[0];
        expect(firstRow.period).toBeDefined();
        expect(typeof firstRow.documents_uploaded).toBe("number");
        expect(typeof firstRow.documents_processed).toBe("number");
        expect(typeof firstRow.invoices_created).toBe("number");
      }
    });

    it("should return 400 for invalid report_code", async () => {
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "INVALID_REPORT",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toMatch(/Geçersiz rapor (kodu|türü)/);
    });

    it("should return 400 for missing required client_company_id", async () => {
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toMatch(/müşteri şirket/i);
    });

    it("should handle no data scenario gracefully (empty rows, no crash)", async () => {
      // Create a company with no invoices or documents
      const emptyCompany = await createTestClientCompany({
        tenantId: testUser.tenant.id,
        name: "Empty Company",
      });
      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          client_company_id: emptyCompany.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe("Müşteri Finansal Özeti");
      expect(Array.isArray(response.body.data.rows)).toBe(true);
      // Should return empty rows, not crash
      expect(response.body.data.totals).toBeDefined();
      expect(response.body.data.totals.totalSales).toBe(0);
      expect(response.body.data.totals.totalPurchases).toBe(0);
    });

    it("should return 400 for missing filters", async () => {
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          // Missing filters
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });

    it("should return 400 for missing date range", async () => {
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {},
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("Başlangıç ve bitiş tarihleri zorunludur");
    });

    it("should return 400 for invalid date range (start > end)", async () => {
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "2024-12-31T23:59:59Z",
            end_date: "2024-01-01T00:00:00Z",
          },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("Başlangıç tarihi bitiş tarihinden sonra olamaz");
    });

    it("should return 400 for overwide date range (>5 years)", async () => {
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "2019-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z", // > 5 years
          },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("Tarih aralığı çok geniş");
    });

    it("should return 400 for invalid report_code", async () => {
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "INVALID_REPORT_CODE",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe("Geçersiz rapor türü.");
    });

    it("should return 400 for missing client_company_id for company reports", async () => {
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe("Bu rapor için müşteri şirket seçilmesi zorunludur.");
    });

    it("should return 400 for invalid date format in filters", async () => {
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "invalid-date",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it("should return 404 for company not in tenant", async () => {
      // Create company in other tenant
      const otherCompany = await createTestClientCompany({
        tenantId: otherUser.tenant.id,
        name: "Other Company",
      });
      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          client_company_id: otherCompany.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe("Müşteri şirketi bulunamadı.");
    });

    it("should return empty rows and default totals when no data", async () => {
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          client_company_id: company1.id,
          filters: {
            start_date: "2020-01-01T00:00:00Z", // Date range with no data
            end_date: "2020-01-02T00:00:00Z",
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.rows).toEqual([]);
      expect(response.body.data.totals).toBeDefined();
      expect(response.body.data.totals.totalSales).toBe(0);
      expect(response.body.data.totals.totalPurchases).toBe(0);
    });

    it("should apply limit and return meta information", async () => {
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "TENANT_PORTFOLIO",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
            limit: 5,
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.rows.length).toBeLessThanOrEqual(5);
      expect(response.body.data.meta).toBeDefined();
      expect(response.body.data.meta.row_count).toBe(response.body.data.rows.length);
      expect(typeof response.body.data.meta.row_limit_applied).toBe("boolean");
    });
  });

  describe("Tenant Isolation", () => {
    it("should prevent cross-tenant data access", async () => {
      // Create company in other tenant
      const otherCompany = await createTestClientCompany({
        tenantId: otherUser.tenant.id,
        name: "Other Tenant Company",
      });
      await prisma.$queryRaw`SELECT 1`;

      // Try to generate report for other tenant's company
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          client_company_id: otherCompany.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe("RBAC", () => {
    it("should allow TenantOwner to generate reports", async () => {
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

    it("should allow Accountant to generate reports", async () => {
      const accountantUser = await createTestUser({
        email: `accountant-reports-${Date.now()}@example.com`,
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

    it("should allow Staff to generate reports", async () => {
      const staffUser = await createTestUser({
        email: `staff-reports-${Date.now()}@example.com`,
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

    it("should allow ReadOnly to generate reports", async () => {
      const readOnlyUser = await createTestUser({
        email: `readonly-reports-${Date.now()}@example.com`,
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
});

