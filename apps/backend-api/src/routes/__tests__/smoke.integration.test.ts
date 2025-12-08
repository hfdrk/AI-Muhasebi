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
        .field("documentType", "INVOICE")
        .attach("file", fileContent, fileName)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.status).toBe("UPLOADED");
      expect(response.body.data.fileName).toBe(fileName);

      // Verify in database
      const document = await prisma.document.findUnique({
        where: { id: response.body.data.id },
      });
      expect(document).toBeDefined();
      expect(document?.status).toBe("UPLOADED");
      expect(document?.tenantId).toBe(testUser.tenant.id);
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
});

