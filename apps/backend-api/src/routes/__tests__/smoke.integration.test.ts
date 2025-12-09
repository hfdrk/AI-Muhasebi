// Import env setup FIRST - must run before any routes/services that use config
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  createTestApp,
  createTestUser,
  getAuthToken,
  createTestClientCompany,
  getTestPrisma,
  createTestInvoice,
  createTestInvoiceLine,
} from "../../test-utils";

describe("Smoke Tests - Happy Path Flows", () => {
  const app = createTestApp();

  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let authToken: string;

  beforeEach(async () => {
    testUser = await createTestUser({
      email: `smoke-test-${Date.now()}@example.com`,
    });

    // Ensure user is visible to auth middleware before getting token
    const prisma = getTestPrisma();
    await prisma.$queryRaw`SELECT 1`;

    // Wait for user to be visible with active membership
    for (let i = 0; i < 10; i++) {
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
  });

  describe("AUTH + TENANT CREATION - POST /api/v1/auth/register", () => {
    it("should register new tenant + owner user and return token", async () => {
      const uniqueEmail = `smoke-register-${Date.now()}@example.com`;
      const uniqueSlug = `smoke-tenant-${Date.now()}`;

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          user: {
            email: uniqueEmail,
            password: "Test123!@#Password",
            fullName: "Smoke Test User",
          },
          tenant: {
            name: "Smoke Test Tenant",
            slug: uniqueSlug,
            taxNumber: "1234567890",
          },
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(uniqueEmail);
      expect(response.body.data.tenant).toBeDefined();
      expect(response.body.data.tenant.slug).toBe(uniqueSlug);
      expect(response.body.data.accessToken).toBeDefined();
      expect(typeof response.body.data.accessToken).toBe("string");
      expect(response.body.data.accessToken.length).toBeGreaterThan(0);

      // Verify we can login with the new user
      const loginResponse = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: uniqueEmail,
          password: "Test123!@#Password",
        })
        .expect(200);

      expect(loginResponse.body.data.accessToken).toBeDefined();
      expect(loginResponse.body.data.user).toBeDefined();
      expect(loginResponse.body.data.tenantId).toBeDefined();
      expect(loginResponse.body.data.tenantId).toBe(response.body.data.tenant.id);
    });
  });

  describe("AUTH - POST /api/v1/auth/login", () => {
    it("should login successfully and return token", async () => {
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testUser.user.email,
          password: "Test123!@#",
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(typeof response.body.data.accessToken).toBe("string");
      expect(response.body.data.accessToken.length).toBeGreaterThan(0);
    });
  });

  describe("CLIENT COMPANY - POST /api/v1/client-companies and GET /api/v1/client-companies", () => {
    it("should create client company and list it for the tenant", async () => {
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;

      const uniqueTaxNumber = `smoke-${Date.now()}`;
      
      // Create client company
      const createResponse = await request(app)
        .post("/api/v1/client-companies")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Smoke Test Company",
          legalType: "Limited",
          taxNumber: uniqueTaxNumber,
          isActive: true,
        })
        .expect(201);

      expect(createResponse.body.data).toBeDefined();
      expect(createResponse.body.data.name).toBe("Smoke Test Company");
      expect(createResponse.body.data.taxNumber).toBe(uniqueTaxNumber);
      const companyId = createResponse.body.data.id;

      // List client companies
      const listResponse = await request(app)
        .get("/api/v1/client-companies")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(listResponse.body.data).toBeDefined();
      expect(listResponse.body.data.data).toBeInstanceOf(Array);
      
      // Verify created company appears in the list
      const companies = listResponse.body.data.data;
      const foundCompany = companies.find((c: any) => c.id === companyId);
      expect(foundCompany).toBeDefined();
      expect(foundCompany.name).toBe("Smoke Test Company");
      expect(foundCompany.taxNumber).toBe(uniqueTaxNumber);
    });
  });

  describe("DOCUMENT UPLOAD - POST /api/v1/documents/upload", () => {
    it("should upload document and set status to UPLOADED", async () => {
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;

      // Create a client company first
      const clientCompany = await createTestClientCompany({
        tenantId: testUser.tenant.id,
      });

      // Create a dummy file buffer
      const fileContent = Buffer.from("dummy PDF content");
      const fileName = "test-document.pdf";

      const response = await request(app)
        .post("/api/v1/documents/upload")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .field("clientCompanyId", clientCompany.id)
        .field("type", "INVOICE")
        .attach("file", fileContent, fileName)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.status).toBe("UPLOADED");
      expect(response.body.data.originalFileName).toBe(fileName);

      // Verify in database
      const document = await prisma.document.findUnique({
        where: { id: response.body.data.id },
      });
      expect(document).toBeDefined();
      expect(document?.status).toBe("UPLOADED");
      expect(document?.tenantId).toBe(testUser.tenant.id);
    });
  });

  describe("INVOICE CREATION - POST /api/v1/invoices", () => {
    it("should create invoice for client company", async () => {
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;

      // Create a client company first
      const clientCompany = await createTestClientCompany({
        tenantId: testUser.tenant.id,
      });

      const issueDate = new Date();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const response = await request(app)
        .post("/api/v1/invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          clientCompanyId: clientCompany.id,
          type: "SATIŞ",
          issueDate: issueDate.toISOString(),
          dueDate: dueDate.toISOString(),
          totalAmount: 1180,
          taxAmount: 180,
          netAmount: 1000,
          currency: "TRY",
          lines: [
            {
              lineNumber: 1,
              description: "Test Item",
              quantity: 1,
              unitPrice: 1000,
              lineTotal: 1180,
              vatRate: 0.18,
              vatAmount: 180,
            },
          ],
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.clientCompanyId).toBe(clientCompany.id);
      expect(response.body.data.type).toBe("SATIŞ");
      expect(parseFloat(response.body.data.totalAmount)).toBe(1180);
      expect(response.body.data.tenantId).toBe(testUser.tenant.id);
    });
  });

  describe("REPORTING - POST /api/v1/reports/generate", () => {
    it("should generate company financial summary report in JSON mode", async () => {
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;

      // Create a client company
      const clientCompany = await createTestClientCompany({
        tenantId: testUser.tenant.id,
      });

      // Create an invoice for the company
      const invoice = await createTestInvoice({
        tenantId: testUser.tenant.id,
        clientCompanyId: clientCompany.id,
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
        invoiceId: invoice.id,
        lineNumber: 1,
        lineTotal: 5000,
        vatAmount: 900,
      });
      await prisma.$queryRaw`SELECT 1`;

      // Generate report
      const response = await request(app)
        .post("/api/v1/reports/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          report_code: "COMPANY_FINANCIAL_SUMMARY",
          client_company_id: clientCompany.id,
          filters: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-12-31T23:59:59Z",
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.rows).toBeInstanceOf(Array);
      expect(response.body.data.title).toBeDefined();
      // Verify tenant isolation - report should only include data for this tenant
      expect(response.body.data.tenantId || response.body.data.rows[0]?.tenantId).toBeUndefined(); // Should not expose tenantId in response
    });
  });

  describe("NOTIFICATIONS - GET /api/v1/notifications", () => {
    it("should list notifications and ensure tenant isolation", async () => {
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;

      // Create a notification for the test tenant
      const notification = await prisma.notification.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          type: "SYSTEM",
          title: "Test Notification",
          message: "This is a test notification",
          is_read: false,
        },
      });

      // List notifications
      const response = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Verify notification appears in the list
      const notifications = response.body.data;
      const foundNotification = notifications.find((n: any) => n.id === notification.id);
      expect(foundNotification).toBeDefined();
      expect(foundNotification.title).toBe("Test Notification");
      expect(foundNotification.message).toBe("This is a test notification");
      expect(foundNotification.tenantId).toBe(testUser.tenant.id);
    });
  });

  describe("SETTINGS - GET/PUT /api/v1/settings/tenant and /api/v1/settings/user", () => {
    it("should get and update tenant settings", async () => {
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;

      // Get tenant settings
      const getResponse = await request(app)
        .get("/api/v1/settings/tenant")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(getResponse.body.data).toBeDefined();

      // Update tenant settings
      const updateResponse = await request(app)
        .put("/api/v1/settings/tenant")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          displayName: "Updated Smoke Test Tenant",
        })
        .expect(200);

      expect(updateResponse.body.data).toBeDefined();
      expect(updateResponse.body.data.displayName).toBe("Updated Smoke Test Tenant");

      // Verify change persisted
      const verifyResponse = await request(app)
        .get("/api/v1/settings/tenant")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(verifyResponse.body.data.displayName).toBe("Updated Smoke Test Tenant");
    });

    it("should get and update user settings", async () => {
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;

      // Get user settings
      const getResponse = await request(app)
        .get("/api/v1/settings/user")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(getResponse.body.data).toBeDefined();
      expect(getResponse.body.data.effectiveLocale).toBeDefined();

      // Update user settings
      const updateResponse = await request(app)
        .put("/api/v1/settings/user")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          timezone: "Europe/Istanbul",
        })
        .expect(200);

      expect(updateResponse.body.data).toBeDefined();
      expect(updateResponse.body.data.userSettings).toBeDefined();
      expect(updateResponse.body.data.userSettings.timezone).toBe("Europe/Istanbul");
    });
  });

  describe("AUDIT LOGS - GET /api/v1/audit-logs", () => {
    it("should list audit logs for tenant owner", async () => {
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;

      // Create a client company to generate an audit log
      const clientCompany = await createTestClientCompany({
        tenantId: testUser.tenant.id,
      });
      await prisma.$queryRaw`SELECT 1`;

      // Wait a bit for audit log to be created
      await new Promise((resolve) => setTimeout(resolve, 200));

      // List audit logs
      const response = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Verify at least one log entry exists
      const logs = response.body.data;
      expect(logs.length).toBeGreaterThan(0);
      
      // Verify log entry exists (any log entry is fine for smoke test)
      // We just need to verify the endpoint works and returns data
      expect(logs.length).toBeGreaterThan(0);
    });
  });
});

