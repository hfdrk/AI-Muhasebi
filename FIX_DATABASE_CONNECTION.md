# 🔴 Fix Database Connection Error

## Problem
The error shows: `Can't reach database server at 'localhost:5432'`

This means **PostgreSQL is not running**.

## ✅ Solution

### Step 1: Start Docker Desktop
1. **Open Docker Desktop** application on your Mac
2. Wait for it to fully start (whale icon in menu bar should be steady)
3. You should see "Docker Desktop is running" in the menu

### Step 2: Start PostgreSQL Container
Once Docker is running, open a terminal and run:

```bash
cd /Users/md/Desktop/MyProjects-2025/AI\ Muhasebi/AI-Muhasebi
docker compose up -d postgres
```

**Note:** Use `docker compose` (newer) or `docker-compose` (older) depending on your Docker version.

### Step 3: Verify Database is Running
```bash
docker ps | grep postgres
```

You should see a container named `ai-muhasebi-postgres` running.

### Step 4: Restart Backend Server
After the database is running, restart your backend:

```bash
# Stop current backend (Ctrl+C)
pnpm --filter @repo/backend-api dev
```

## 🧪 Quick Test

After starting Docker and the database, test the connection:

```bash
docker exec ai-muhasebi-postgres pg_isready -U ai_muhasebi
```

Should return: `localhost:5432 - accepting connections`

## 📝 Alternative: If Docker Won't Start

If you have PostgreSQL installed locally, you can use that instead:

1. Start PostgreSQL service:
   ```bash
   brew services start postgresql@15
   # or
   brew services start postgresql
   ```

2. Create database:
   ```bash
   createdb ai_muhasebi
   ```

3. Update `.env` file with your local PostgreSQL connection string

## 🎯 After Fix

Once the database is running:
1. ✅ Backend can connect to database
2. ✅ Login will work
3. ✅ High-risk documents will be visible
4. ✅ All features will function
