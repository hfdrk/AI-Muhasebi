import { test, expect } from "@playwright/test";
import {
  createTestUserViaAPI,
  navigateTo,
} from "./test-utils";

test.describe("Analytics Features E2E Tests", () => {
  let testUser: Awaited<ReturnType<typeof createTestUserViaAPI>>;
  let authToken: string;

  test.beforeAll(async () => {
    testUser = await createTestUserViaAPI({
      email: `analytics-e2e-${Date.now()}@example.com`,
      password: "Test123!@#Pass",
      fullName: "Analytics Test User",
      tenantName: `Analytics Test Tenant ${Date.now()}`,
      tenantSlug: `analytics-tenant-${Date.now()}`,
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

  test("should navigate to Analytics Dashboard", async ({ page }) => {
    await navigateTo(page, "/analitik");
    await expect(page).toHaveURL(/\/analitik/);
  });

  test("should navigate to Financial Trends page", async ({ page }) => {
    await navigateTo(page, "/analitik/finansal-trendler");
    await expect(page).toHaveURL(/\/analitik\/finansal-trendler/);
  });

  test("should navigate to Risk Trends page", async ({ page }) => {
    await navigateTo(page, "/analitik/risk-trendleri");
    await expect(page).toHaveURL(/\/analitik\/risk-trendleri/);
  });
});

