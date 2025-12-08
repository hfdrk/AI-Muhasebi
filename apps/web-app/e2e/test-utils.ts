/**
 * Centralized E2E test utilities
 * 
 * This module consolidates all E2E test helpers for consistent usage across tests.
 */

import { Page, expect } from "@playwright/test";

const API_BASE_URL = process.env.API_URL || "http://localhost:3800";

// ============================================================================
// Navigation & Page Helpers
// ============================================================================

export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { timeout });
}

export async function waitForText(page: Page, text: string, timeout = 5000) {
  await page.waitForSelector(`text=${text}`, { timeout });
}

// ============================================================================
// Authentication Helpers
// ============================================================================

export async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for navigation after login
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

export async function registerNewTenant(
  page: Page,
  options: {
    email: string;
    password: string;
    fullName: string;
    tenantName: string;
    tenantSlug: string;
  }
) {
  await navigateTo(page, "/auth/register");

  // Wait for form to be ready
  await page.waitForSelector('input[id="fullName"]', { timeout: 5000 });

  // Fill user information (form uses nested fields: user.fullName, user.email, user.password)
  await page.fill('input[id="fullName"]', options.fullName);
  await page.fill('input[id="email"]', options.email);
  await page.fill('input[id="password"]', options.password);

  // Fill tenant information (form uses nested fields: tenant.name, tenant.slug)
  await page.fill('input[id="tenantName"]', options.tenantName);
  await page.fill('input[id="tenantSlug"]', options.tenantSlug);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

// ============================================================================
// Form Interaction Helpers
// ============================================================================

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

export async function clickButtonByText(page: Page, text: string) {
  await page.click(`button:has-text("${text}")`);
}

// ============================================================================
// Assertion Helpers
// ============================================================================

export async function assertElementVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
}

export async function assertTextVisible(page: Page, text: string) {
  await expect(page.locator(`text=${text}`)).toBeVisible();
}

// ============================================================================
// API Helpers (for test setup/teardown)
// ============================================================================

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  tenantName: string;
  tenantSlug: string;
}

// Helper to get fetch function
async function getFetch() {
  if (typeof fetch !== "undefined") {
    return fetch;
  }
  // Fallback to undici for older Node versions
  const { fetch: undiciFetch } = await import("undici");
  return undiciFetch;
}

export async function createTestUserViaAPI(user: TestUser): Promise<{
  user: { id: string; email: string };
  tenant: { id: string; name: string };
  accessToken: string;
}> {
  const fetchFn = await getFetch();
  
  const response = await fetchFn(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user: {
        email: user.email,
        password: user.password,
        fullName: user.fullName,
      },
      tenant: {
        name: user.tenantName,
        slug: user.tenantSlug,
      },
    }),
  } as any);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Registration failed" } }));
    throw new Error(`Failed to create test user: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return {
    user: data.data.user,
    tenant: { id: data.data.tenantId, name: user.tenantName },
    accessToken: data.data.accessToken,
  };
}

export async function loginViaAPI(email: string, password: string): Promise<string> {
  const fetchFn = await getFetch();
  
  const response = await fetchFn(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  } as any);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Login failed" } }));
    throw new Error(`Failed to login: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return data.data.accessToken;
}

export async function createClientCompanyViaAPI(
  token: string,
  tenantId: string,
  company: {
    name: string;
    taxNumber: string;
    legalType: string;
  }
): Promise<{ id: string }> {
  const fetchFn = await getFetch();
  
  const response = await fetchFn(`${API_BASE_URL}/api/v1/client-companies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Tenant-Id": tenantId,
    },
    body: JSON.stringify({
      ...company,
      isActive: true,
    }),
  } as any);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Failed to create company" } }));
    throw new Error(`Failed to create client company: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return { id: data.data.id };
}

// ============================================================================
// Document Helpers
// ============================================================================

/**
 * Wait for document status to change to target status
 * Polls the document status by checking the UI or API
 */
export async function waitForDocumentStatus(
  page: Page,
  documentId: string,
  targetStatus: "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED",
  timeout = 30000
): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 1000; // Poll every 1 second

  while (Date.now() - startTime < timeout) {
    // Navigate to document detail page
    await navigateTo(page, `/documents/${documentId}`);
    
    // Check for status indicator in the UI
    const statusElement = page.locator(`[data-testid="document-status"], text=${targetStatus}`).first();
    
    if (await statusElement.isVisible({ timeout: 1000 })) {
      const currentStatus = await statusElement.textContent();
      if (currentStatus?.includes(targetStatus)) {
        return;
      }
    }

    // Wait before next poll
    await page.waitForTimeout(pollInterval);
  }

  throw new Error(`Document ${documentId} did not reach status ${targetStatus} within ${timeout}ms`);
}

// ============================================================================
// Test Data Constants
// ============================================================================

export const TEST_CREDENTIALS = {
  email: "test@example.com",
  password: "Test123!@#Pass",
};

export const TEST_COMPANY = {
  name: `E2E Test Company ${Date.now()}`,
  taxNumber: `${Date.now()}`,
  legalType: "Limited" as const,
};

export const TEST_INVOICE = {
  externalId: `INV-E2E-${Date.now()}`,
  issueDate: new Date().toISOString().split("T")[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  totalAmount: "1000",
  vatAmount: "180",
  netAmount: "820",
};

export const TEST_DOCUMENT = {
  fileName: "test-document.pdf",
  type: "INVOICE" as const,
};

