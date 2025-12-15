// Import env setup FIRST
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  createTestApp,
  createTestUser,
  getAuthToken,
  getTestPrisma,
} from "../../test-utils";

describe("KVKK Routes Integration Tests", () => {
  const app = createTestApp();
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let authToken: string;

  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = await getAuthToken(testUser.user.email, "Test123!@#", app);
  });

  describe("POST /api/v1/kvkk/consent", () => {
    it("should record consent", async () => {
      const response = await request(app)
        .post("/api/v1/kvkk/consent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          userId: testUser.user.id,
          consentType: "data_processing",
          granted: true,
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.granted).toBe(true);
    });
  });

  describe("GET /api/v1/kvkk/consent/:userId", () => {
    it("should get consent status", async () => {
      // First record consent
      await request(app)
        .post("/api/v1/kvkk/consent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          userId: testUser.user.id,
          consentType: "data_processing",
          granted: true,
        });

      const response = await request(app)
        .get(`/api/v1/kvkk/consent/${testUser.user.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.dataProcessing).toBeDefined();
      expect(response.body.data.dataProcessing).toBe(true);
    });
  });

  describe("POST /api/v1/kvkk/data-access/:userId", () => {
    it("should create data access request", async () => {
      const response = await request(app)
        .post(`/api/v1/kvkk/data-access/${testUser.user.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.status).toBe("completed");
    });
  });
});

