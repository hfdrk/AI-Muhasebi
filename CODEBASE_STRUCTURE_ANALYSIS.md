# AI Muhasebi - Codebase Structure Analysis

## Executive Summary

**AI Muhasebi** is a comprehensive Turkish accounting SaaS platform built as a **Turborepo monorepo**. The system provides multi-tenant document and invoice analysis, anomaly detection, risk scoring, client management, dashboards, and comprehensive reporting capabilities for Turkish accounting offices.

## Monorepo Structure

The project uses **pnpm workspaces** with **Turborepo** for build orchestration:

```
scx/
├── apps/                    # Applications
│   ├── backend-api/         # Express.js REST API server
│   ├── web-app/            # Next.js 14 frontend application
│   ├── worker-jobs/        # Background job processor
│   ├── mobile-app/         # React Native mobile app
│   └── admin-tools/        # Next.js admin console
├── packages/               # Shared packages
│   ├── api-client/         # TypeScript API client for frontend
│   ├── core-domain/        # Domain entities and business logic
│   ├── shared-utils/       # Shared utilities (JWT, logging, etc.)
│   ├── config/             # Centralized configuration
│   ├── i18n/               # Internationalization (Turkish)
│   └── ui/                 # Shared UI components
├── docs/                   # Documentation
├── infra/                  # Infrastructure as Code
├── scripts/                # Utility scripts
└── test-results/           # Test execution results
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 15 (Prisma ORM)
- **Cache/Queue**: Redis 7
- **Storage**: S3-compatible (MinIO for local dev)
- **Authentication**: JWT (access + refresh tokens)
- **Testing**: Vitest
- **Language**: TypeScript

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Styling**: CSS Modules + Design System
- **Testing**: Playwright (E2E)
- **Language**: TypeScript

### Worker
- **Runtime**: Node.js 18+
- **Processing**: Polling-based job queue (database-backed)
- **Tasks**: Document processing, risk calculations, integration syncs, scheduled reports

## Architecture Patterns

### 1. Multi-Tenancy

**Strict tenant isolation** enforced at multiple layers:

- **Database Level**: All tenant-bound entities include `tenantId` field
- **API Level**: Tenant context extracted from JWT token (never from request body)
- **Middleware**: `tenantMiddleware` validates tenant membership on every request
- **Service Layer**: All queries automatically filter by `tenantId`
- **Customer Isolation**: ReadOnly users are automatically scoped to their client company

**Key Files:**
- `apps/backend-api/src/middleware/tenant-middleware.ts`
- `apps/backend-api/src/utils/customer-isolation.ts`
- `docs/architecture/multi-tenancy.md`

### 2. Role-Based Access Control (RBAC)

**Roles:**
- `TenantOwner`: Full access to tenant
- `Accountant`: Full access except tenant settings
- `Staff`: Limited access
- `ReadOnly`: Customer portal access (scoped to their company)
- `PLATFORM_ADMIN`: Platform-level administration
- `PLATFORM_SUPPORT`: Platform support access

**Permissions**: Granular permission system with `requirePermission` middleware

**Key Files:**
- `packages/core-domain/src/types/roles.ts`
- `packages/core-domain/src/types/permissions.ts`
- `apps/backend-api/src/middleware/rbac-middleware.ts`
- `docs/architecture/rbac.md`

### 3. API Architecture

**RESTful API** with versioning (`/api/v1/...`)

**Route Organization:**
- Modular route files (one per domain)
- Middleware chain: `authMiddleware` → `tenantMiddleware` → `rbacMiddleware`
- Service layer handles business logic
- Prisma for data access

**Key Routes:**
- `/api/v1/auth` - Authentication
- `/api/v1/tenants` - Tenant management
- `/api/v1/client-companies` - Client company CRUD
- `/api/v1/documents` - Document management & AI processing
- `/api/v1/invoices` - Invoice management
- `/api/v1/transactions` - Transaction management
- `/api/v1/risk` - Risk scoring & alerts
- `/api/v1/integrations` - Third-party integrations
- `/api/v1/reports` - Reporting & exports
- `/api/v1/notifications` - In-app notifications
- `/api/v1/messaging` - Client communication
- `/api/v1/admin` - Platform administration
- `/api/v1/e-fatura`, `/api/v1/e-arsiv`, `/api/v1/e-defter` - Turkish e-invoicing
- `/api/v1/tax` - Tax compliance
- `/api/v1/kvkk` - GDPR compliance (Turkish KVKK)

**Key Files:**
- `apps/backend-api/src/server.ts` - Main server setup
- `apps/backend-api/src/routes/` - All route definitions
- `apps/backend-api/src/services/` - Business logic services

### 4. Frontend Architecture

**Next.js 14 App Router** with route groups:

**Route Structure:**
- `(protected)/` - Accountant dashboard (requires auth)
- `(client)/` - Client portal (ReadOnly users)
- `auth/` - Authentication pages
- `api/` - Next.js API routes (health checks)

**Key Features:**
- Server-side rendering (SSR) where appropriate
- Client-side data fetching with React Query
- Real-time updates via Server-Sent Events (SSE)
- Turkish language UI throughout
- Responsive design

**Key Files:**
- `apps/web-app/src/app/` - Page components
- `apps/web-app/src/components/` - Reusable components
- `apps/web-app/src/hooks/` - Custom React hooks
- `apps/web-app/src/lib/` - Utilities
- `packages/api-client/` - Type-safe API client

### 5. Worker Architecture

**Background Job Processing** with polling-based queue:

**Job Types:**
1. **Document Processing**: OCR, parsing, AI analysis
2. **Risk Calculation**: Daily risk score calculations
3. **Integration Sync**: Periodic sync with external systems
4. **Scheduled Reports**: Automated report generation
5. **AI Summaries**: Daily AI-generated summaries
6. **Contract Expiration**: Daily contract expiration checks

**Processing Flow:**
- Jobs stored in database (`DocumentProcessingJob`, `IntegrationSyncJob`)
- Worker polls for pending jobs
- Processors handle specific job types
- Retry logic with exponential backoff
- Health checks for orchestration

**Key Files:**
- `apps/worker-jobs/src/worker.ts` - Main worker loop
- `apps/worker-jobs/src/processors/` - Job processors
- `apps/worker-jobs/src/schedulers/` - Scheduled job runners

## Database Schema

**PostgreSQL** with Prisma ORM

**Core Models:**
- `User` - Platform users
- `Tenant` - Accounting offices (multi-tenant)
- `UserTenantMembership` - User-tenant relationships with roles
- `ClientCompany` - Client companies managed by tenants
- `Document` - Uploaded documents (invoices, receipts, etc.)
- `Invoice` - Invoices
- `Transaction` - Financial transactions
- `DocumentRiskScore` - AI-calculated risk scores
- `RiskAlert` - Risk alerts and notifications
- `TenantIntegration` - Third-party integrations
- `Notification` - In-app notifications
- `MessageThread` - Client communication threads
- `Task` - Task management
- `SavedFilter` - User-saved filter configurations
- `AuditLog` - Comprehensive audit trail

**Key Features:**
- Multi-tenant isolation via `tenantId` on all tenant-bound entities
- Soft deletes where appropriate
- JSON fields for flexible metadata
- Comprehensive indexes for performance
- Migration-based schema evolution

**Key Files:**
- `apps/backend-api/prisma/schema.prisma` - Database schema
- `docs/architecture/database-schema.md` - Schema documentation

## Shared Packages

### `@repo/core-domain`
Domain entities, value objects, and business logic:
- Entity classes (User, Tenant, Document, etc.)
- Role and permission types
- Repository interfaces
- Plan configuration

### `@repo/api-client`
Type-safe API client for frontend:
- One client per domain (auth, documents, invoices, etc.)
- React Query hooks (optional)
- TypeScript types matching backend

### `@repo/shared-utils`
Shared utilities:
- JWT generation/verification
- Password hashing
- Logging utilities
- Error classes
- Date utilities
- LLM client abstraction (OpenAI, Anthropic)

### `@repo/config`
Centralized configuration:
- Environment variable validation
- Database configuration
- Storage configuration
- Redis configuration

### `@repo/i18n`
Internationalization:
- Turkish translations
- Formatters (dates, numbers, currency)
- Locale management

### `@repo/ui`
Shared UI components:
- Design system tokens
- Reusable components
- Themes

## Key Features

### 1. Document Management
- Upload documents (PDF, images, ZIP files)
- OCR processing (Tesseract, AWS Textract, Google Vision)
- AI-powered document parsing
- Document requirements tracking
- Missing documents alerts

### 2. Risk Scoring
- AI-powered risk calculation
- Multiple risk factors (amount anomalies, date patterns, etc.)
- Risk alerts with severity levels
- Risk trends and forecasting
- ML-based fraud detection
- Risk heatmaps and breakdowns

### 3. Integrations
- Accounting software (Logo, Mikro, ETA)
- Banks (Garanti, İş Bankası)
- E-invoicing systems (e-Fatura, e-Arşiv, e-Defter)
- Field mapping for data import

### 4. Reporting
- Financial reports
- Tax reports (KDV, TMS)
- Risk reports
- Custom report definitions
- Scheduled reports (email delivery)
- PDF and Excel exports

### 5. Client Portal
- ReadOnly user access
- Scoped to their company data
- Document upload
- Invoice viewing
- Transaction viewing
- Messaging with accountant

### 6. Notifications
- In-app notifications
- Email notifications
- Notification preferences
- Real-time updates via SSE

### 7. Compliance
- KVKK (Turkish GDPR) compliance
- Tax compliance (KDV, TMS)
- Audit logging
- Data retention policies

### 8. Platform Administration
- Tenant management
- User management
- Platform metrics
- Support tools
- Impersonation capabilities

## Development Workflow

### Setup
```bash
# Install dependencies
pnpm install

