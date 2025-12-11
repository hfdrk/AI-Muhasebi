import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { createTestServer } from "../../test-utils/test-server";
import { getAuthToken, createTestUser, createTestTenant } from "../../test-utils/test-helpers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Task Routes Integration Tests", () => {
  let app: any;
  let testTenant: any;
  let testUser: any;
  let testToken: string;
  let testClientCompany: any;

  beforeAll(async () => {
    app = createTestServer();

    // Create test tenant and user
    testTenant = await createTestTenant();
    testUser = await createTestUser(testTenant.id, "TenantOwner");
    testToken = await getAuthToken(testUser.user.email, "Test123!@#", app);

    // Create test client company
    testClientCompany = await prisma.clientCompany.create({
      data: {
        tenantId: testTenant.id,
        name: "Test Client Company",
        taxNumber: `TEST-${Date.now()}`,
        legalType: "Limited",
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.task.deleteMany({ where: { tenantId: testTenant.id } });
    await prisma.clientCompany.deleteMany({ where: { tenantId: testTenant.id } });
    await prisma.userTenantMembership.deleteMany({ where: { tenantId: testTenant.id } });
    await prisma.user.deleteMany({ where: { id: testUser.user.id } });
    await prisma.tenant.deleteMany({ where: { id: testTenant.id } });
    await prisma.$disconnect();
  });

  describe("POST /api/v1/tasks", () => {
    it("should create a task", async () => {
      const response = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testTenant.id)
        .send({
          title: "Test Task",
          description: "Test task description",
          priority: "high",
          clientCompanyId: testClientCompany.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.title).toBe("Test Task");
      expect(response.body.data.status).toBe("pending");
    });

    it("should require title", async () => {
      const response = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testTenant.id)
        .send({
          description: "Test task description",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/v1/tasks", () => {
    it("should list tasks", async () => {
      // Create a task first
      const task = await prisma.task.create({
        data: {
          tenantId: testTenant.id,
          title: "List Test Task",
          status: "pending",
          priority: "medium",
        },
      });

      const response = await request(app)
        .get("/api/v1/tasks")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testTenant.id);

      expect(response.status).toBe(200);
      expect(response.body.data.data).toBeInstanceOf(Array);
      expect(response.body.data.data.length).toBeGreaterThan(0);

      // Clean up
      await prisma.task.delete({ where: { id: task.id } });
    });

    it("should filter tasks by status", async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: testTenant.id,
          title: "Status Test Task",
          status: "in_progress",
          priority: "medium",
        },
      });

      const response = await request(app)
        .get("/api/v1/tasks?status=in_progress")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testTenant.id);

      expect(response.status).toBe(200);
      expect(response.body.data.data.every((t: any) => t.status === "in_progress")).toBe(true);

      await prisma.task.delete({ where: { id: task.id } });
    });
  });

  describe("GET /api/v1/tasks/:id", () => {
    it("should get task by ID", async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: testTenant.id,
          title: "Get Test Task",
          status: "pending",
          priority: "low",
        },
      });

      const response = await request(app)
        .get(`/api/v1/tasks/${task.id}`)
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testTenant.id);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(task.id);
      expect(response.body.data.title).toBe("Get Test Task");

      await prisma.task.delete({ where: { id: task.id } });
    });
  });

  describe("PATCH /api/v1/tasks/:id", () => {
    it("should update task", async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: testTenant.id,
          title: "Update Test Task",
          status: "pending",
          priority: "medium",
        },
      });

      const response = await request(app)
        .patch(`/api/v1/tasks/${task.id}`)
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testTenant.id)
        .send({
          status: "in_progress",
          priority: "high",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("in_progress");
      expect(response.body.data.priority).toBe("high");

      await prisma.task.delete({ where: { id: task.id } });
    });
  });

  describe("DELETE /api/v1/tasks/:id", () => {
    it("should delete task", async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: testTenant.id,
          title: "Delete Test Task",
          status: "pending",
          priority: "medium",
        },
      });

      const response = await request(app)
        .delete(`/api/v1/tasks/${task.id}`)
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testTenant.id);

      expect(response.status).toBe(200);

      // Verify task is deleted
      const deleted = await prisma.task.findUnique({ where: { id: task.id } });
      expect(deleted).toBeNull();
    });
  });

  describe("GET /api/v1/tasks/stats/summary", () => {
    it("should get task statistics", async () => {
      const response = await request(app)
        .get("/api/v1/tasks/stats/summary")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testTenant.id);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("total");
      expect(response.body.data).toHaveProperty("pending");
      expect(response.body.data).toHaveProperty("inProgress");
      expect(response.body.data).toHaveProperty("completed");
      expect(response.body.data).toHaveProperty("overdue");
      expect(response.body.data).toHaveProperty("byPriority");
    });
  });
});

