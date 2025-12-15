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

describe("Analytics Routes Integration Tests", () => {
  const app = createTestApp();
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let authToken: string;

  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = await getAuthToken(testUser.user.email, "Test123!@#", app);
  });

  describe("GET /api/v1/analytics/financial-trends", () => {
    it("should get financial trends", async () => {
      const response = await request(app)
        .get("/api/v1/analytics/financial-trends")
        .query({
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          granularity: "monthly",
        })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should require startDate and endDate", async () => {
      await request(app)
        .get("/api/v1/analytics/financial-trends")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe("GET /api/v1/analytics/risk-trends", () => {
    it("should get risk trends", async () => {
      const response = await request(app)
        .get("/api/v1/analytics/risk-trends")
        .query({
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          granularity: "monthly",
        })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/analytics/portfolio", () => {
    it("should get portfolio analytics", async () => {
      const response = await request(app)
        .get("/api/v1/analytics/portfolio")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalClients).toBeDefined();
      expect(response.body.data.activeClients).toBeDefined();
    });
  });

  describe("GET /api/v1/analytics/dashboard", () => {
    it("should get comprehensive analytics dashboard", async () => {
      const response = await request(app)
        .get("/api/v1/analytics/dashboard")
        .query({
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.financial).toBeDefined();
      expect(response.body.data.risk).toBeDefined();
      expect(response.body.data.portfolio).toBeDefined();
    });
  });
});

