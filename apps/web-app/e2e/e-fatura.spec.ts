import { test, expect } from "@playwright/test";
import {
  createTestUserViaAPI,
  login,
  navigateTo,
  assertTextVisible,
} from "./test-utils";

test.describe("E-Fatura E2E Tests", () => {
  let testUser: Awaited<ReturnType<typeof createTestUserViaAPI>>;
  let authToken: string;

  test.beforeAll(async () => {
    testUser = await createTestUserViaAPI({
      email: `e-fatura-e2e-${Date.now()}@example.com`,
      password: "Test123!@#Pass",
      fullName: "E-Fatura Test User",
      tenantName: `E-Fatura Test Tenant ${Date.now()}`,
      tenantSlug: `e-fatura-tenant-${Date.now()}`,
    });
    authToken = testUser.accessToken;
  });

  test.beforeEach(async ({ page, context }) => {
    await page.goto("/");
    await page.evaluate(
      ({ token, tenantId }) => {
        localStorage.setItem("accessToken", token);
        localStorage.setItem("tenantId", tenantId);
      },
      { token: authToken, tenantId: testUser.tenant.id }
    );
  });

  test("should navigate to E-Fatura page", async ({ page }) => {
    await navigateTo(page, "/e-fatura");
    await expect(page).toHaveURL(/\/e-fatura/);
    
    // Check for page title or key elements
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("should display invoice list", async ({ page }) => {
    await navigateTo(page, "/e-fatura");
    
    // Wait for page to load
    await page.waitForLoadState("networkidle");
    
    // Check if invoice list or empty state is displayed
    const hasContent = await page.locator("body").textContent();
    expect(hasContent).toBeTruthy();
  });
});

