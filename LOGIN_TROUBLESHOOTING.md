# Login Troubleshooting Guide

## Common Login Error: "Bir hata oluştu."

If you're seeing a generic error message when trying to log in, follow these steps:

### 1. Check Backend API is Running

The frontend requires the backend API to be running on port 3800.

**Start the backend:**
```bash
# From project root
pnpm --filter backend-api dev

# Or from backend-api directory
cd apps/backend-api
pnpm dev
```

**Verify it's running:**
- Open: `http://localhost:3800/api/v1/health` (or similar health endpoint)
- Should return a JSON response

### 2. Check Environment Variables

**Frontend (.env.local in apps/web-app/):**
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3800
```

**Backend (.env in apps/backend-api/):**
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

### 3. Check Browser Console

Open browser DevTools (F12) and check:
- **Console tab**: Look for network errors or CORS errors
- **Network tab**: Check if the login request is being made and what the response is

### 4. Verify Database Connection

The backend needs to connect to PostgreSQL:

```bash
# Check if database is running
docker-compose ps

# Or if using external database, verify connection
cd apps/backend-api
pnpm db:status
```

### 5. Check User Exists

The default test user should be:
- Email: `yonetici@ornekofis1.com`
- Password: (check seed scripts or database)

**To create/reset user:**
```bash
# Run seed script
pnpm seed:demo-tenant
```

### 6. Common Error Messages

**"Sunucuya bağlanılamadı"**
- Backend API is not running
- Wrong API URL in environment variables
- Firewall blocking connection

**"HTTP 401 hatası"**
- Invalid email/password
- User doesn't exist
- JWT_SECRET mismatch

**"HTTP 500 hatası"**
- Database connection issue
- Backend server error (check backend logs)

**CORS Error**
- Backend CORS_ORIGIN not set correctly
- Frontend URL not in allowed origins

### 7. Quick Test

**Test API directly:**
```bash
curl -X POST http://localhost:3800/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"yonetici@ornekofis1.com","password":"your-password"}'
```

If this works, the issue is with the frontend configuration.
If this fails, the issue is with the backend.

### 8. Restart Services

Sometimes a clean restart helps:

```bash
# Stop all services
# Then restart:
pnpm --filter backend-api dev  # Terminal 1
pnpm --filter web-app dev      # Terminal 2
```

---

**Still having issues?** Check the backend logs for detailed error messages.

