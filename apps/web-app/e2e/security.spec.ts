import { test, expect } from "@playwright/test";
import {
  createTestUserViaAPI,
  navigateTo,
} from "./test-utils";

test.describe("Security Features E2E Tests", () => {
  let testUser: Awaited<ReturnType<typeof createTestUserViaAPI>>;
  let authToken: string;

  test.beforeAll(async () => {
    testUser = await createTestUserViaAPI({
      email: `security-e2e-${Date.now()}@example.com`,
      password: "Test123!@#Pass",
      fullName: "Security Test User",
      tenantName: `Security Test Tenant ${Date.now()}`,
      tenantSlug: `security-tenant-${Date.now()}`,
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

  test("should navigate to Security Dashboard", async ({ page }) => {
    await navigateTo(page, "/guvenlik");
    await expect(page).toHaveURL(/\/guvenlik/);
  });

  test("should navigate to 2FA Management page", async ({ page }) => {
    await navigateTo(page, "/guvenlik/2fa");
    await expect(page).toHaveURL(/\/guvenlik\/2fa/);
  });

  test("should navigate to IP Whitelisting page", async ({ page }) => {
    await navigateTo(page, "/guvenlik/ip-izin-listesi");
    await expect(page).toHaveURL(/\/guvenlik\/ip-izin-listesi/);
  });
});

