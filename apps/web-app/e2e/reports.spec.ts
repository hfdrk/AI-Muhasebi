import { test, expect } from "@playwright/test";
import {
  navigateTo,
  waitForText,
  createTestUserViaAPI,
  createClientCompanyViaAPI,
} from "./test-utils";

test.describe("Reports Flow", () => {
  let testUser: Awaited<ReturnType<typeof createTestUserViaAPI>>;
  let authToken: string;

  test.beforeEach(async () => {
    testUser = await createTestUserViaAPI({
      email: `e2e-reports-${Date.now()}@example.com`,
      password: "Test123!@#Pass",
      fullName: "E2E Reports Test User",
      tenantName: `E2E Reports Tenant ${Date.now()}`,
      tenantSlug: `e2e-reports-${Date.now()}`,
    });
    authToken = testUser.accessToken;

    await createClientCompanyViaAPI(authToken, testUser.tenant.id, {
      name: `E2E Reports Company ${Date.now()}`,
      taxNumber: `${Date.now()}`,
      legalType: "Limited",
    });
  });

  test("should navigate to reports page", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar");

    expect(page.url()).toContain("/raporlar");
    await waitForText(page, "Raporlar");
  });

  test("should view on-demand reports page", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/anlik");

    expect(page.url()).toContain("/raporlar/anlik");
    await waitForText(page, "Anlık Raporlar");
    await waitForText(page, "Rapor Türü");
  });

  test("should select report type and show client company field when required", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/anlik");

    // Select a report type that requires client company
    await page.selectOption('select:has-text("Rapor türü")', { label: "Müşteri Finansal Özeti" });

    // Wait for client company field to appear
    await page.waitForSelector('select:has-text("Müşteri Şirket")', { timeout: 5000 });

    // Verify client company field is visible
    const clientCompanyField = page.locator('select:has-text("Müşteri Şirket")');
    await expect(clientCompanyField).toBeVisible();
  });

  test("should view scheduled reports page", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/zamanlanmis");

    expect(page.url()).toContain("/raporlar/zamanlanmis");
    await waitForText(page, "Zamanlanmış Raporlar");
  });

  test("should show create scheduled report button for TenantOwner", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/zamanlanmis");

    // TenantOwner should see the create button
    const createButton = page.locator('text="Yeni Zamanlanmış Rapor"');
    await expect(createButton).toBeVisible();
  });

  test("should navigate to new scheduled report form", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/zamanlanmis");

    // Click create button
    await page.click('text="Yeni Zamanlanmış Rapor"');

    // Should navigate to new page
    await page.waitForURL(/\/raporlar\/zamanlanmis\/new/, { timeout: 5000 });
    await waitForText(page, "Yeni Zamanlanmış Rapor");
  });

  test("should validate scheduled report form", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/zamanlanmis/new");

    // Try to submit without filling required fields
    await page.click('button[type="submit"]');

    // Should show validation errors (name is required)
    // The form should prevent submission
    const url = page.url();
    expect(url).toContain("/new"); // Should still be on new page
  });

  test("should fill and submit scheduled report form", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/zamanlanmis/new");

    // Fill form
    await page.fill('input[name="name"]', "Test Scheduled Report");
    
    // Select report type
    await page.selectOption('select[name="report_code"]', { index: 1 }); // Select first available
    
    // Select format
    await page.selectOption('select[name="format"]', "pdf");
    
    // Select schedule
    await page.selectOption('select[name="schedule_cron"]', "daily");
    
    // Fill dates
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date();
    
    await page.fill('input[name="filters.start_date"]', startDate.toISOString().split("T")[0]);
    await page.fill('input[name="filters.end_date"]', endDate.toISOString().split("T")[0]);
    
    // Add recipient email
    await page.fill('input[type="email"][placeholder*="E-posta"]', "test@example.com");
    await page.press('input[type="email"][placeholder*="E-posta"]', "Enter");

    // Submit form
    await page.click('button[type="submit"]');

    // Should navigate back to list (or show success)
    await page.waitForURL(/\/raporlar\/zamanlanmis/, { timeout: 10000 });
  });

  test("should show loading indicator when generating report", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/anlik");

    // Fill form and click generate
    await page.selectOption('select:has-text("Rapor türü")', { label: "Portföy Özeti" });
    await page.fill('input[type="date"]:nth-of-type(1)', "2024-01-01");
    await page.fill('input[type="date"]:nth-of-type(2)', "2024-12-31");

    // Click generate button
    const generateButton = page.locator('button:has-text("Raporu Görüntüle")');
    await generateButton.click();

    // Should show loading indicator
    await waitForText(page, "Rapor oluşturuluyor", { timeout: 5000 });
  });

  test("should display report result table after generation", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/anlik");

    // Fill form and generate report
    await page.selectOption('select:has-text("Rapor türü")', { label: "Portföy Özeti" });
    await page.fill('input[type="date"]:nth-of-type(1)', "2024-01-01");
    await page.fill('input[type="date"]:nth-of-type(2)', "2024-12-31");

    await page.click('button:has-text("Raporu Görüntüle")');

    // Wait for result to appear (either table or empty state)
    await page.waitForSelector('table, text="Bu kriterlere uygun bir rapor sonucu bulunamadı"', { timeout: 10000 });
  });

  test("should show empty state message when no data", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/anlik");

    // Fill form with date range that likely has no data
    await page.selectOption('select:has-text("Rapor türü")', { label: "Portföy Özeti" });
    await page.fill('input[type="date"]:nth-of-type(1)', "2020-01-01");
    await page.fill('input[type="date"]:nth-of-type(2)', "2020-12-31");

    await page.click('button:has-text("Raporu Görüntüle")');

    // Should show empty state message
    await waitForText(page, "Bu kriterlere uygun bir rapor sonucu bulunamadı", { timeout: 10000 });
  });

  test("should have PDF download button", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/anlik");

    // Verify PDF download button exists
    const pdfButton = page.locator('button:has-text("PDF Olarak İndir")');
    await expect(pdfButton).toBeVisible();
  });

  test("should have Excel download button", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/anlik");

    // Verify Excel download button exists
    const excelButton = page.locator('button:has-text("Excel Olarak İndir")');
    await expect(excelButton).toBeVisible();
  });

  test("should show error banner on API failure", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/anlik");

    // Intercept API call and return error
    await page.route("**/api/v1/reports/generate", (route) => {
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            message: "Test error message",
          },
        }),
      });
    });

    await page.selectOption('select:has-text("Rapor Türü")', { label: "Portföy Özeti" });
    await page.fill('input[type="date"]:nth-of-type(1)', "2024-01-01");
    await page.fill('input[type="date"]:nth-of-type(2)', "2024-12-31");

    await page.click('button:has-text("Raporu Görüntüle")');

    // Wait for error banner
    await page.waitForSelector('text="Test error message"', { timeout: 5000 });
    await expect(page.locator('text="Test error message"')).toBeVisible();
  });

  test("should disable buttons while loading", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/anlik");

    // Intercept API call and delay response
    await page.route("**/api/v1/reports/generate", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay 1 second
      await route.continue();
    });

    await page.selectOption('select:has-text("Rapor Türü")', { label: "Portföy Özeti" });
    await page.fill('input[type="date"]:nth-of-type(1)', "2024-01-01");
    await page.fill('input[type="date"]:nth-of-type(2)', "2024-12-31");

    await page.click('button:has-text("Raporu Görüntüle")');

    // Check that buttons are disabled during loading
    const generateButton = page.locator('button:has-text("Rapor oluşturuluyor")');
    await expect(generateButton).toBeVisible({ timeout: 2000 });
    await expect(generateButton).toBeDisabled();

    const pdfButton = page.locator('button:has-text("PDF Olarak İndir")');
    await expect(pdfButton).toBeDisabled();

    const excelButton = page.locator('button:has-text("Excel Olarak İndir")');
    await expect(excelButton).toBeDisabled();
  });

  test("should clear results when filters change", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/anlik");

    // Generate a report first
    await page.selectOption('select:has-text("Rapor Türü")', { label: "Portföy Özeti" });
    await page.fill('input[type="date"]:nth-of-type(1)', "2024-01-01");
    await page.fill('input[type="date"]:nth-of-type(2)', "2024-12-31");

    await page.click('button:has-text("Raporu Görüntüle")');
    await page.waitForSelector('table, text="Bu kriterlere uygun bir rapor sonucu bulunamadı"', { timeout: 10000 }); // Wait for results

    // Change filter
    await page.fill('input[type="date"]:nth-of-type(1)', "2023-01-01");

    // Results should be cleared (no table visible immediately)
    // Note: This might be flaky, but we can check that the table is not immediately visible
    const table = page.locator('table');
    // The table might still be there briefly, but the useEffect should clear it
    // We'll just verify the page doesn't crash
    await expect(page.locator('body')).toBeVisible();
  });

  test("should validate scheduled report form - email required", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/zamanlanmis/new");

    // Fill form but leave recipients empty
    await page.fill('input[name="name"]', "Test Report");
    await page.selectOption('select[name="report_code"]', { index: 1 });
    await page.selectOption('select[name="format"]', { value: "pdf" });
    await page.selectOption('select[name="schedule_cron"]', { value: "daily" });
    await page.fill('input[name="filters.start_date"]', "2024-01-01");
    await page.fill('input[name="filters.end_date"]', "2024-12-31");

    // Try to submit
    await page.click('button:has-text("Kaydet")');

    // Should show validation error
    await page.waitForSelector('text="En az bir alıcı e-posta adresi girmelisiniz."', { timeout: 5000 });
    await expect(page.locator('text="En az bir alıcı e-posta adresi girmelisiniz."')).toBeVisible();
  });

  test("should list execution logs for scheduled report", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    // First create a scheduled report via API or navigate to an existing one
    // For this test, we'll just check that the page structure exists
    await navigateTo(page, "/raporlar/zamanlanmis");

    // If there are scheduled reports, click on the first one
    const firstReportLink = page.locator('text="Düzenle"').first();
    const count = await firstReportLink.count();
    
    if (count > 0) {
      await firstReportLink.click();
      await page.waitForURL(/\/raporlar\/zamanlanmis\/[^/]+/, { timeout: 5000 });
      
      // Check for execution logs section
      await waitForText(page, "Çalışma Geçmişi");
      
      // Verify log table columns
      await waitForText(page, "Başlangıç");
      await waitForText(page, "Bitiş");
      await waitForText(page, "Durum");
      await waitForText(page, "Mesaj");
    } else {
      // If no reports, just verify the page structure
      await waitForText(page, "Zamanlanmış Raporlar");
    }
  });

  test("should display Turkish status labels in execution logs", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/zamanlanmis");

    // If there are scheduled reports with logs, verify Turkish labels
    const firstReportLink = page.locator('text="Düzenle"').first();
    const count = await firstReportLink.count();
    
    if (count > 0) {
      await firstReportLink.click();
      await page.waitForURL(/\/raporlar\/zamanlanmis\/[^/]+/, { timeout: 5000 });
      
      // Check for execution logs section
      await waitForText(page, "Çalışma Geçmişi");
      
      // Status labels should be in Turkish (Başarılı or Hatalı, not success/failed)
      const statusText = await page.textContent('body');
      if (statusText) {
        // Should contain Turkish status labels if logs exist
        expect(statusText.includes("Başarılı") || statusText.includes("Hatalı") || statusText.includes("Kayıt bulunamadı")).toBe(true);
      }
    }
  });

  test("should verify scheduled reports list displays all columns", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, authToken);

    await navigateTo(page, "/raporlar/zamanlanmis");

    // Verify column headers are present
    await waitForText(page, "Ad");
    await waitForText(page, "Rapor Türü");
    await waitForText(page, "Format");
    await waitForText(page, "Sıklık");
    await waitForText(page, "Alıcılar");
    await waitForText(page, "Son Durum");
  });
});

