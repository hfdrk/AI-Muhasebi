/**
 * Health Routes Tests
 * 
 * Tests for /health and /ready endpoints
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../test-utils/test-server";
import { prisma } from "../lib/prisma";

describe("Health Routes", () => {
  let app: any;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /health", () => {
    it("should return 200 with ok status when database is healthy", async () => {
      // Mock successful database query
      vi.spyOn(prisma, "$queryRaw").mockResolvedValue([{ health_check: 1 }]);

      const response = await request(app).get("/health").expect(200);

      expect(response.body).toMatchObject({
        status: "ok",
        db: "ok",
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it("should return 503 with degraded status when database is unavailable", async () => {
      // Mock database error
      vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("Connection failed"));

      const response = await request(app).get("/health").expect(503);

      expect(response.body).toMatchObject({
        status: "degraded",
        db: "error",
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it("should handle database timeout", async () => {
      // Mock timeout - use a promise that rejects after a delay
      vi.spyOn(prisma, "$queryRaw").mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("Database connection timeout")), 10)) as any
      );

      const response = await request(app).get("/health").expect(503);

      expect(response.body.db).toBe("error");
    }, 10000);
  });

  describe("GET /ready", () => {
    it("should return 200 when database is reachable", async () => {
      // Mock successful database query
      vi.spyOn(prisma, "$queryRaw").mockResolvedValue([{ ready_check: 1 }]);

      const response = await request(app).get("/ready").expect(200);

      expect(response.body).toMatchObject({
        status: "ready",
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it("should return 503 when database is not reachable", async () => {
      // Mock database error
      vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("Connection failed"));

      const response = await request(app).get("/ready").expect(503);

      expect(response.body).toMatchObject({
        status: "not ready",
        error: "Database connection failed",
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it("should handle database timeout", async () => {
      // Mock timeout
      vi.spyOn(prisma, "$queryRaw").mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("Database connection timeout")), 10)) as any
      );

      const response = await request(app).get("/ready").expect(503);

      expect(response.body.status).toBe("not ready");
    }, 10000);
  });
});

