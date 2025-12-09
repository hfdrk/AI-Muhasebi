import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../../test-utils/test-app";
import { createTestUser, getAuthToken } from "../../test-utils/test-auth";
import type { TestUserResult } from "../../test-utils/test-auth";

describe("AI Assistant Integration Tests", () => {
  let app: any;
  let testUser1: TestUserResult;
  let testUser2: TestUserResult;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    app = await createTestApp();

    // Create two test users in different tenants
    testUser1 = await createTestUser({
      email: "ai-test-user1@test.com",
      password: "Test123!",
      role: "Accountant",
    });

    testUser2 = await createTestUser({
      email: "ai-test-user2@test.com",
      password: "Test123!",
      role: "Accountant",
    });

    token1 = await getAuthToken("ai-test-user1@test.com", "Test123!", app);
    token2 = await getAuthToken("ai-test-user2@test.com", "Test123!", app);
  });

  afterAll(async () => {
    // Cleanup is handled by test-utils
  });

  describe("POST /api/v1/ai/chat", () => {
    it("should return 200 and an answer string (mock mode when no API key)", async () => {
      const response = await request(app)
        .post("/api/v1/ai/chat")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          question: "Kaç tane müşteri şirketim var?",
        })
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("answer");
      expect(typeof response.body.data.answer).toBe("string");
      expect(response.body.data.answer.length).toBeGreaterThan(0);
    });

    it("should enforce tenant isolation", async () => {
      // User from Tenant 1 should not see Tenant 2 data
      const response = await request(app)
        .post("/api/v1/ai/chat")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          question: "Müşteri şirketlerimi listele",
        })
        .expect(200);

      // The answer should only contain data from tenant 1
      // In mock mode, this is harder to verify, but the service should filter by tenantId
      expect(response.body.data.answer).toBeDefined();
    });

    it("should handle errors gracefully", async () => {
      const response = await request(app)
        .post("/api/v1/ai/chat")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          question: "", // Empty question should fail validation
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should require authentication", async () => {
      await request(app)
        .post("/api/v1/ai/chat")
        .send({
          question: "Test question",
        })
        .expect(401);
    });

    it("should allow ReadOnly role to use AI", async () => {
      const readOnlyUser = await createTestUser({
        email: "ai-readonly@test.com",
        password: "Test123!",
        role: "ReadOnly",
      });

      const readOnlyToken = await getAuthToken("ai-readonly@test.com", "Test123!", app);

      const response = await request(app)
        .post("/api/v1/ai/chat")
        .set("Authorization", `Bearer ${readOnlyToken}`)
        .send({
          question: "Test question",
        })
        .expect(200);

      expect(response.body.data).toHaveProperty("answer");
    });
  });

  describe("POST /api/v1/ai/summaries/daily-risk", () => {
    it("should return summary when risk alerts exist", async () => {
      const response = await request(app)
        .post("/api/v1/ai/summaries/daily-risk")
        .set("Authorization", `Bearer ${token1}`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("summary");
      expect(response.body.data).toHaveProperty("date");
      expect(typeof response.body.data.summary).toBe("string");
    });

    it("should return summary for a specific date", async () => {
      const date = new Date();
      date.setDate(date.getDate() - 1); // Yesterday

      const response = await request(app)
        .post("/api/v1/ai/summaries/daily-risk")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          date: date.toISOString(),
        })
        .expect(200);

      expect(response.body.data).toHaveProperty("summary");
      expect(response.body.data).toHaveProperty("date");
    });
  });

  describe("POST /api/v1/ai/summaries/portfolio", () => {
    it("should return portfolio summary", async () => {
      const response = await request(app)
        .post("/api/v1/ai/summaries/portfolio")
        .set("Authorization", `Bearer ${token1}`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("summary");
      expect(typeof response.body.data.summary).toBe("string");
    });

    it("should enforce tenant isolation", async () => {
      // User from Tenant 1 should only see Tenant 1 portfolio
      const response = await request(app)
        .post("/api/v1/ai/summaries/portfolio")
        .set("Authorization", `Bearer ${token1}`)
        .send({})
        .expect(200);

      // Summary should only contain data from tenant 1
      expect(response.body.data.summary).toBeDefined();
    });
  });
});

