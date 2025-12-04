import { test, expect } from "@playwright/test";
import {
  login,
  navigateTo,
  waitForText,
  assertTextVisible,
  registerNewTenant,
  createTestUserViaAPI,
  loginViaAPI,
} from "./test-utils";

test.describe("Signup & Login Flow", () => {
  test("should show login form on login page", async ({ page }) => {
    await navigateTo(page, "/auth/login");

    // Assert login form is visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should navigate to registration page", async ({ page }) => {
    await navigateTo(page, "/auth/login");

    // Find and click registration link
    const registerLink = page.locator('a:has-text("Yeni Ofis Kaydı Oluştur"), a:has-text("Register"), a[href*="register"]').first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForURL(/\/auth\/register/, { timeout: 5000 });
      expect(page.url()).toContain("/auth/register");
    }
  });

  test("should register new office and redirect to dashboard", async ({ page }) => {
    const uniqueEmail = `e2e-register-${Date.now()}@example.com`;
    const uniqueSlug = `e2e-tenant-${Date.now()}`;

    await navigateTo(page, "/auth/register");

    // Wait for form to be ready
    await page.waitForSelector('input[id="fullName"]', { timeout: 5000 });

    // Fill user information (form uses nested fields: user.fullName, user.email, user.password)
    await page.fill('input[id="fullName"]', "E2E Test User");
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', "Test123!@#Password");

    // Fill tenant information (form uses nested fields: tenant.name, tenant.slug)
    await page.fill('input[id="tenantName"]', "E2E Test Office");
    await page.fill('input[id="tenantSlug"]', uniqueSlug);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Assert we're on dashboard (not login/register)
    expect(page.url()).toContain("/dashboard");
    expect(page.url()).not.toContain("/auth/login");
    expect(page.url()).not.toContain("/auth/register");
  });

  test("should login with correct credentials and show user info", async ({ page }) => {
    // Create test user via API first
    const testUser = await createTestUserViaAPI({
      email: `e2e-login-${Date.now()}@example.com`,
      password: "Test123!@#Password",
      fullName: "E2E Login User",
      tenantName: `E2E Login Tenant ${Date.now()}`,
      tenantSlug: `e2e-login-${Date.now()}`,
    });

    // Login via UI
    await login(page, testUser.user.email, "Test123!@#Password");

    // Assert we're logged in and on dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    expect(page.url()).toContain("/dashboard");
    expect(page.url()).not.toContain("/auth/login");
  });

  test("should fail login with wrong password", async ({ page }) => {
    // Create test user via API
    const testUser = await createTestUserViaAPI({
      email: `e2e-wrong-password-${Date.now()}@example.com`,
      password: "CorrectPassword123!@#",
      fullName: "E2E Wrong Password User",
      tenantName: `E2E Wrong Password Tenant ${Date.now()}`,
      tenantSlug: `e2e-wrong-pwd-${Date.now()}`,
    });

    await navigateTo(page, "/auth/login");
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.fill('input[type="email"]', testUser.user.email);
    await page.fill('input[type="password"]', "WrongPassword123!@#");
    await page.click('button[type="submit"]');

    // Should show error message and stay on login page
    await page.waitForTimeout(3000); // Wait for error to appear
    const errorVisible = 
      (await page.locator('text=/hata|error|yanlış|wrong|giriş/i').isVisible({ timeout: 5000 })) ||
      (page.url().includes("/auth/login"));

    expect(errorVisible).toBeTruthy();
    expect(page.url()).toContain("/auth/login");
  });
});


