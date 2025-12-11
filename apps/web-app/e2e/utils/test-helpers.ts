import { Page, expect } from "@playwright/test";

/**
 * Helper functions for common E2E test actions
 */

export async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for navigation after login
  await page.waitForURL(/\/(dashboard|clients)/, { timeout: 10000 });
}

export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { timeout });
}

export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

export async function clickButtonByText(page: Page, text: string) {
  await page.click(`button:has-text("${text}")`);
}

export async function fillInputByLabel(page: Page, label: string, value: string) {
  const labelElement = page.locator(`label:has-text("${label}")`);
  const inputId = await labelElement.getAttribute("for");
  if (inputId) {
    await page.fill(`#${inputId}`, value);
  } else {
    // Fallback: find input near the label
    const input = labelElement.locator("..").locator("input, textarea, select").first();
    await input.fill(value);
  }
}

export async function selectOptionByLabel(page: Page, label: string, optionText: string) {
  const labelElement = page.locator(`label:has-text("${label}")`);
  const selectId = await labelElement.getAttribute("for");
  if (selectId) {
    await page.selectOption(`#${selectId}`, { label: optionText });
  } else {
    const select = labelElement.locator("..").locator("select").first();
    await select.selectOption({ label: optionText });
  }
}

export async function waitForText(page: Page, text: string, timeout = 5000) {
  await page.waitForSelector(`text=${text}`, { timeout });
}

export async function assertElementVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
}

export async function assertTextVisible(page: Page, text: string) {
  await expect(page.locator(`text=${text}`)).toBeVisible();
}





