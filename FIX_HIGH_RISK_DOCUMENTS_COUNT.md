# Fix: High-Risk Documents Count Issue

## Problem

The documents page shows "Henüz belge yüklenmemiş..." (No documents uploaded yet) when filtering by "Yüksek Risk" (High Risk), even though:
- ✅ Database has 80 high-risk documents
- ✅ Dashboard correctly shows "80" high-risk documents
- ✅ API endpoint exists and is configured

## Root Cause

The issue was in `apps/backend-api/src/services/document-service.ts` at lines 275-279:

```typescript
// BUG: This was using mappedData.length (current page only, max 20)
// instead of the actual total count from the database
let finalTotal = total;
if (filters.hasRiskFlags !== undefined || filters.riskSeverity || ...) {
  finalTotal = mappedData.length; // ❌ WRONG - only current page!
}
```

When filtering by `riskSeverity`, the code was incorrectly using `mappedData.length` (which is only the current page's data, max 20 items) instead of using the correct `total` from `prisma.document.count({ where })`.

## Fix Applied

Updated the count calculation logic to:
1. ✅ Use the database `total` count for `riskSeverity` filters (already filtered at DB level)
2. ✅ Only recalculate for `hasRiskFlags` (which requires post-query filtering)
3. ✅ Properly handle pagination with correct totals

## Verification

- Database has **80 high-risk documents** ✅
- Prisma query with `riskScore: { severity: 'high' }` filter works correctly ✅
- Count query should now return correct total ✅

## Next Steps

1. **Restart backend server** to apply the fix:
   ```bash
   # Stop current server (Ctrl+C)
   pnpm --filter @repo/backend-api dev
   ```

2. **Refresh browser** and navigate to `/belgeler`

3. **Select "Yüksek Risk"** from the Risk Level filter

4. **Verify**:
   - Should show 80 documents total
   - Should show pagination (4 pages with 20 per page)
   - Should display all high-risk documents

## Expected Result

After restarting the backend:
- Documents page should show **80 high-risk documents**
- Pagination should show **"Toplam 80 belge, Sayfa 1 / 4"**
- All 80 documents should be accessible across 4 pages

