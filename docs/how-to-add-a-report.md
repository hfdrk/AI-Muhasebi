# How to Add a New Report Type

This guide walks you through adding a new report type to the AI Muhasebi reporting system. We'll use "COMPANY_CASHFLOW_SUMMARY" as an example.

## Overview

The reporting system consists of several layers:
1. **Domain Model**: ReportDefinition records in the database
2. **Service Layer**: ReportingService methods that generate report data
3. **Export Layer**: ExportService that converts reports to PDF/CSV
4. **API Layer**: Routes that expose endpoints for generating and downloading reports
5. **Frontend Layer**: UI components that allow users to select and view reports

## Step 1: Domain Model / ReportDefinition

### 1.1 Add to Seed Script

Edit `apps/backend-api/prisma/seed-report-definitions.ts` and add your new report definition:

```typescript
{
  code: "COMPANY_CASHFLOW_SUMMARY",
  name: "Müşteri Nakit Akış Özeti",
  description: "Seçili müşteri için belirli tarih aralığında nakit giriş ve çıkış özetleri.",
  isActive: true,
},
```

### 1.2 Run Seed Script

```bash
cd apps/backend-api
pnpm seed:report-definitions
```

This will create or update the ReportDefinition record in your database. The seed script is idempotent, so it's safe to run multiple times.

**Note**: In test environments, ReportDefinitions are automatically seeded via `apps/backend-api/src/test-utils/global-setup.ts`.

## Step 2: ReportingService Integration

### 2.1 Add Method to ReportingService

Edit `apps/backend-api/src/services/reporting-service.ts` and add a new method:

```typescript
/**
 * Generate cash flow summary report for a client company
 * 
 * @param tenantId - The tenant ID to scope the report
 * @param clientCompanyId - The client company ID to generate the report for
 * @param filters - Date range filters with start_date and end_date (ISO date strings)
 * @returns Promise resolving to BaseReportResult with cash flow data
 * @throws NotFoundError if client company is not found or doesn't belong to tenant
 */
async generateCompanyCashflowSummary(
  tenantId: string,
  clientCompanyId: string,
  filters: { start_date: string; end_date: string }
): Promise<BaseReportResult> {
  // Validate client company belongs to tenant
  await this.validateClientCompany(tenantId, clientCompanyId);

  const startDate = new Date(filters.start_date);
  const endDate = new Date(filters.end_date);

  // Query transactions and invoices for cash flow calculation
  // ... your implementation here ...

  // Return report result
  return {
    title: "Müşteri Nakit Akış Özeti",
    period: {
      start_date: filters.start_date,
      end_date: filters.end_date,
    },
    generated_at: new Date().toISOString(),
    rows: [
      // Array of row objects, e.g.:
      // { period: "2024-01", cash_in: 10000, cash_out: 5000, net_cashflow: 5000 }
    ],
    totals: {
      // Summary totals, e.g.:
      // totalCashIn: 100000,
      // totalCashOut: 50000,
      // netCashflow: 50000,
    },
  };
}
```

### 2.2 Guidelines

- **Tenant Scoping**: Always filter queries by `tenantId` to ensure tenant isolation
- **Use Existing Models**: Leverage existing Prisma models (Invoice, Transaction, Document, etc.)
- **Consistent Row Shape**: Keep row objects consistent across the date range
- **Turkish Labels**: Use Turkish labels for report title and column headers
- **Date Handling**: Use ISO date strings for filters, convert to Date objects for queries

### 2.3 Report Result Structure

All report methods must return `BaseReportResult`:

```typescript
interface BaseReportResult {
  title: string;              // Turkish report title
  period: {
    start_date: string;      // ISO date string
    end_date: string;         // ISO date string
  };
  generated_at: string;       // ISO datetime string
  rows: Array<Record<string, any>>;  // Array of data rows
  totals?: Record<string, any>;       // Optional summary totals
}
```

## Step 3: Export Compatibility

### 3.1 How ExportService Works

The `ExportService` (`apps/backend-api/src/services/export-service.ts`) automatically handles any `BaseReportResult`:

- **PDF Export**: Extracts column headers from the first row, creates a table
- **CSV Export**: Uses the same row structure, creates comma-separated values

### 3.2 Ensuring Turkish Column Headers

The ExportService uses `formatHeader()` to convert camelCase keys to readable Turkish labels. For best results:

