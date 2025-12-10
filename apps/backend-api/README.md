# Backend API

The backend API server for AI Muhasebi, providing REST endpoints for the multi-tenant accounting platform.

## Local Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL (via Docker or local installation)

### Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Set required variables (see Environment Variables section)

3. **Start PostgreSQL:**
   ```bash
   docker-compose up -d postgres
   ```

4. **Run database migrations:**
   ```bash
   pnpm db:migrate
   ```

5. **Start development server:**
   ```bash
   pnpm dev
   ```

   The server will start on `http://localhost:3800` (or the port specified in `PORT` env var).

### Environment Variables

Required variables in `.env`:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens (minimum 32 characters)
- `FRONTEND_URL` or `CORS_ORIGIN`: Frontend URL for CORS configuration

Optional variables:

- `PORT`: Server port (default: 3800)
- `LOG_LEVEL`: Logging level (debug, info, warn, error)
- `NODE_ENV`: Environment (development, production, test)

See `.env.example` for complete list.

## Database Migrations

### Development

Create and apply migrations:
```bash
pnpm db:migrate
```

This will:
- Create a new migration if schema changes are detected
- Apply pending migrations to the database
- Generate Prisma client

### Production

Apply migrations without creating new ones:
```bash
pnpm db:migrate:deploy
```

**Important:** Always run migrations before deploying a new version.

### Other Database Commands

- `pnpm db:generate`: Generate Prisma client
- `pnpm db:studio`: Open Prisma Studio (database GUI)

## Health Endpoints

The API exposes health check endpoints for orchestration systems:

### `GET /healthz`

Lightweight health check endpoint. Returns 200 if the HTTP server is up.

**Response (200):**
```json
{
  "status": "ok",
  "service": "backend-api"
}
```

**Usage:**
```bash
curl http://localhost:3800/healthz
```

### `GET /readyz`

Readiness check endpoint. Returns 200 when database is reachable, 503 otherwise.

**Response (200 - Ready):**
```json
{
  "status": "ready"
}
```

**Response (503 - Not Ready):**
```json
{
  "status": "not_ready",
  "details": {
    "error": "Database connection failed"
  }
}
```

**Usage:**
```bash
curl http://localhost:3800/readyz
```

**Note:** These endpoints are NOT protected by authentication and should be used by load balancers, Kubernetes probes, etc.

## Testing

### Full Test Suite

Run all tests:
```bash
pnpm test
```

This will:
- Set up test database
- Run all test files
- Generate test results in `../../test-results/backend-results.json`

### Smoke Tests

Run the smoke test suite for quick validation:
```bash
pnpm test:smoke
```

Or from the root:
```bash
pnpm smoke:backend
```

The smoke test suite covers:
- Auth + tenant creation
- Core domain operations (client companies, invoices, documents)
- Reporting endpoints
- Notifications
- Settings (tenant and user)
- Audit logs

Smoke tests are designed to be:
- Fast (typically completes in under a minute)
- Deterministic and independent
- Cover critical happy-path flows

### Test Database

Tests use a separate test database. The test database is:
- Automatically reset before each test file
- Isolated from development database
- Configured via `DATABASE_URL_TEST` or defaults to `ai_muhasebi_test`

## API Documentation

See `docs/api/` for detailed API documentation.

## Production Build

1. **Build:**
   ```bash
   pnpm build
   ```

   This compiles TypeScript to `dist/` and generates Prisma client.

2. **Start:**
   ```bash
   pnpm start
   ```

   Or use the root start script:
   ```bash
   pnpm --filter backend-api start
   ```

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database credentials

### Port Already in Use

- Change `PORT` in `.env`
- Or stop the process using port 3800

### Migration Errors

- Ensure database is accessible
- Check for conflicting migrations
- Review migration files in `prisma/migrations/`


