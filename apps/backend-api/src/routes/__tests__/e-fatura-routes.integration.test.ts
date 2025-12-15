// Import env setup FIRST
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  createTestApp,
  createTestUser,
  getAuthToken,
  createTestClientCompany,
  createTestInvoice,
  getTestPrisma,
} from "../../test-utils";

describe("E-Fatura Routes Integration Tests", () => {
  const app = createTestApp();
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let authToken: string;
  let testCompany: Awaited<ReturnType<typeof createTestClientCompany>>;
  let testInvoice: Awaited<ReturnType<typeof createTestInvoice>>;

  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = await getAuthToken(testUser.user.email, "Test123!@#", app);
    testCompany = await createTestClientCompany({
      tenantId: testUser.tenant.id,
    });
    testInvoice = await createTestInvoice({
      tenantId: testUser.tenant.id,
      clientCompanyId: testCompany.id,
      status: "kesildi",
    });
  });

  describe("POST /api/v1/e-fatura/submit", () => {
    it("should submit invoice to E-Fatura system", async () => {
      // Create ETA integration
      const prisma = getTestPrisma();
      const provider = await prisma.integrationProvider.upsert({
        where: { code: "ETA" },
        update: {},
        create: {
          code: "ETA",
          name: "E-Fatura",
          type: "accounting",
          configSchema: {},
        },
      });

      await prisma.tenantIntegration.create({
        data: {
          tenantId: testUser.tenant.id,
          providerId: provider.id,
          status: "active",
          displayName: "E-Fatura Integration",
          config: {},
        },
      });

      const response = await request(app)
        .post("/api/v1/e-fatura/submit")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          invoiceId: testInvoice.id,
          config: {},
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.success).toBeDefined();
    });

    it("should require authentication", async () => {
      await request(app)
        .post("/api/v1/e-fatura/submit")
        .send({
          invoiceId: testInvoice.id,
        })
        .expect(401);
    });

    it("should require invoice:manage permission", async () => {
      // Create read-only user
      const readOnlyUser = await createTestUser({
        role: "ReadOnly",
        tenantId: testUser.tenant.id,
      });
      const readOnlyToken = await getAuthToken(
        readOnlyUser.user.email,
        "Test123!@#",
        app
      );

      await request(app)
        .post("/api/v1/e-fatura/submit")
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .send({
          invoiceId: testInvoice.id,
        })
        .expect(403);
    });
  });

  describe("GET /api/v1/e-fatura/status/:invoiceId", () => {
    it("should check invoice status", async () => {
      // First submit the invoice to E-Fatura
      const prisma = getTestPrisma();
      const provider = await prisma.integrationProvider.upsert({
        where: { code: "ETA" },
        update: {},
        create: {
          code: "ETA",
          name: "E-Fatura",
          type: "accounting",
          configSchema: {},
        },
      });

      await prisma.tenantIntegration.create({
        data: {
          tenantId: testUser.tenant.id,
          providerId: provider.id,
          status: "active",
          displayName: "E-Fatura Integration",
          config: {},
        },
      });

      // Submit invoice first
      await request(app)
        .post("/api/v1/e-fatura/submit")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          invoiceId: testInvoice.id,
          config: {},
        })
        .expect(200);

      // Then check status
      const response = await request(app)
        .get(`/api/v1/e-fatura/status/${testInvoice.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBeDefined();
    });
  });
});