- Use descriptive camelCase keys in your rows (e.g., `cashIn`, `cashOut`)
- The ExportService will format them, but you can also pre-format in your service method
- For nested objects in `totals`, ensure keys are descriptive

### 3.3 Row Structure Requirements

- First row determines column headers
- All rows should have the same keys
- Values should be serializable (strings, numbers, dates as ISO strings)

## Step 4: API Wiring

### 4.1 Add to Generate Endpoint

Edit `apps/backend-api/src/routes/reporting-routes.ts` and add a case to the switch statement in the `/generate` route:

```typescript
case "COMPANY_CASHFLOW_SUMMARY":
  if (!body.client_company_id) {
    throw new ValidationError("Müşteri şirketi ID'si gerekli.");
  }
  result = await reportingService.generateCompanyCashflowSummary(
    tenantId,
    body.client_company_id,
    body.filters
  );
  break;
```

### 4.2 Add to Download Endpoint

Edit `apps/backend-api/src/routes/report-download-routes.ts` and add the same case to the switch statement in the `/download` route:

```typescript
case "COMPANY_CASHFLOW_SUMMARY":
  if (!body.client_company_id) {
    throw new ValidationError("Müşteri şirketi ID'si gerekli.");
  }
  reportResult = await reportingService.generateCompanyCashflowSummary(
    tenantId,
    body.client_company_id,
    body.filters
  );
  break;
```

## Step 5: Scheduled Reports

### 5.1 Allow in ScheduledReportRunner

Edit `apps/worker-jobs/src/workers/scheduled-report-runner.ts` and add a case to the switch statement in `processScheduledReport()`:

```typescript
case "COMPANY_CASHFLOW_SUMMARY":
  if (!report.clientCompanyId) {
    throw new Error("COMPANY_CASHFLOW_SUMMARY requires client_company_id");
  }
  reportResult = await reportingService.generateCompanyCashflowSummary(
    report.tenantId,
    report.clientCompanyId,
    filters
  );
  break;
```

### 5.2 Filter Keys

The `filters` JSON in ScheduledReport should contain:
- `start_date`: ISO date string (required)
- `end_date`: ISO date string (required)
- Any additional filter keys your report needs

If filters are missing, the runner defaults to the last 30 days.

## Step 6: Frontend Wiring

### 6.1 Add to Report Types

Edit `apps/web-app/src/lib/reports.ts` and add to the `getReportTypeLabel()` function:

```typescript
const labels: Record<string, string> = {
  COMPANY_FINANCIAL_SUMMARY: "Müşteri Finansal Özeti",
  COMPANY_RISK_SUMMARY: "Müşteri Risk Özeti",
  TENANT_PORTFOLIO: "Portföy Özeti",
  DOCUMENT_ACTIVITY: "Belge ve Fatura Aktivitesi",
  COMPANY_CASHFLOW_SUMMARY: "Müşteri Nakit Akış Özeti", // Add this
};
```

Also update `requiresClientCompany()` if your report needs a client company:

```typescript
export function requiresClientCompany(code: string): boolean {
  return code === "COMPANY_FINANCIAL_SUMMARY" 
      || code === "COMPANY_RISK_SUMMARY"
      || code === "COMPANY_CASHFLOW_SUMMARY"; // Add this
}
```

### 6.2 Add to Dropdown

Edit `apps/web-app/src/app/(protected)/raporlar/anlik/page.tsx` and add to the `REPORT_TYPES` array:

```typescript
const REPORT_TYPES = [
  { code: "COMPANY_FINANCIAL_SUMMARY", label: "Müşteri Finansal Özeti" },
  { code: "COMPANY_RISK_SUMMARY", label: "Müşteri Risk Özeti" },
  { code: "TENANT_PORTFOLIO", label: "Portföy Özeti" },
  { code: "DOCUMENT_ACTIVITY", label: "Belge ve Fatura Aktivitesi" },
  { code: "COMPANY_CASHFLOW_SUMMARY", label: "Müşteri Nakit Akış Özeti" }, // Add this
] as const;
```

### 6.3 Optional: Extra Filters

If your report needs additional filters beyond date range and client company:

1. Add filter inputs to the form in `apps/web-app/src/app/(protected)/raporlar/anlik/page.tsx`
2. Pass them in the `filters` object when calling the API
3. Handle them in your ReportingService method

