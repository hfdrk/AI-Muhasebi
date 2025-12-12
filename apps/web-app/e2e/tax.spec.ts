import { test, expect } from "@playwright/test";
import {
  createTestUserViaAPI,
  navigateTo,
} from "./test-utils";

test.describe("Tax Features E2E Tests", () => {
  let testUser: Awaited<ReturnType<typeof createTestUserViaAPI>>;
  let authToken: string;

  test.beforeAll(async () => {
    testUser = await createTestUserViaAPI({
      email: `tax-e2e-${Date.now()}@example.com`,
      password: "Test123!@#Pass",
      fullName: "Tax Test User",
      tenantName: `Tax Test Tenant ${Date.now()}`,
      tenantSlug: `tax-tenant-${Date.now()}`,
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

  test("should navigate to Tax Dashboard", async ({ page }) => {
    await navigateTo(page, "/vergi");
    await expect(page).toHaveURL(/\/vergi/);
  });

  test("should navigate to VAT Optimization page", async ({ page }) => {
    await navigateTo(page, "/vergi/kdv");
    await expect(page).toHaveURL(/\/vergi\/kdv/);
  });

  test("should navigate to Tax Compliance page", async ({ page }) => {
    await navigateTo(page, "/vergi/uyumluluk");
    await expect(page).toHaveURL(/\/vergi\/uyumluluk/);
  });

  test("should navigate to Tax Reporting page", async ({ page }) => {
    await navigateTo(page, "/vergi/raporlar");
    await expect(page).toHaveURL(/\/vergi\/raporlar/);
  });

  test("should navigate to TMS Compliance page", async ({ page }) => {
    await navigateTo(page, "/vergi/tms");
    await expect(page).toHaveURL(/\/vergi\/tms/);
  });
});

