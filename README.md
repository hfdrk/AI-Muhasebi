# AI Muhasebi - Turkish Accounting SaaS Platform

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

```bash
pnpm test
```

### Code Style

- ESLint for linting: `pnpm lint`
- Prettier for formatting: `pnpm format`

### Type Checking

```bash
pnpm type-check
```

## Deployment

See `docs/deployment/` for deployment guides and infrastructure setup.

## Support

For issues and questions, please open an issue in the repository.

