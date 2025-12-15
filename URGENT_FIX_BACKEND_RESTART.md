# ⚠️ URGENT: Backend Server Needs Restart

## 🔴 Problem

The network console shows **404 errors** for `/api/v1/documents/search-by-risk`. This means:

1. **The backend server is running OLD CODE** that doesn't have the `/search-by-risk` route
2. **OR** the backend server crashed/stopped and needs to be restarted

## ✅ Solution: Restart Backend Server

**You MUST restart your backend server** to load the new route:

```bash
# 1. Stop the current backend server
#    Press Ctrl+C in the terminal where backend is running

# 2. Restart it:
pnpm --filter @repo/backend-api dev
```

## 🔍 How to Verify

After restarting, check the backend console output. You should see:
```
Backend API server started
port: 3800
```

Then test the route:
```bash
# This should return 401 (auth required) not 404
curl http://localhost:3800/api/v1/documents/search-by-risk
```

If you get **401 Unauthorized**, the route exists ✅
If you get **404 Not Found**, the route is still missing ❌

## 📝 What Changed

The route `/api/v1/documents/search-by-risk` was added to:
- `apps/backend-api/src/routes/document-ai-routes.ts`
- Registered in `apps/backend-api/src/server.ts`

But the running backend process doesn't have this code loaded yet.

## 🎯 After Restart

1. **Hard refresh browser** (Cmd+Shift+R or Ctrl+Shift+R)
2. **Check Network tab** - should see `200 OK` instead of `404`
3. **Documents should appear** when filtering by "Yüksek Risk"