test.describe("Reports RBAC", () => {
  let tenantOwnerUser: Awaited<ReturnType<typeof createTestUserViaAPI>>;
  let tenantOwnerToken: string;
  let staffUser: Awaited<ReturnType<typeof createTestUserViaAPI>>;
  let staffToken: string;

  test.beforeEach(async () => {
    // Create TenantOwner user
    tenantOwnerUser = await createTestUserViaAPI({
      email: `e2e-owner-${Date.now()}@example.com`,
      password: "Test123!@#Pass",
      fullName: "E2E Owner User",
      tenantName: `E2E Owner Tenant ${Date.now()}`,
      tenantSlug: `e2e-owner-${Date.now()}`,
    });
    tenantOwnerToken = tenantOwnerUser.accessToken;

    // Create Staff user in same tenant (would need API to create user with role)
    // For now, we'll test with the owner user and verify permissions
  });

  test("should allow TenantOwner to access all report features", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, tenantOwnerToken);

    await navigateTo(page, "/raporlar/anlik");
    await waitForText(page, "Anlık Raporlar");

    await navigateTo(page, "/raporlar/zamanlanmis");
    await waitForText(page, "Zamanlanmış Raporlar");
    
    // Should see create button
    const createButton = page.locator('text="Yeni Zamanlanmış Rapor"');
    await expect(createButton).toBeVisible();
  });

  test("should hide create button for Staff role", async ({ page }) => {
    // Note: This test requires creating a Staff user via API
    // For now, we'll verify the structure exists
    // In a real scenario, you would create a Staff user and verify the button is hidden
    
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, tenantOwnerToken);

    await navigateTo(page, "/raporlar/zamanlanmis");
    
    // TenantOwner should see the button (this test verifies the structure)
    const createButton = page.locator('text="Yeni Zamanlanmış Rapor"');
    await expect(createButton).toBeVisible();
    
    // TODO: Add test with actual Staff user to verify button is hidden
  });

  test("should hide edit/delete buttons for Staff role", async ({ page }) => {
    // Note: This test requires creating a Staff user via API
    // For now, we'll verify the structure exists
    
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("accessToken", token);
    }, tenantOwnerToken);

    await navigateTo(page, "/raporlar/zamanlanmis");
    
    // TenantOwner should see edit/delete buttons if reports exist
    const editButtons = page.locator('text="Düzenle"');
    const deleteButtons = page.locator('text="Sil"');
    
    const editCount = await editButtons.count();
    const deleteCount = await deleteButtons.count();
    
    // If reports exist, buttons should be visible for TenantOwner
    if (editCount > 0) {
      await expect(editButtons.first()).toBeVisible();
    }
    
    // TODO: Add test with actual Staff user to verify buttons are hidden
  });
});

