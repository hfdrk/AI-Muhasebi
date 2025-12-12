import { test, expect } from "@playwright/test";
import {
  createTestUserViaAPI,
  navigateTo,
} from "./test-utils";

test.describe("KVKK Features E2E Tests", () => {
  let testUser: Awaited<ReturnType<typeof createTestUserViaAPI>>;
  let authToken: string;

  test.beforeAll(async () => {
    testUser = await createTestUserViaAPI({
      email: `kvkk-e2e-${Date.now()}@example.com`,
      password: "Test123!@#Pass",
      fullName: "KVKK Test User",
      tenantName: `KVKK Test Tenant ${Date.now()}`,
      tenantSlug: `kvkk-tenant-${Date.now()}`,
    });
    authToken = testUser.accessToken;
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(
      ({ token, tenantId }) => {
        localStorage.setItem("accessToken", token);
        localStorage.setItem("tenantId", tenantId);
      },
      { token: authToken, tenantId: testUser.tenant.id }
    );
  });

  test("should navigate to KVKK Dashboard", async ({ page }) => {
    await navigateTo(page, "/kvkk");
    await expect(page).toHaveURL(/\/kvkk/);
  });

  test("should navigate to Consent Management page", async ({ page }) => {
    await navigateTo(page, "/kvkk/onaylar");
    await expect(page).toHaveURL(/\/kvkk\/onaylar/);
  });

  test("should navigate to Data Access Requests page", async ({ page }) => {
    await navigateTo(page, "/kvkk/veri-erisim");
    await expect(page).toHaveURL(/\/kvkk\/veri-erisim/);
  });
});

