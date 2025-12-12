# Fix Database Credentials

## Problem
The backend is trying to connect with wrong credentials. The error shows it's trying to use `postgres` user, but the database uses `ai_muhasebi` user.

## Solution

### Check Your .env File
Make sure your `.env` file has the correct DATABASE_URL:

```bash
DATABASE_URL="postgresql://ai_muhasebi:ai_muhasebi_dev@localhost:5432/ai_muhasebi"
```

### If .env is Missing or Wrong

1. **Check if .env exists:**
   ```bash
   ls -la .env
   ```

2. **Create or update .env:**
   ```bash
   echo 'DATABASE_URL="postgresql://ai_muhasebi:ai_muhasebi_dev@localhost:5432/ai_muhasebi"' >> .env
   ```

3. **Or copy from .env.example:**
   ```bash
   cp .env.example .env
   # Then edit .env and set DATABASE_URL
   ```

### Database Credentials (from docker-compose.yml)
- **User**: `ai_muhasebi`
- **Password**: `ai_muhasebi_dev`
- **Database**: `ai_muhasebi`
- **Host**: `localhost`
- **Port**: `5432`

### After Fixing .env

1. **Restart backend server:**
   ```bash
   # Stop backend (Ctrl+C)
   pnpm --filter @repo/backend-api dev
   ```

2. **Run migrations:**
   ```bash
   pnpm --filter @repo/backend-api db:migrate
   ```

3. **Verify connection:**
   ```bash
   curl http://localhost:3800/health
   ```
   Should show: `{"status":"ok","db":"ok"}`
