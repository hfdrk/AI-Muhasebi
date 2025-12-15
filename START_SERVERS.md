# 🚀 How to Start Servers

## Current Status
- ✅ **Database**: Running (PostgreSQL on port 5432)
- ✅ **Backend**: Should be on port 3800
- ⚠️ **Frontend**: Needs to be started on port 3000

## Start Servers

### Option 1: Start Both Servers (Recommended)

Open **two separate terminal windows**:

**Terminal 1 - Backend:**
```bash
cd /Users/md/Desktop/MyProjects-2025/AI\ Muhasebi/AI-Muhasebi
pnpm --filter @repo/backend-api dev
```

**Terminal 2 - Frontend:**
```bash
cd /Users/md/Desktop/MyProjects-2025/AI\ Muhasebi/AI-Muhasebi
pnpm --filter @repo/web-app dev
```

### Option 2: Start from Root (Both in one terminal)

```bash
cd /Users/md/Desktop/MyProjects-2025/AI\ Muhasebi/AI-Muhasebi
pnpm dev
```

This will start both backend and frontend using Turbo.

## Verify Servers Are Running

1. **Backend Health Check:**
   ```bash
   curl http://localhost:3800/health
   ```
   Should return: `{"status":"ok","db":"ok"}`

2. **Frontend Check:**
   ```bash
   curl http://localhost:3000
   ```
   Should return HTML (not connection refused)

## Login Credentials

After servers are running:
- **URL**: http://localhost:3000/auth/login
- **Email**: `demo@demo.local`
- **Password**: `demo123`

## What You'll See After Login

- **Risk Dashboard**: Shows 30 high-risk documents
- **Documents Page**: Filter by "Yüksek Risk" to see all 30 documents
- All features should be working

