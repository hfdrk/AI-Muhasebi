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

describe("Messaging API Integration Tests", () => {
  const app = createTestApp();
  const prisma = getTestPrisma();

  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let testToken: string;
  let clientCompanyId: string;

  beforeEach(async () => {
    // Create test user
    testUser = await createTestUser({
      email: `messaging-test-${Date.now()}@example.com`,
    });
    testToken = await getAuthToken(testUser.user.email, "Test123!@#", app);

    // Create client company
    const clientCompany = await prisma.clientCompany.create({
      data: {
        tenantId: testUser.tenant.id,
        name: "Test Client Company",
        taxNumber: "1234567890",
        contactEmail: `client-${Date.now()}@test.com`,
        legalType: "AS",
      },
    });
    clientCompanyId = clientCompany.id;

    await prisma.$queryRaw`SELECT 1`;
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it("should create a message thread", async () => {
    const response = await request(app)
      .post("/api/v1/messaging/threads")
      .set("Authorization", `Bearer ${testToken}`)
      .set("X-Tenant-Id", testUser.tenant.id)
      .send({
        clientCompanyId,
        subject: "Test Thread",
        participantUserIds: [testUser.user.id],
      })
      .expect(201);

    expect(response.body.data).toBeDefined();
    expect(response.body.data.subject).toBe("Test Thread");
  });

  it("should list message threads", async () => {
    const response = await request(app)
      .get("/api/v1/messaging/threads")
      .set("Authorization", `Bearer ${testToken}`)
      .set("X-Tenant-Id", testUser.tenant.id)
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data.data)).toBe(true);
  });

  it("should send a message in a thread", async () => {
    // First create a thread
    const threadResponse = await request(app)
      .post("/api/v1/messaging/threads")
      .set("Authorization", `Bearer ${testToken}`)
      .set("X-Tenant-Id", testUser.tenant.id)
      .send({
        clientCompanyId,
        subject: "Test Thread for Message",
        participantUserIds: [testUser.user.id],
      })
      .expect(201);

    const threadId = threadResponse.body.data.id;

    // Send a message
    const messageResponse = await request(app)
      .post(`/api/v1/messaging/threads/${threadId}/messages`)
      .set("Authorization", `Bearer ${testToken}`)
      .set("X-Tenant-Id", testUser.tenant.id)
      .send({
        content: "Test message content",
      })
      .expect(201);

    expect(messageResponse.body.data).toBeDefined();
    expect(messageResponse.body.data.content).toBe("Test message content");
  });

  it("should get thread with messages", async () => {
    // Create thread first
    const threadResponse = await request(app)
      .post("/api/v1/messaging/threads")
      .set("Authorization", `Bearer ${testToken}`)
      .set("X-Tenant-Id", testUser.tenant.id)
      .send({
        clientCompanyId,
        subject: "Test Thread for Get",
        participantUserIds: [testUser.user.id],
      })
      .expect(201);

    const threadId = threadResponse.body.data.id;

    // Get thread
    const getResponse = await request(app)
      .get(`/api/v1/messaging/threads/${threadId}`)
      .set("Authorization", `Bearer ${testToken}`)
      .set("X-Tenant-Id", testUser.tenant.id)
      .expect(200);

    expect(getResponse.body.data).toBeDefined();
    expect(getResponse.body.data.id).toBe(threadId);
    expect(Array.isArray(getResponse.body.data.messages)).toBe(true);
  });
});


