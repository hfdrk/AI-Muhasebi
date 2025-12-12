import { test, expect } from "@playwright/test";

test.describe("Client Portal E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto("http://localhost:3000/auth/login");
  });

  test("should display client dashboard after login", async ({ page }) => {
    // Login as ReadOnly user (client)
    // Note: This assumes test ReadOnly user exists with email matching client company contactEmail
    await page.fill('input[type="email"]', "client@test.com");
    await page.fill('input[type="password"]', "Test123!@#");
    await page.click('button[type="submit"]');

    // Wait for redirect to client dashboard
    await page.waitForURL("**/client/dashboard", { timeout: 10000 });

    // Verify dashboard elements
    await expect(page.locator("text=Müşteri Panosu")).toBeVisible();
    await expect(page.locator("text=Hoş Geldiniz")).toBeVisible();
  });

  test("should display client documents", async ({ page }) => {
    // Login and navigate to documents
    await page.fill('input[type="email"]', "client@test.com");
    await page.fill('input[type="password"]', "Test123!@#");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/client/dashboard");
    await page.click('text=Belgelerim');

    await expect(page.locator("text=Belgelerim")).toBeVisible();
  });

  test("should display client invoices", async ({ page }) => {
    // Login and navigate to invoices
    await page.fill('input[type="email"]', "client@test.com");
    await page.fill('input[type="password"]', "Test123!@#");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/client/dashboard");
    await page.click('text=Faturalarım');

    await expect(page.locator("text=Faturalarım")).toBeVisible();
  });

  test("should access client settings", async ({ page }) => {
    // Login and navigate to settings
    await page.fill('input[type="email"]', "client@test.com");
    await page.fill('input[type="password"]', "Test123!@#");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/client/dashboard");
    await page.click('text=Ayarlar');

    await expect(page.locator("text=Ayarlar")).toBeVisible();
    await expect(page.locator("text=Bildirim Tercihleri")).toBeVisible();
  });
});

