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

describe("E-Arşiv Routes Integration Tests", () => {
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

  describe("POST /api/v1/e-arsiv/archive", () => {
    it("should archive invoice", async () => {
      const response = await request(app)
        .post("/api/v1/e-arsiv/archive")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          invoiceId: testInvoice.id,
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.success).toBeDefined();
    });
  });

  describe("GET /api/v1/e-arsiv/search", () => {
    it("should search archived invoices", async () => {
      const response = await request(app)
        .get("/api/v1/e-arsiv/search")
        .query({
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});

