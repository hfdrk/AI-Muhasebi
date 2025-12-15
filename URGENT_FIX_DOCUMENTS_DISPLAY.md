# URGENT: Fix Documents Not Displaying

## Problem

The documents page shows "No documents yet..." when filtering by "Yüksek Risk" (High Risk), even though:
- ✅ Database has **80 high-risk documents**
- ✅ API endpoint `/api/v1/documents/search-by-risk` exists and is configured
- ✅ Frontend is calling the correct API
- ✅ Backend count calculation has been fixed

## Root Cause Analysis

The issue appears to be a **response structure mismatch** or **query not returning results**.

### Response Structure:
- Backend returns: `{ data: { data: [...], total: 80, ... } }`
- Frontend expects: `PaginatedResponse<T>` which is `{ data: { data: T[], total, ... } }`
- Frontend accesses: `data?.data.data` ✅ Structure matches

### Possible Issues:
1. **Prisma query not filtering correctly** - The `where.riskScore.severity` filter might not be working
2. **Documents missing riskScore relation** - Some documents might not have the relation loaded
3. **Backend not restarted** - The count fix requires a restart

## Fix Applied

1. ✅ Fixed count calculation bug (no longer using `mappedData.length`)
2. ✅ Added debug logging to track query execution
3. ✅ Verified database has 80 high-risk documents

## Next Steps

### 1. RESTART BACKEND SERVER (CRITICAL)
```bash
# Stop current server (Ctrl+C)
pnpm --filter @repo/backend-api dev
```

### 2. Check Backend Logs
After restarting, when you filter by "Yüksek Risk", you should see in backend console:
```
[DocumentService] Filtering by riskSeverity: high
[DocumentService] Found 20 documents, total: 80
```

### 3. Verify API Response
Open browser DevTools → Network tab → Filter by "search-by-risk"
- Should see `200 OK` response
- Response body should have `{ data: { data: [...], total: 80, ... } }`

### 4. Check Frontend Console
- Look for any JavaScript errors
- Verify `documents` array is populated: `console.log(documents)`

## Expected Behavior After Fix

1. Select "Yüksek Risk" from Risk Level filter
2. Should see **20 documents** on page 1
3. Pagination should show **"Toplam 80 belge, Sayfa 1 / 4"**
4. Should be able to navigate through all 4 pages

## If Still Not Working

1. **Check browser console** for errors
2. **Check backend logs** for the debug messages
3. **Verify API response** in Network tab
4. **Hard refresh** browser (Cmd+Shift+R or Ctrl+Shift+R)

