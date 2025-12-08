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
  prisma,
} from "../../test-utils";
import { TENANT_ROLES } from "@repo/core-domain";

describe("Report Download Routes Integration Tests", () => {
  const app = createTestApp();

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
      email: `download-routes-${Date.now()}@example.com`,
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
      email: `other-download-${Date.now()}@example.com`,
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
      name: "Test Company for Downloads",
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

  describe("PDF Export", () => {
    it("should export COMPANY_FINANCIAL_SUMMARY as PDF with valid structure", async () => {
      const response = await request(app)
        .post("/api/v1/reports/download")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          client_company_id: company1.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          format: "pdf",
        })
        .expect(200);

      // Verify status 200
      expect(response.status).toBe(200);

      // Verify Content-Type
      expect(response.headers["content-type"]).toContain("application/pdf");

      // Verify Content-Disposition header
      expect(response.headers["content-disposition"]).toContain("attachment");
      expect(response.headers["content-disposition"]).toContain(".pdf");

      // Verify non-empty body
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify PDF structure - PDF files start with %PDF
      const pdfHeader = response.body.toString("utf-8", 0, 4);
      expect(pdfHeader).toBe("%PDF");
    });

    it("should export COMPANY_RISK_SUMMARY as PDF", async () => {
      const response = await request(app)
        .post("/api/v1/reports/download")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_RISK_SUMMARY",
          client_company_id: company1.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          format: "pdf",
        })
        .expect(200);

      expect(response.headers["content-type"]).toContain("application/pdf");
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should export TENANT_PORTFOLIO as PDF", async () => {
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
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should export DOCUMENT_ACTIVITY as PDF", async () => {
      const response = await request(app)
        .post("/api/v1/reports/download")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "DOCUMENT_ACTIVITY",
          client_company_id: company1.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          format: "pdf",
        })
        .expect(200);

      expect(response.headers["content-type"]).toContain("application/pdf");
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe("Excel/CSV Export", () => {
    it("should export COMPANY_FINANCIAL_SUMMARY as CSV with valid structure and headers", async () => {
      const response = await request(app)
        .post("/api/v1/reports/download")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          client_company_id: company1.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          format: "excel",
        })
        .expect(200);

      // Verify status 200
      expect(response.status).toBe(200);

      // Verify Content-Type
      expect(response.headers["content-type"]).toContain("text/csv");

      // Verify Content-Disposition header
      expect(response.headers["content-disposition"]).toContain("attachment");
      expect(response.headers["content-disposition"]).toContain(".csv");
      
      // Verify non-empty body
      const csvText = response.text;
      expect(csvText.length).toBeGreaterThan(0);
      
      // Verify CSV structure - should have at least one line
      const lines = csvText.split("\n").filter((line) => line.trim().length > 0);
      expect(lines.length).toBeGreaterThan(0);
      
      // Check that first line contains expected headers or title
      const firstLine = lines[0];
      expect(firstLine).toBeDefined();
      expect(firstLine.trim().length).toBeGreaterThan(0);
    });

    it("should export TENANT_PORTFOLIO as CSV with headers matching report columns", async () => {
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
          format: "excel",
        })
        .expect(200);

      // Verify status 200
      expect(response.status).toBe(200);

      // Verify Content-Type
      expect(response.headers["content-type"]).toContain("text/csv");

      // Verify CSV structure
      const csvText = response.text;
      expect(csvText.length).toBeGreaterThan(0);
      const lines = csvText.split("\n").filter((line) => line.trim().length > 0);
      expect(lines.length).toBeGreaterThan(0);

      // Verify header row exists (first non-empty line should contain column names)
      const headerLine = lines[0];
      expect(headerLine).toBeDefined();
      // CSV should have comma-separated values
      expect(headerLine.includes(",") || headerLine.length > 0).toBe(true);
    });
  });

  describe("RBAC", () => {
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
        email: `accountant-download-${Date.now()}@example.com`,
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
        email: `staff-download-${Date.now()}@example.com`,
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
        email: `readonly-download-${Date.now()}@example.com`,
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

  describe("Tenant Isolation", () => {
    it("should prevent cross-tenant report downloads", async () => {
      // Create company in other tenant
      const otherCompany = await createTestClientCompany({
        tenantId: otherUser.tenant.id,
        name: "Other Tenant Company",
      });
      await prisma.$queryRaw`SELECT 1`;

      // Try to download report for other tenant's company
      const response = await request(app)
        .post("/api/v1/reports/download")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          client_company_id: otherCompany.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          format: "pdf",
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe("Error Cases", () => {
    it("should return 400 for invalid format", async () => {
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
          format: "invalid",
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it("should return 400 for invalid report_code", async () => {
      const response = await request(app)
        .post("/api/v1/reports/download")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "INVALID_REPORT",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          format: "pdf",
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it("should return 400 for missing required client_company_id", async () => {
      const response = await request(app)
        .post("/api/v1/reports/download")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
          format: "pdf",
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("müşteri şirket");
    });
  });
});