### 6.4 Table Column Mapping

The frontend automatically renders report rows as a table. Column headers are derived from the row keys. For better UX:

- Use descriptive camelCase keys that will format nicely
- Consider adding a mapping function if you need custom column headers

## Step 7: Tests

### 7.1 Backend JSON Generation Test

Add a test to `apps/backend-api/src/routes/__tests__/reporting-routes.integration.test.ts`:

```typescript
it("should generate COMPANY_CASHFLOW_SUMMARY report", async () => {
  const response = await request(app)
    .post("/api/v1/reports/generate")
    .set("Authorization", `Bearer ${authToken}`)
    .set("X-Tenant-Id", testUser.tenant.id)
    .send({
      report_code: "COMPANY_CASHFLOW_SUMMARY",
      client_company_id: company1.id,
      filters: {
        start_date: "2024-01-01T00:00:00Z",
        end_date: "2024-12-31T23:59:59Z",
      },
    })
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(response.body.data.title).toBe("Müşteri Nakit Akış Özeti");
  expect(response.body.data.rows).toBeDefined();
  expect(response.body.data.totals).toBeDefined();
});
```

### 7.2 Export Test (Optional)

If you want to test PDF/Excel export, add to `apps/backend-api/src/routes/__tests__/report-download.integration.test.ts`:

```typescript
it("should export COMPANY_CASHFLOW_SUMMARY as PDF", async () => {
  const response = await request(app)
    .post("/api/v1/reports/download")
    .set("Authorization", `Bearer ${authToken}`)
    .set("X-Tenant-Id", testUser.tenant.id)
    .send({
      report_code: "COMPANY_CASHFLOW_SUMMARY",
      client_company_id: company1.id,
      filters: {
        start_date: "2024-01-01T00:00:00Z",
        end_date: "2024-12-31T23:59:59Z",
      },
      format: "pdf",
    })
    .expect(200);

  expect(response.headers["content-type"]).toContain("application/pdf");
});
```

### 7.3 Reference Existing Tests

See `apps/backend-api/src/routes/__tests__/reporting-routes.integration.test.ts` for comprehensive examples of:
- Detailed assertions for report structure
- Tenant isolation tests
- RBAC tests
- Edge cases (empty data, invalid inputs)

## File Reference Summary

| Step | File | What to Change |
|------|------|----------------|
| 1 | `apps/backend-api/prisma/seed-report-definitions.ts` | Add ReportDefinition entry |
| 2 | `apps/backend-api/src/services/reporting-service.ts` | Add `generateXxx()` method |
| 4 | `apps/backend-api/src/routes/reporting-routes.ts` | Add case to `/generate` switch |
| 4 | `apps/backend-api/src/routes/report-download-routes.ts` | Add case to `/download` switch |
| 5 | `apps/worker-jobs/src/workers/scheduled-report-runner.ts` | Add case to switch in `processScheduledReport()` |
| 6 | `apps/web-app/src/lib/reports.ts` | Add to `getReportTypeLabel()` and `requiresClientCompany()` |
| 6 | `apps/web-app/src/app/(protected)/raporlar/anlik/page.tsx` | Add to `REPORT_TYPES` array |
| 7 | `apps/backend-api/src/routes/__tests__/reporting-routes.integration.test.ts` | Add test case |

## Testing Checklist

- [ ] Seed script creates/updates ReportDefinition
- [ ] Backend JSON generation returns correct structure
- [ ] PDF export works (if applicable)
- [ ] CSV export works (if applicable)
- [ ] Scheduled reports can use the new report code
- [ ] Frontend dropdown shows the new report type
- [ ] Frontend displays report results correctly
- [ ] Tenant isolation works (cannot access other tenant's data)
- [ ] RBAC works (appropriate roles can access)

## Common Pitfalls

1. **Forgetting Tenant Scoping**: Always filter by `tenantId` in all queries
2. **Inconsistent Row Structure**: Ensure all rows have the same keys
3. **Missing Client Company Validation**: If report requires `client_company_id`, validate it exists and belongs to tenant
4. **Date Format Issues**: Use ISO date strings consistently
5. **Turkish Labels**: Ensure all user-facing text is in Turkish

## Need Help?

- See existing report implementations in `ReportingService` for patterns
- Check test files for examples of comprehensive testing
- Review `TASK_7E_TEST_SUMMARY.md` for test coverage details




