# Fix: High-Risk Documents Not Displaying

## Problem

When selecting "Yüksek Risk" (High Risk) filter on the Documents page:
- ❌ Shows "Henüz belge yüklenmemiş..." (No documents uploaded yet)
- ✅ Database has **80 high-risk documents**
- ✅ Prisma query works correctly (tested)
- ✅ API endpoint exists and is configured

## Root Cause

The issue was caused by **route ordering conflict**:

1. **Route conflict**: `documentRoutes` is registered BEFORE `documentAIRoutes` in `server.ts`
2. **`:id` route catches everything**: The `/:id` route in `documentRoutes` was matching "search-by-risk" as an ID parameter
3. **404 errors**: Express tried to find a document with ID "search-by-risk" instead of calling the search endpoint
4. **Backend server not restarted** - The count calculation fix requires a restart

## Fixes Applied

1. ✅ **Fixed route conflict** - Moved `/search-by-risk` route to `document-routes.ts` BEFORE `/:id` route
   - This ensures the search route is matched before the catch-all `:id` route
   - Added customer isolation enforcement to match other document routes

2. ✅ **Fixed count calculation bug** in `document-service.ts`
   - No longer uses `mappedData.length` (current page only)
   - Uses correct `total` from `prisma.document.count()`

3. ✅ **Added debug logging** to track:
   - When `/search-by-risk` endpoint is called
   - What filters are received
   - What results are returned

4. ✅ **Verified Prisma query** works correctly
   - Test script confirms 80 documents are found
   - Query structure is correct

## Verification Steps

### 1. Restart Backend Server (CRITICAL)
```bash
# Stop current server (Ctrl+C)
pnpm --filter @repo/backend-api dev
```

### 2. Check Backend Logs
After restarting and filtering by "Yüksek Risk", you should see:
```
[DocumentAI Routes] /search-by-risk called with filters: { riskSeverity: 'high', page: 1, pageSize: 20 }
[DocumentService] Filtering by riskSeverity: high
[DocumentService] Found 20 documents, total: 80
[DocumentAI Routes] /search-by-risk result: { documentsCount: 20, total: 80, page: 1, totalPages: 4 }
```

### 3. Check Browser Network Tab
1. Open DevTools → Network tab
2. Filter by "search-by-risk"
3. Select "Yüksek Risk" filter
4. Look for request to `/api/v1/documents/search-by-risk?riskSeverity=high`
5. Check response:
   - Status should be `200 OK`
   - Response body should have: `{ data: { data: [...], total: 80, ... } }`

### 4. Check Browser Console
Look for JavaScript errors that might prevent rendering

## Expected Response Format

The API should return:
```json
{
  "data": {
    "data": [
      {
        "id": "...",
        "originalFileName": "...",
        "riskSeverity": "high",
        "riskScore": 85.5,
        ...
      },
      ...
    ],
    "total": 80,
    "page": 1,
    "pageSize": 20,
    "totalPages": 4
  }
}
```

The frontend accesses: `data?.data.data` which should work with this structure.

## If Still Not Working

1. **Check backend logs** for the debug messages
2. **Check Network tab** for the actual API response
3. **Check browser console** for JavaScript errors
4. **Hard refresh** browser (Cmd+Shift+R / Ctrl+Shift+R)
5. **Clear browser cache** if needed

## Next Steps

1. **Restart backend server** (most important!)
2. **Refresh browser**
3. **Select "Yüksek Risk" filter**
4. **Check backend console** for debug logs
5. **Check Network tab** for API response

The fix is in place - restart the backend to apply it!
