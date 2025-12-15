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

describe("Security Routes Integration Tests", () => {
  const app = createTestApp();
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let authToken: string;

  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = await getAuthToken(testUser.user.email, "Test123!@#", app);
  });

  describe("POST /api/v1/security/2fa/enable", () => {
    it("should enable 2FA for user", async () => {
      const response = await request(app)
        .post("/api/v1/security/2fa/enable")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          userId: testUser.user.id,
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.enabled).toBe(false); // Initially not enabled
      expect(response.body.data.secret).toBeDefined();
      expect(response.body.data.qrCode).toBeDefined();
    });
  });

  describe("POST /api/v1/security/password/validate", () => {
    it("should validate password strength", async () => {
      const response = await request(app)
        .post("/api/v1/security/password/validate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          password: "Test123!@#Password",
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.valid).toBeDefined();
    });

    it("should reject weak passwords", async () => {
      const response = await request(app)
        .post("/api/v1/security/password/validate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          password: "123",
        })
        .expect(200);

      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/v1/security/account-lockout/:userId", () => {
    it("should get account lockout status", async () => {
      const response = await request(app)
        .get(`/api/v1/security/account-lockout/${testUser.user.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.locked).toBeDefined();
      expect(response.body.data.failedAttempts).toBeDefined();
      expect(response.body.data.remainingAttempts).toBeDefined();
    });
  });
});

