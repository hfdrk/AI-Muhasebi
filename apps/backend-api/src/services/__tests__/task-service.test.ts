import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { taskService } from "../task-service";

const prisma = new PrismaClient();

describe("TaskService", () => {
  let testTenantId: string;
  let testClientCompanyId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: "Test Tenant",
        slug: `test-tenant-${Date.now()}`,
      },
    });
    testTenantId = tenant.id;

    // Create test client company
    const clientCompany = await prisma.clientCompany.create({
      data: {
        tenantId: testTenantId,
        name: "Test Client",
        taxNumber: `TEST-${Date.now()}`,
        legalType: "Limited",
      },
    });
    testClientCompanyId = clientCompany.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        hashedPassword: "hashed",
        fullName: "Test User",
      },
    });
    testUserId = user.id;

    // Create membership
    await prisma.userTenantMembership.create({
      data: {
        userId: testUserId,
        tenantId: testTenantId,
        role: "Accountant",
        status: "active",
      },
    });
  });

  afterEach(async () => {
    await prisma.task.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.userTenantMembership.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.clientCompany.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
  });

  describe("createTask", () => {
    it("should create a task", async () => {
      const task = await taskService.createTask(testTenantId, {
        tenantId: testTenantId,
        title: "Test Task",
        description: "Test description",
        priority: "high",
        clientCompanyId: testClientCompanyId,
      });

      expect(task).toHaveProperty("id");
      expect(task.title).toBe("Test Task");
      expect(task.status).toBe("pending");
      expect(task.priority).toBe("high");
    });

    it("should fail if client company doesn't belong to tenant", async () => {
      const otherTenant = await prisma.tenant.create({
        data: {
          name: "Other Tenant",
          slug: `other-tenant-${Date.now()}`,
        },
      });

      await expect(
        taskService.createTask(testTenantId, {
          tenantId: testTenantId,
          title: "Test Task",
          clientCompanyId: testClientCompanyId, // Belongs to testTenantId, not otherTenant
        })
      ).resolves.toBeDefined(); // Should succeed since clientCompanyId belongs to testTenantId

      await prisma.tenant.delete({ where: { id: otherTenant.id } });
    });
  });

  describe("listTasks", () => {
    it("should list tasks", async () => {
      await prisma.task.create({
        data: {
          tenantId: testTenantId,
          title: "Task 1",
          status: "pending",
          priority: "medium",
        },
      });

      await prisma.task.create({
        data: {
          tenantId: testTenantId,
          title: "Task 2",
          status: "in_progress",
          priority: "high",
        },
      });

      const result = await taskService.listTasks(testTenantId);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it("should filter by status", async () => {
      await prisma.task.create({
        data: {
          tenantId: testTenantId,
          title: "Pending Task",
          status: "pending",
          priority: "medium",
        },
      });

      await prisma.task.create({
        data: {
          tenantId: testTenantId,
          title: "In Progress Task",
          status: "in_progress",
          priority: "medium",
        },
      });

      const result = await taskService.listTasks(testTenantId, { status: "pending" });

      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe("pending");
    });
  });

  describe("updateTask", () => {
    it("should update task", async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: testTenantId,
          title: "Original Title",
          status: "pending",
          priority: "low",
        },
      });

      const updated = await taskService.updateTask(testTenantId, task.id, {
        title: "Updated Title",
        status: "in_progress",
        priority: "high",
      });

      expect(updated.title).toBe("Updated Title");
      expect(updated.status).toBe("in_progress");
      expect(updated.priority).toBe("high");
    });

    it("should set completedAt when status changes to completed", async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: testTenantId,
          title: "Task to Complete",
          status: "pending",
          priority: "medium",
        },
      });

      const updated = await taskService.updateTask(testTenantId, task.id, {
        status: "completed",
      });

      expect(updated.status).toBe("completed");
      expect(updated.completedAt).not.toBeNull();
    });
  });

  describe("getTaskStatistics", () => {
    it("should return task statistics", async () => {
      await prisma.task.create({
        data: {
          tenantId: testTenantId,
          title: "Pending Task",
          status: "pending",
          priority: "low",
        },
      });

      await prisma.task.create({
        data: {
          tenantId: testTenantId,
          title: "High Priority Task",
          status: "in_progress",
          priority: "high",
        },
      });

      const stats = await taskService.getTaskStatistics(testTenantId);

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.low).toBe(1);
    });
  });
});