# Start local services (PostgreSQL, Redis, MinIO)
docker-compose up -d

# Run migrations
cd apps/backend-api && pnpm db:migrate

# Start development servers
pnpm dev
```

### Testing
```bash
# Full test suite
pnpm test

# Smoke tests (quick validation)
pnpm smoke:backend
pnpm smoke:full
pnpm smoke:worker

# E2E tests
pnpm --filter web-app test:e2e
```

### Building
```bash
# Build all apps
pnpm build

# Build specific app
pnpm --filter backend-api build
```

## Deployment

**Container-based deployment** (Docker, Kubernetes)

**Services:**
- `backend-api`: Express.js API server (port 3800)
- `web-app`: Next.js frontend (port 3000)
- `worker-jobs`: Background job processor
- `postgres`: PostgreSQL database
- `redis`: Redis cache/queue
- `minio`: S3-compatible storage (or AWS S3 in production)

**Health Checks:**
- `/healthz` - Lightweight health check
- `/readyz` - Readiness check (database connectivity)

**Key Files:**
- `docker-compose.yml` - Local development setup
- `apps/backend-api/Dockerfile` - Backend container
- `apps/web-app/Dockerfile` - Frontend container
- `apps/worker-jobs/Dockerfile` - Worker container
- `docs/deployment/` - Deployment documentation

## Security

- **Authentication**: JWT with access/refresh tokens
- **Authorization**: RBAC with granular permissions
- **Multi-tenant isolation**: Strict tenant boundaries
- **Rate limiting**: Express rate limiter
- **Security headers**: Helmet.js
- **CORS**: Configurable CORS policies
- **Audit logging**: Comprehensive audit trail
- **Input validation**: Zod schemas
- **SQL injection protection**: Prisma ORM
- **XSS protection**: React's built-in escaping

## Documentation

Comprehensive documentation in `docs/`:
- Architecture decisions (ADR)
- API documentation
- Database schema
- Deployment guides
- Feature documentation
- Development guides

## Key Design Decisions

1. **Monorepo**: Single repository for all apps and packages
2. **Modular Monolith**: Start simple, extract services as needed
3. **TypeScript First**: Full TypeScript coverage
4. **Prisma ORM**: Type-safe database access
5. **Database-backed Jobs**: Simple, reliable job queue
6. **Turkish First**: UI and messages in Turkish
7. **Multi-tenant from Day 1**: Built-in tenant isolation
8. **Comprehensive Testing**: Unit, integration, and E2E tests

## File Count Summary

- **Backend Routes**: ~40 route files
- **Backend Services**: ~60 service files
- **Frontend Pages**: ~50+ page components
- **Frontend Components**: ~30+ reusable components
- **Database Models**: ~40+ Prisma models
- **API Clients**: ~30+ client files
- **Core Domain Entities**: ~30+ entity files

## Next Steps for New Developers

1. Read `README.md` for setup instructions
2. Review `docs/architecture/overview.md` for high-level architecture
3. Explore `apps/backend-api/src/routes/` to understand API structure
4. Check `apps/web-app/src/app/` for frontend pages
5. Review `apps/backend-api/prisma/schema.prisma` for data model
6. Run the application locally and explore features
7. Review test files to understand expected behavior

---

**Last Updated**: 2025-01-XX
**Version**: 0.0.0 (Development)

