// Import env setup FIRST
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

describe("Tax Routes Integration Tests", () => {
  const app = createTestApp();
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let authToken: string;
  let testCompany: Awaited<ReturnType<typeof createTestClientCompany>>;

  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = await getAuthToken(testUser.user.id, testUser.tenant.id);
    testCompany = await createTestClientCompany({
      tenantId: testUser.tenant.id,
    });
  });

  describe("GET /api/v1/tax/vat-analysis/:clientCompanyId", () => {
    it("should get VAT analysis for client company", async () => {
      const response = await request(app)
        .get(`/api/v1/tax/vat-analysis/${testCompany.id}`)
        .query({
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalVAT).toBeDefined();
    });
  });

  describe("GET /api/v1/tax/compliance/:clientCompanyId", () => {
    it("should check tax compliance", async () => {
      const response = await request(app)
        .get(`/api/v1/tax/compliance/${testCompany.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.isCompliant).toBeDefined();
    });
  });

  describe("POST /api/v1/tax/vat-declaration", () => {
    it("should generate VAT declaration", async () => {
      const response = await request(app)
        .post("/api/v1/tax/vat-declaration")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          clientCompanyId: testCompany.id,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });
});

