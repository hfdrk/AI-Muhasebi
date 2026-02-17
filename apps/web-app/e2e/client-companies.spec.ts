import { test, expect } from "@playwright/test";
import {
  login,
  navigateTo,
  createTestUserViaAPI,
  createClientCompanyViaAPI,
} from "./test-utils";

test.describe("Client Company Flow", () => {
  let testUser: Awaited<ReturnType<typeof createTestUserViaAPI>>;
  let authToken: string;

  test.beforeEach(async () => {
    // Create test user and login
    testUser = await createTestUserViaAPI({
      email: `e2e-client-${Date.now()}@example.com`,
      password: "Test123!@#Password",
      fullName: "E2E Client Test User",
      tenantName: `E2E Client Tenant ${Date.now()}`,
      tenantSlug: `e2e-client-${Date.now()}`,
    });
    authToken = testUser.accessToken;
  });

  test("should navigate to client companies page", async ({ page }) => {
    // Login first using the helper
    await login(page, testUser.user.email, "Test123!@#Password");

    // Navigate to clients page
    await navigateTo(page, "/clients");

    // Assert we're on clients page
    expect(page.url()).toContain("/clients");

    // Assert page title or heading is visible
    const headingVisible = 
      (await page.locator('h1:has-text("Müşteri"), h1:has-text("Client"), h1:has-text("Companies")').isVisible({ timeout: 5000 })) ||
      (await page.locator('text=/müşteri|client|companies/i').first().isVisible({ timeout: 5000 }));

    expect(headingVisible).toBeTruthy();
  });

  test("should create new client company and see it in list", async ({ page }) => {
    const uniqueCompanyName = `E2E Company ${Date.now()}`;
    const uniqueTaxNumber = `${Date.now()}`;

    // Login first
    await login(page, testUser.user.email, "Test123!@#Password");

    // Navigate to clients page
    await navigateTo(page, "/clients");

    // Click "New Client" or "Add Client" button
    const newClientButton = page.locator('button:has-text("Yeni"), button:has-text("New"), button:has-text("Add"), a:has-text("Yeni Müşteri"), a[href*="/clients/new"]').first();
    await newClientButton.click({ timeout: 5000 });

    // Wait for form to appear
    await page.waitForSelector('input[name*="name"], input[id*="name"]', { timeout: 5000 });

    // Fill form
    await page.fill('input[name*="name"], input[id*="name"]', uniqueCompanyName);
    await page.fill('input[name*="taxNumber"], input[id*="taxNumber"]', uniqueTaxNumber);
    
    // Select legal type if dropdown exists
    const legalTypeSelect = page.locator('select[name*="legalType"], select[id*="legalType"]').first();
    if (await legalTypeSelect.isVisible({ timeout: 2000 })) {
      await legalTypeSelect.selectOption("Limited");
    }

    // Submit form
    await page.click('button[type="submit"], button:has-text("Kaydet"), button:has-text("Save")');

    // Wait for redirect or list update
    await page.waitForURL(/\/clients/, { timeout: 10000 });

    // Assert company appears in list
    await expect(page.locator(`text=${uniqueCompanyName}`)).toBeVisible({ timeout: 10000 });
  });

  test("should open client company detail view and see tabs", async ({ page }) => {
    // Create company via API
    const company = await createClientCompanyViaAPI(authToken, testUser.tenant.id, {
      name: `E2E Detail Company ${Date.now()}`,
      taxNumber: `${Date.now()}`,
      legalType: "Limited",
    });

    // Login first
    await login(page, testUser.user.email, "Test123!@#Password");

    // Navigate to company detail page directly
    await navigateTo(page, `/clients/${company.id}`);

    // Wait for detail page to load
    await page.waitForLoadState("networkidle");

    // Assert tabs are visible (check for any tab-like elements or section headers)
    const tabsVisible = 
      (await page.locator('text=/Banka Hesapları|Bank Accounts/i').isVisible({ timeout: 5000 })) ||
      (await page.locator('text=/Faturalar|Invoices/i').isVisible({ timeout: 5000 })) ||
      (await page.locator('text=/İşlemler|Transactions/i').isVisible({ timeout: 5000 })) ||
      (await page.locator('[role="tab"]').count() > 0) ||
      (await page.locator('button[role="tab"], a[role="tab"]').count() > 0);

    expect(tabsVisible).toBeTruthy();
  });
});


