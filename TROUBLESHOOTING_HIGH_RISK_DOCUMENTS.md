# Troubleshooting: High-Risk Documents Not Showing

## ✅ What's Been Fixed

1. **Database Query Filtering**: Updated to filter at the database level using Prisma relations
2. **Route Ordering**: Fixed `/search-by-risk` route to be before `/:id/ai-analysis`
3. **Prisma Relation**: Fixed `documentRiskScore` → `riskScore` relation name

## 🔧 Current Status

- **62 High-Risk Documents** in database ✅
- **Backend Code**: Updated to filter at database level ✅
- **API Route**: Correctly configured ✅

## 🚨 CRITICAL: Restart Required

**You MUST restart your backend server** for the changes to take effect:

```bash
# Stop the current backend server (Ctrl+C)
# Then restart:
pnpm --filter @repo/backend-api dev
```

## 🧪 Verification Steps

1. **Check Database**:
   ```bash
   pnpm tsx scripts/verify-documents.ts
   ```
   Should show 62 high-risk documents

2. **Test API Endpoint** (after restarting backend):
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:3800/api/v1/documents/search-by-risk?riskSeverity=high
   ```

3. **Check Frontend**:
   - Go to `/belgeler`
   - Select "Yüksek Risk" from filter
   - Should see documents

## 🔍 Common Issues

### Issue 1: 404 Errors
**Symptom**: Network console shows 404 for `/api/v1/documents/se...`

**Solution**: 
- Restart backend server
- Verify route is registered: `app.use("/api/v1/documents", documentAIRoutes);`

### Issue 2: Empty Results
**Symptom**: API returns 200 but empty data array

**Solution**:
- Check if documents have `riskScore` relation
- Verify `severity` field is exactly "high" (case-sensitive)
- Run verification script to confirm documents exist

### Issue 3: Dashboard Shows 0
**Symptom**: Risk dashboard shows 0 high-risk documents

**Solution**:
- Dashboard uses different query: `prisma.documentRiskScore.count()`
- This should work if documents have risk scores
- Check if tenant ID matches

## 📝 Code Changes Made

### `document-service.ts`
- Added database-level filtering for `riskSeverity`
- Filter applied to `where.riskScore.severity`
- Updated total count calculation for filtered results

### `document-ai-routes.ts`
- Route order fixed (search-by-risk before :id route)

## 🎯 Expected Behavior

After restarting backend:
1. `/api/v1/documents/search-by-risk?riskSeverity=high` should return documents
2. Frontend filter should show 62 high-risk documents
3. Risk dashboard should show 62 in "Yüksek Riskli Belgeler" card


