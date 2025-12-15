# ⚠️ CRITICAL: Restart Backend Server

## Problem
The backend server is still using **old database credentials** (trying to use `postgres` user instead of `ai_muhasebi`).

## ✅ Fix Applied
I've updated the `.env` file with correct credentials, but **the backend server needs to be restarted** to pick up the changes.

## 🚀 Action Required

**You MUST restart your backend server:**

1. **Find the terminal where backend is running**
2. **Stop it**: Press `Ctrl+C`
3. **Restart it**:
   ```bash
   pnpm --filter @repo/backend-api dev
   ```

## ✅ After Restart

1. **Verify connection:**
   ```bash
   curl http://localhost:3800/health
   ```
   Should show: `{"status":"ok","db":"ok"}`

2. **Try logging in again:**
   - Email: `demo@demo.local`
   - Password: `demo123`

## 📝 Current Status

- ✅ Database: Running with correct credentials
- ✅ Frontend: Running on port 3000
- ⚠️ Backend: Needs restart to use new credentials
- ✅ Data: 30 high-risk documents ready

Once you restart the backend, everything will work!

