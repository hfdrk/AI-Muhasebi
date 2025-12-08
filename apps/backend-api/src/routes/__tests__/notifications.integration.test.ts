// Import env setup FIRST - must run before any routes/services that use config
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  createTestApp,
  createTestUser,
  getAuthToken,
  getTestPrisma,
} from "../../test-utils";

describe("Notifications Integration Tests", () => {
  const app = createTestApp();
  const prisma = getTestPrisma();

  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let testToken: string;
  let otherUser: Awaited<ReturnType<typeof createTestUser>>;
  let otherToken: string;

  beforeEach(async () => {
    // Create test users
    testUser = await createTestUser({
      email: `test-notifications-${Date.now()}@example.com`,
    });
    testToken = await getAuthToken(testUser.user.email, "Test123!@#", app);

    otherUser = await createTestUser({
      email: `other-notifications-${Date.now()}@example.com`,
    });
    otherToken = await getAuthToken(otherUser.user.email, "Test123!@#", app);
    
    // Ensure users and tenants are committed before tests run
    await prisma.$queryRaw`SELECT 1`;
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  describe("GET /api/v1/notifications", () => {
    it("should return notifications for current tenant and user", async () => {
      // Verify user exists
      const userExists = await prisma.user.findUnique({
        where: { id: testUser.user.id },
      });
      if (!userExists) {
        throw new Error("Test user not found in database");
      }
      
      // Create a notification for test user
      const notification = await prisma.notification.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          type: "RISK_ALERT",
          title: "Test Notification",
          message: "Test message",
          meta: {},
        },
      });

      await prisma.$queryRaw`SELECT 1`; // Ensure notification is committed

      const response = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some((n: any) => n.id === notification.id)).toBe(true);
    });

    it("should return tenant-wide notifications (userId = null)", async () => {
      // Create a tenant-wide notification
      const notification = await prisma.notification.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: null,
          type: "SYSTEM",
          title: "Tenant-wide Notification",
          message: "This is for all users",
          meta: {},
        },
      });

      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data.some((n: any) => n.id === notification.id)).toBe(true);
    });

    it("should NOT return notifications from another tenant", async () => {
      // Create notification in other user's tenant
      const otherNotification = await prisma.notification.create({
        data: {
          tenantId: otherUser.tenant.id,
          userId: otherUser.user.id,
          type: "RISK_ALERT",
          title: "Other Tenant Notification",
          message: "Should not see this",
          meta: {},
        },
      });

      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data.some((n: any) => n.id === otherNotification.id)).toBe(false);
    });

    it("should filter by is_read", async () => {
      // Ensure tenant is committed
      await prisma.$queryRaw`SELECT 1`;
      
      // Create read and unread notifications
      await prisma.notification.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          type: "RISK_ALERT",
          title: "Unread Notification",
          message: "Unread",
          is_read: false,
          meta: {},
        },
      });

      await prisma.notification.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          type: "RISK_ALERT",
          title: "Read Notification",
          message: "Read",
          is_read: true,
          meta: {},
        },
      });

      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .get("/api/v1/notifications?is_read=false")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data.every((n: any) => n.is_read === false)).toBe(true);
    });

    it("should filter by type", async () => {
      // Ensure tenant is committed
      await prisma.$queryRaw`SELECT 1`;
      
      await prisma.notification.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          type: "RISK_ALERT",
          title: "Risk Alert",
          message: "Risk",
          meta: {},
        },
      });

      await prisma.notification.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          type: "SYSTEM",
          title: "System Notification",
          message: "System",
          meta: {},
        },
      });

      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .get("/api/v1/notifications?type=RISK_ALERT")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data.every((n: any) => n.type === "RISK_ALERT")).toBe(true);
    });

    it("should support pagination", async () => {
      // Ensure tenant is committed
      await prisma.$queryRaw`SELECT 1`;
      
      // Create multiple notifications
      for (let i = 0; i < 5; i++) {
        await prisma.notification.create({
          data: {
            tenantId: testUser.tenant.id,
            userId: testUser.user.id,
            type: "RISK_ALERT",
            title: `Notification ${i}`,
            message: `Message ${i}`,
            meta: {},
          },
        });
      }

      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .get("/api/v1/notifications?limit=2&offset=0")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta.limit).toBe(2);
      expect(response.body.meta.offset).toBe(0);
    });
  });

  describe("POST /api/v1/notifications/:id/read", () => {
    it("should mark notification as read", async () => {
      // Ensure tenant is committed
      await prisma.$queryRaw`SELECT 1`;
      
      const notification = await prisma.notification.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          type: "RISK_ALERT",
          title: "Test Notification",
          message: "Test message",
          is_read: false,
          meta: {},
        },
      });

      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .post(`/api/v1/notifications/${notification.id}/read`)
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data.is_read).toBe(true);
      expect(response.body.data.read_at).toBeDefined();

      // Verify in database
      const updated = await prisma.notification.findUnique({
        where: { id: notification.id },
      });
      expect(updated?.is_read).toBe(true);
      expect(updated?.read_at).not.toBeNull();
    });

    it("should return 404 when notification not found", async () => {
      // Ensure tenant is committed
      await prisma.$queryRaw`SELECT 1`;
      
      const response = await request(app)
        .post("/api/v1/notifications/non-existent-id/read")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it("should return 404 when user from another tenant tries to mark notification", async () => {
      // Ensure tenants are committed
      await prisma.$queryRaw`SELECT 1`;
      
      const notification = await prisma.notification.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          type: "RISK_ALERT",
          title: "Test Notification",
          message: "Test message",
          meta: {},
        },
      });

      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .post(`/api/v1/notifications/${notification.id}/read`)
        .set("Authorization", `Bearer ${otherToken}`)
        .set("X-Tenant-Id", otherUser.tenant.id)
        .expect(404); // Should return 404 (not found) for security

      expect(response.body.error).toBeDefined();
    });
  });

  describe("POST /api/v1/notifications/read-all", () => {
    it("should mark all user's notifications as read", async () => {
      // Ensure tenant is committed
      await prisma.$queryRaw`SELECT 1`;
      
      // Create multiple unread notifications
      for (let i = 0; i < 3; i++) {
        await prisma.notification.create({
          data: {
            tenantId: testUser.tenant.id,
            userId: testUser.user.id,
            type: "RISK_ALERT",
            title: `Notification ${i}`,
            message: `Message ${i}`,
            is_read: false,
            meta: {},
          },
        });
      }

      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .post("/api/v1/notifications/read-all")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data.updatedCount).toBeGreaterThanOrEqual(3);

      // Verify all are marked as read
      const notifications = await prisma.notification.findMany({
        where: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
        },
      });

      expect(notifications.every((n) => n.is_read === true)).toBe(true);
    });

    it("should only mark notifications for current user in current tenant", async () => {
      // Ensure tenants are committed
      await prisma.$queryRaw`SELECT 1`;
      
      // Create notification for test user
      await prisma.notification.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          type: "RISK_ALERT",
          title: "Test User Notification",
          message: "Test",
          is_read: false,
          meta: {},
        },
      });

      // Create notification for other user in same tenant
      await prisma.notification.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: otherUser.user.id,
          type: "RISK_ALERT",
          title: "Other User Notification",
          message: "Other",
          is_read: false,
          meta: {},
        },
      });

      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .post("/api/v1/notifications/read-all")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      // Verify only test user's notification is marked as read
      const testUserNotification = await prisma.notification.findFirst({
        where: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
        },
      });
      expect(testUserNotification?.is_read).toBe(true);

      const otherUserNotification = await prisma.notification.findFirst({
        where: {
          tenantId: testUser.tenant.id,
          userId: otherUser.user.id,
        },
      });
      expect(otherUserNotification?.is_read).toBe(false);
    });
  });

  describe("Tenant Isolation", () => {
    it("should prevent user from Tenant A reading notifications of Tenant B", async () => {
      // Ensure tenants are committed
      await prisma.$queryRaw`SELECT 1`;
      
      // Create notification in Tenant B
      const notification = await prisma.notification.create({
        data: {
          tenantId: otherUser.tenant.id,
          userId: otherUser.user.id,
          type: "RISK_ALERT",
          title: "Tenant B Notification",
          message: "Should not see this",
          meta: {},
        },
      });

      await prisma.$queryRaw`SELECT 1`;

      // Try to access from Tenant A
      const response = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      // Should not return Tenant B's notification
      expect(response.body.data.some((n: any) => n.id === notification.id)).toBe(false);
    });

    it("should enforce tenant_id in all queries", async () => {
      // Ensure tenants and users are committed
      await prisma.$queryRaw`SELECT 1`;
      // Wait a bit for users to be visible
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      // Create notifications in both tenants
      await prisma.notification.create({
        data: {
          tenantId: testUser.tenant.id,
          userId: testUser.user.id,
          type: "RISK_ALERT",
          title: "Tenant A",
          message: "A",
          meta: {},
        },
      });

      await prisma.notification.create({
        data: {
          tenantId: otherUser.tenant.id,
          userId: otherUser.user.id,
          type: "RISK_ALERT",
          title: "Tenant B",
          message: "B",
          meta: {},
        },
      });

      await prisma.$queryRaw`SELECT 1`;

      const response = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${testToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      // Should only return Tenant A's notifications
      expect(response.body.data.every((n: any) => n.tenantId === testUser.tenant.id)).toBe(true);
    });
  });

  describe("Event Integration", () => {
    it("should create notification when risk alert is created", async () => {
      // Ensure test user and tenant are committed
      await prisma.$queryRaw`SELECT 1`;
      
      // This test verifies that the notification hook in RiskAlertService works
      // We'll need to import the service and create a risk alert
      const { riskAlertService } = await import("../../services/risk-alert-service");

      const clientCompany = await prisma.clientCompany.create({
        data: {
          tenantId: testUser.tenant.id,
          name: "Test Company",
          taxNumber: `test-${Date.now()}`,
          legalType: "Limited",
          isActive: true,
        },
      });

      await prisma.$queryRaw`SELECT 1`;

      await riskAlertService.createAlert({
        tenantId: testUser.tenant.id,
        clientCompanyId: clientCompany.id,
        type: "RISK_THRESHOLD_EXCEEDED",
        title: "High Risk Detected",
        message: "Test risk alert",
        severity: "high",
      });

      await prisma.$queryRaw`SELECT 1`;

      // Check if notification was created
      const notifications = await prisma.notification.findMany({
        where: {
          tenantId: testUser.tenant.id,
          type: "RISK_ALERT",
        },
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.some((n) => n.title === "Yeni risk uyarısı")).toBe(true);
    });
  });
});

