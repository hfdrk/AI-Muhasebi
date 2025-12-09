# AI Muhasebi - Turkish Accounting SaaS Platform

[![CI](https://github.com/your-org/ai-muhasebi/workflows/CI/badge.svg)](https://github.com/your-org/ai-muhasebi/actions)

## Overview

AI Muhasebi is a modern SaaS platform designed for Turkish accounting offices. The platform provides multi-tenant document and invoice analysis, anomaly detection, risk scoring, client management, dashboards, and comprehensive reporting capabilities.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker (for local PostgreSQL and Redis)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables (see Environment Variables section)
4. Start local services (PostgreSQL, Redis):
   ```bash
   docker-compose up -d
   ```
5. Run database migrations
6. Start development servers:
   ```bash
   pnpm dev
   ```

### Environment Variables

Each app has its own `.env.example` file. Copy these to `.env.local` and fill in the values.

See `packages/config` for centralized configuration management.

## Project Structure

This is a Turborepo monorepo containing:

- **apps/**: Applications (web-app, backend-api, worker-jobs, admin-tools)
- **packages/**: Shared packages (ui, core-domain, api-client, shared-utils, config, i18n)
- **infra/**: Infrastructure as Code and deployment scripts
- **docs/**: Architecture and API documentation

For detailed architecture documentation, see `docs/architecture/`.

## Development

### Running Apps Locally

- `pnpm dev`: Start all apps in development mode
- Individual apps can be run with `pnpm --filter <app-name> dev`
- `pnpm dev:worker`: Start the background worker service (document processing, risk calculations, integration sync)

**Typical development setup:**
```bash
# Terminal 1: Backend API
pnpm --filter backend-api dev

# Terminal 2: Frontend
pnpm --filter web-app dev

# Terminal 3: Worker (for background processing)
pnpm dev:worker
```

See [Worker Jobs Documentation](docs/WORKER_JOBS.md) for details on what the worker does and how to configure it.

### Running Tests

**Full Test Suite:**
```bash
pnpm test
```

This runs the complete test suite for all apps. Note that full backend tests can be heavier and take longer to complete.

**Smoke Tests (Quick Validation):**

For quick validation after deployment or when checking system health, use the smoke test suite:

```bash
# Backend smoke tests only
pnpm smoke:backend

# Full stack smoke tests (backend + web app)
pnpm smoke:full

# Worker smoke tests
pnpm smoke:worker
```

The smoke test suite is designed to be:
- Small and deterministic
- Fast to run (typically completes in under a minute)
- Covers critical happy-path flows: auth, core domain operations, reporting, notifications, settings, and audit logs

For more details, see:
- Backend smoke tests: `apps/backend-api/src/routes/__tests__/smoke.integration.test.ts`
- Web app smoke tests: `apps/web-app/e2e/smoke.spec.ts`
- Worker smoke test: `apps/worker-jobs/src/smoke-test.ts`

### Code Style

- ESLint for linting: `pnpm lint`
- Prettier for formatting: `pnpm format`

### Type Checking

```bash
pnpm type-check
```

## CI/CD

The project uses GitHub Actions for continuous integration. The CI pipeline includes:

- **Lint**: Code linting with ESLint and format checking with Prettier
- **Type Check**: TypeScript type checking across all packages
- **Test**: Backend API tests with focused test suite (auth, RBAC, tenant isolation, health checks)
- **Build**: Production build verification for all apps
- **Web App Checks**: Separate lint and type-check for the web app

The CI runs on:
- Push to `main`, `develop`, or `staging` branches
- Pull requests targeting these branches

To view CI status, check the [Actions tab](https://github.com/your-org/ai-muhasebi/actions) in GitHub.

**Note**: Update the CI badge URL in this README to match your repository path.

## Production Build & Run

### Building for Production

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Build all apps:
   ```bash
   pnpm build
   ```

   This will:
   - Compile TypeScript in `apps/backend-api` and `apps/worker-jobs` to `dist/` folders
   - Build Next.js app in `apps/web-app` to `.next/` folder
   - Generate Prisma clients

3. Set up environment variables:
   - Copy `.env.example` to `.env` and fill in production values
   - Ensure `NODE_ENV=production`
   - Set `NEXT_PUBLIC_API_BASE_URL` to your production API URL

### Running in Production

1. Start backend API:
   ```bash
   pnpm --filter backend-api start
   ```
   Or from the backend-api directory:
   ```bash
   cd apps/backend-api && pnpm start
   ```

2. Start worker jobs (in a separate process):
   ```bash
   pnpm --filter worker-jobs start
   ```

3. Start web app:
   ```bash
   pnpm --filter web-app start
   ```

   Or use the root start script to run backend and web-app together:
   ```bash
   pnpm start
   ```

### Environment Configuration

**Environment Files Location:**
- Backend API: `apps/backend-api/.env` (copy from `apps/backend-api/.env.example`)
- Web App: `apps/web-app/.env.local` (copy from `apps/web-app/.env.example`)
- Worker Jobs: `apps/worker-jobs/.env` (copy from `apps/worker-jobs/.env.example`)

**Minimal Required Variables:**

- `DATABASE_URL`: PostgreSQL connection string (required for all apps)
- `JWT_SECRET`: Secret key for JWT tokens (min 32 characters, required for backend-api)
- `NEXT_PUBLIC_API_BASE_URL`: Public API URL for frontend (required for web-app)
- `CORS_ORIGIN` or `FRONTEND_URL`: Frontend URL for CORS (required for backend-api)
- `LOG_LEVEL`: Logging level (debug, info, warn, error) - optional

**Email/Queue Configuration:**
- Email service configuration is optional for local development (stubs are used)
- Queue/background job processing uses database-backed jobs (no external queue required)

See `.env.example` files in each app directory for complete variable lists.

## Deployment

### High-Level Deployment Process

The system is designed for container-based deployment (Docker, Kubernetes, etc.).

**Pre-Deployment Steps:**
1. Run database migrations before deploying new version:
   ```bash
   cd apps/backend-api
   pnpm db:migrate:deploy
   ```
2. Ensure environment variables are configured in your deployment environment
3. Build production artifacts:
   ```bash
   pnpm build
   ```

**Health Endpoints:**

The backend API exposes health check endpoints for orchestration systems:

- `GET /healthz` - Lightweight health check (returns 200 if HTTP server is up)
- `GET /readyz` - Readiness check (returns 200 when database is reachable, 503 otherwise)

These endpoints are:
- Not protected by authentication (used by load balancers/k8s)
- Should be used for health probes and readiness checks
- Example usage:
  ```bash
  curl http://localhost:3800/healthz
  curl http://localhost:3800/readyz
  ```
  Or use the helper script:
  ```bash
  ./scripts/healthcheck-backend.sh [API_URL]
  ```

**Post-Deployment Verification:**

After deployment, verify system health:

1. Check health endpoints:
   ```bash
   curl http://your-api-url/healthz
   curl http://your-api-url/readyz
   ```

2. Run smoke tests:
   ```bash
   pnpm smoke:backend
   # Or full stack:
   pnpm smoke:full
   ```

3. Check application logs for errors

**Database Migrations:**

Always run migrations before deploying a new version:
```bash
cd apps/backend-api
pnpm db:migrate:deploy
```

For detailed deployment guides and infrastructure setup, see `docs/deployment/`.

## Support

For issues and questions, please open an issue in the repository.

