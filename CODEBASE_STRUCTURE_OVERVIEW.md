# AI Muhasebi - Codebase Structure Overview

**Generated:** 2025-01-XX  
**Purpose:** Comprehensive overview of the codebase structure, architecture, and organization

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Technology Stack](#technology-stack)
4. [Applications](#applications)
5. [Shared Packages](#shared-packages)
6. [Database Schema](#database-schema)
7. [Architecture Patterns](#architecture-patterns)
8. [Key Features](#key-features)
9. [Development Workflow](#development-workflow)
10. [Infrastructure](#infrastructure)

---

## 🎯 Project Overview

**AI Muhasebi** is a modern, multi-tenant SaaS platform designed for Turkish accounting offices. The platform provides:

- **Document & Invoice Analysis** - OCR, parsing, and AI-powered analysis
- **Risk Detection & Scoring** - Anomaly detection, fraud patterns, risk alerts
- **Client Management** - Multi-tenant client company management
- **Financial Reporting** - Automated reports, scheduled reports, exports
- **Turkish Compliance** - e-fatura, e-arşiv, e-defter, KVKK compliance
- **Integrations** - Accounting software integrations (Mikro, Logo, ETA)
- **Task Management** - Client task tracking and assignment
- **Messaging** - Internal messaging system
- **Notifications** - In-app and email notifications

**Implementation Status:** ~95% complete for core features

---

## 🏗️ Monorepo Structure

This is a **Turborepo monorepo** using **pnpm workspaces** for package management.

```
swb/
├── apps/                    # Applications
│   ├── backend-api/         # Express.js REST API server
│   ├── web-app/             # Next.js 14 frontend (Turkish UI)
│   ├── worker-jobs/         # Background job processing
│   ├── mobile-app/          # React Native mobile app
│   └── admin-tools/         # Admin utilities
├── packages/                # Shared packages
│   ├── core-domain/         # Domain entities, types, value objects
│   ├── api-client/          # Typed API client with React Query hooks
│   ├── shared-utils/         # Utilities (JWT, password, logging, validation)
│   ├── config/              # Centralized configuration
│   ├── ui/                  # Shared UI components & design tokens
│   └── i18n/                # Internationalization (Turkish-first)
├── infra/                   # Infrastructure as Code
├── docs/                    # Architecture & API documentation
├── scripts/                 # Utility scripts
└── reports/                 # Test reports and analysis

```

---

## 🛠️ Technology Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 15 (Prisma ORM)
- **Cache/Queue:** Redis 7
- **Storage:** S3-compatible (MinIO for local dev)
- **Language:** TypeScript 5.3+
- **Testing:** Vitest, Supertest
- **API Docs:** Swagger/OpenAPI

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5.3+
- **Styling:** Tailwind CSS + custom design system
- **State Management:** React Query (server state), Zustand (client state)
- **Forms:** React Hook Form + Zod validation
- **i18n:** next-intl (Turkish-first)
- **Testing:** Playwright (E2E)

### Infrastructure
- **Monorepo:** Turborepo
- **Package Manager:** pnpm 8.15.0
- **Containerization:** Docker, Docker Compose
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry

---

## 📱 Applications

### 1. `apps/backend-api/` - REST API Server

**Port:** 3800  
**Purpose:** Main backend API for all business logic

**Key Components:**
- **Routes:** 50+ route files covering all features
  - Authentication (`auth-routes.ts`)
  - Documents (`document-routes.ts`)
  - Invoices (`invoices-routes.ts`)
  - Risk (`risk-routes.ts`)
  - Reports (`reporting-routes.ts`)
  - Integrations (`integration-routes.ts`)
  - Turkish compliance (`e-fatura-routes.ts`, `e-arsiv-routes.ts`, `kvkk-routes.ts`)
  - And many more...
- **Services:** Business logic layer (70+ service files)
- **Middleware:** Auth, tenant isolation, RBAC, error handling, rate limiting
- **Models:** Prisma-generated types
- **Controllers:** Request/response handling

**Key Features:**
- Multi-tenant isolation enforced at middleware level
- RBAC with role-based permissions
- Comprehensive audit logging
- Rate limiting and security headers
- Health check endpoints (`/healthz`, `/readyz`)

**Database:**
- Prisma schema with 50+ models
- Migrations in `prisma/migrations/`
- Seed scripts for demo data

### 2. `apps/web-app/` - Next.js Frontend

**Port:** 3000  
**Purpose:** Turkish-language web interface

**Structure:**
```
src/
├── app/                    # Next.js App Router pages
│   ├── (protected)/        # Protected routes (require auth)
│   │   ├── dashboard/      # Main dashboard
│   │   ├── belgeler/       # Documents
│   │   ├── faturalar/      # Invoices
│   │   ├── musteriler/     # Clients
│   │   ├── risk/           # Risk dashboard
│   │   ├── raporlar/       # Reports
│   │   ├── ayarlar/        # Settings
│   │   └── ...
│   ├── (client)/           # Client portal routes
│   ├── auth/               # Login, register, password reset
│   └── api/                # API routes (health checks)
├── components/             # React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities
└── styles/                 # Global styles
```

**Key Features:**
- Turkish-first UI (`packages/i18n`)
- Role-based route protection
- Responsive design
- Client portal for ReadOnly users
- Real-time updates (notifications, messaging)

### 3. `apps/worker-jobs/` - Background Worker

**Purpose:** Process background jobs asynchronously

**Job Types:**
- **Document Processing:** OCR, parsing, risk feature extraction
- **Risk Calculation:** Calculate risk scores for documents and clients
- **Integration Sync:** Sync data from external accounting systems
- **Scheduled Reports:** Generate and email scheduled reports
- **Email Sending:** Send notification emails

**Architecture:**
- Database-backed job queue (no external queue required)
- Retry mechanism for failed jobs
- Health check endpoint

### 4. `apps/mobile-app/` - React Native App

**Status:** Basic structure exists  
**Purpose:** Mobile access to platform features

### 5. `apps/admin-tools/` - Admin Utilities

**Purpose:** Platform administration tools

---

## 📦 Shared Packages

### 1. `packages/core-domain/` - Domain Layer

**Purpose:** Core business entities, types, and value objects

**Structure:**
```
src/
├── entities/              # Domain entities (50+ files)
│   ├── document.ts
│   ├── invoice.ts
│   ├── client-company.ts
│   ├── risk-score.ts
│   └── ...
├── value-objects/         # Value objects
├── types/                 # Type definitions
│   ├── roles.ts           # User roles
│   ├── permissions.ts     # Permission definitions
│   └── risk-severity.ts  # Risk severity levels
├── repositories/         # Repository interfaces
└── services/             # Domain services
```

**Key Types:**
- `TENANT_ROLES`: TenantOwner, ReadOnly
- `PLATFORM_ROLES`: PlatformAdmin, Support
- Risk severity levels, permissions, etc.

### 2. `packages/api-client/` - API Client

**Purpose:** Typed API client for frontend

**Structure:**
```
src/
├── api-client.ts         # Base client
├── clients/              # Feature-specific clients
│   ├── auth-client.ts
│   ├── document-client.ts
│   ├── invoice-client.ts
│   ├── risk-client.ts
│   └── ... (30+ clients)
└── hooks/                # React Query hooks
```

**Features:**
- Type-safe API calls
- React Query integration
- Automatic error handling
- Request/response validation

### 3. `packages/shared-utils/` - Utilities

**Purpose:** Shared utility functions

**Modules:**
- **JWT:** Token generation and verification
- **Password:** Hashing and validation
- **Logging:** Structured logging
- **Validation:** Zod schemas
- **Errors:** Custom error classes
- **LLM Client:** OpenAI/Anthropic integration
- **Dates:** Date formatting utilities

### 4. `packages/config/` - Configuration

**Purpose:** Centralized environment configuration

**Modules:**
- Database configuration
- Redis configuration
- Storage configuration (S3/local)
- Environment variable validation

### 5. `packages/ui/` - Design System

**Purpose:** Shared UI components and design tokens

**Components:**
- Button, Input, Select, Modal, Table, Card, Badge, Alert, Toast, etc.
- Design tokens (colors, typography, spacing)
- Theme support (light/dark)

### 6. `packages/i18n/` - Internationalization

**Purpose:** Translation management

**Structure:**
```
src/locales/tr/          # Turkish translations
├── common.json
├── dashboard.json
├── documents.json
├── invoices.json
├── risk.json
└── ... (20+ files)
```

---

## 🗄️ Database Schema

**Database:** PostgreSQL 15  
**ORM:** Prisma

### Core Models

**Multi-Tenancy:**
- `Tenant` - Accounting office/organization
- `User` - Platform users
- `UserTenantMembership` - User-tenant relationship with roles

**Business Entities:**
- `ClientCompany` - Client companies managed by tenant
- `Invoice` - Invoices with lines
- `Transaction` - Financial transactions
- `Document` - Uploaded documents (invoices, receipts, contracts)
- `LedgerAccount` - Chart of accounts

**Risk & Analysis:**
- `DocumentRiskScore` - Risk scores for documents
- `ClientCompanyRiskScore` - Risk scores for clients
- `RiskAlert` - Risk alerts and notifications
- `RiskRule` - Configurable risk rules
- `RiskScoreHistory` - Historical risk score tracking

**Integrations:**
- `TenantIntegration` - Tenant's integration configurations
- `IntegrationSyncJob` - Background sync jobs
- `IntegrationSyncLog` - Sync history

**Reporting:**
- `ScheduledReport` - Scheduled report configurations
- `ReportExecutionLog` - Report execution history

**Other:**
- `Notification` - In-app notifications
- `Task` - Task management
- `MessageThread` - Messaging threads
- `SavedFilter` - Saved filter configurations
- `AuditLog` - Comprehensive audit trail
- `TenantSubscription` - Billing/subscription info

### Key Design Principles

1. **Multi-Tenancy:** All tenant-bound entities include `tenantId`
2. **Indexes:** All `tenantId` columns indexed for performance
3. **Relations:** Proper foreign keys with cascade deletes
4. **Audit:** Comprehensive audit logging for all actions

---

## 🏛️ Architecture Patterns

### 1. Multi-Tenancy

**Strategy:** Tenant ID as first-class field, enforced at all layers

**Implementation:**
- **Database:** All queries filter by `tenantId`
- **API:** Tenant context extracted from JWT token (never from request body)
- **Middleware:** `tenantMiddleware` validates user membership
- **Worker:** All job payloads include `tenantId`

**Isolation:**
- Tenant context attached to every request
- Cross-tenant access returns 404 (security through obscurity)
- Customer isolation for ReadOnly users (filtered by client company)

### 2. RBAC (Role-Based Access Control)

**Platform Roles:**
- `PlatformAdmin` - Full system access
- `Support` - Read-only access to all tenants

**Tenant Roles:**
- `TenantOwner` (Accountant) - Full control within tenant
- `ReadOnly` (Customer) - View-only access

**Implementation:**
- Permission checks in middleware (`rbac-middleware.ts`)
- Route-level protection
- Component-level checks in frontend

### 3. Service Layer Pattern

**Structure:**
```
Routes → Controllers → Services → Repositories (Prisma) → Database
```

**Benefits:**
- Separation of concerns
- Reusable business logic
- Easy testing

### 4. Repository Pattern

**Implementation:**
- Prisma as the repository layer
- Domain entities in `packages/core-domain`
- Services use Prisma client directly

### 5. Error Handling

**Custom Error Classes:**
- `AuthenticationError`
- `NotFoundError`
- `ValidationError`
- `ForbiddenError`

**Middleware:**
- Centralized error handler (`error-handler.ts`)
- Consistent error response format
- Logging and monitoring integration

---

## ✨ Key Features

### Document Management
- ✅ Upload documents (PDF, images)
- ✅ OCR processing (multi-provider support)
- ✅ Document parsing (invoice, receipt, contract, bank statement)
- ✅ Document analysis with AI
- ✅ Risk feature extraction
- ✅ Document requirements tracking

### Invoice Management
- ✅ Create, read, update, delete invoices
- ✅ Invoice lines management
- ✅ VAT calculation
- ✅ Export to PDF/Excel
- ✅ Integration with e-fatura system

### Risk Detection
- ✅ Document risk scoring
- ✅ Client company risk scoring
- ✅ Risk alerts and notifications
- ✅ Configurable risk rules
- ✅ Risk trend analysis
- ✅ ML-based fraud detection

### Reporting
- ✅ Pre-built report templates
- ✅ Custom report generation
- ✅ Scheduled reports (email delivery)
- ✅ PDF/Excel export
- ✅ Report execution logs

### Integrations
- ✅ Integration provider management
- ✅ Tenant integration configuration
- ✅ Background sync jobs
- ✅ Field mapping
- ✅ Sync history and logs

### Turkish Compliance
- ✅ e-fatura (Electronic Invoice) integration
- ✅ e-arşiv (Electronic Archive) integration
- ✅ e-defter (Electronic Ledger) integration
- ✅ KVKK (GDPR-like) compliance features
- ✅ Tax reporting and VAT optimization

### Client Management
- ✅ Client company CRUD
- ✅ Bank account management
- ✅ Contact information
- ✅ Client portal (ReadOnly users)

### Task Management
- ✅ Task creation and assignment
- ✅ Task status tracking
- ✅ Task filtering and search

### Messaging
- ✅ Internal messaging system
- ✅ Thread-based conversations
- ✅ Message notifications

### Notifications
- ✅ In-app notifications
- ✅ Email notifications
- ✅ Notification preferences
- ✅ Notification history

### Analytics
- ✅ Financial trends
- ✅ Portfolio analysis
- ✅ Risk trends
- ✅ Predictive analytics

### Security
- ✅ JWT-based authentication
- ✅ Password reset flow
- ✅ 2FA support (infrastructure ready)
- ✅ IP allowlist
- ✅ Comprehensive audit logging
- ✅ Rate limiting

---

## 🔄 Development Workflow

### Setup

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Redis, MinIO)
docker-compose up -d postgres redis minio

# Run migrations
cd apps/backend-api
pnpm db:migrate

# Start development servers
pnpm dev
```

### Running Apps

```bash
# All apps
pnpm dev

# Individual apps
pnpm --filter backend-api dev
pnpm --filter web-app dev
pnpm --filter worker-jobs dev
```

### Testing

```bash
# All tests
pnpm test

# Backend tests
pnpm --filter backend-api test

# E2E tests
pnpm --filter web-app test:e2e

# Smoke tests (quick validation)
pnpm smoke:backend
pnpm smoke:full
```

### Building

```bash
# Build all apps
pnpm build

# Build individual app
pnpm --filter backend-api build
```

---

## 🚀 Infrastructure

### Docker Compose Services

1. **PostgreSQL** (port 5432)
   - Database: `ai_muhasebi`
   - User: `ai_muhasebi`

2. **Redis** (port 6379)
   - Cache and queue storage

3. **MinIO** (ports 9000-9001)
   - S3-compatible object storage

4. **Backend API** (port 3800)
   - Production-ready container

5. **Web App** (port 3000)
   - Next.js production build

6. **Worker Jobs**
   - Background job processor

### Health Checks

- Backend: `GET /healthz` (lightweight), `GET /readyz` (readiness)
- Web App: `GET /api/health`
- Worker: Health check script

### Environment Variables

Each app has its own `.env.example` file:
- `apps/backend-api/.env`
- `apps/web-app/.env.local`
- `apps/worker-jobs/.env`

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `REDIS_URL` - Redis connection string
- `NEXT_PUBLIC_API_BASE_URL` - Frontend API URL

---

## 📊 Codebase Statistics

- **Total Applications:** 5 (backend-api, web-app, worker-jobs, mobile-app, admin-tools)
- **Total Packages:** 6 (core-domain, api-client, shared-utils, config, ui, i18n)
- **Backend Routes:** 50+ route files
- **Backend Services:** 70+ service files
- **Database Models:** 50+ Prisma models
- **Frontend Pages:** 100+ Next.js pages
- **Test Coverage:** Integration tests for all major features

---

## 🔐 Security Features

1. **Authentication:** JWT tokens with refresh mechanism
2. **Authorization:** RBAC with granular permissions
3. **Multi-Tenancy:** Strict tenant isolation at all layers
4. **Audit Logging:** Comprehensive audit trail
5. **Rate Limiting:** API rate limiting
6. **Security Headers:** Helmet.js for security headers
7. **Input Validation:** Zod schemas for all inputs
8. **Error Handling:** Secure error messages (no data leakage)

---

## 📚 Documentation

- **Architecture:** `docs/architecture/`
  - Overview, multi-tenancy, RBAC, security, database schema, API design, frontend architecture
- **API:** `docs/api/`
- **Features:** `docs/features/`
- **Deployment:** `docs/deployment/`
- **Development:** `docs/development/`

---

## 🎯 Current Status

**Overall Completion:** ~95%

**Completed:**
- ✅ Core document and invoice analysis
- ✅ Risk detection and scoring
- ✅ Client management
- ✅ Reporting system
- ✅ Multi-tenancy and RBAC
- ✅ Turkish compliance infrastructure
- ✅ Integration framework
- ✅ Task management
- ✅ Messaging and notifications

**In Progress / Partial:**
- ⚠️ Real accounting software API integrations (infrastructure ready)
- ⚠️ Advanced ML fraud detection (basic features exist)
- ⚠️ Some Turkish compliance features (e-fatura, e-arşiv need API completion)

**Future Enhancements:**
- Enhanced client portal features
- Advanced analytics and predictions
- Mobile app completion
- Performance optimizations

---

## 📝 Notes

- **Language:** Turkish-first (all UI in Turkish)
- **Market:** Designed for Turkish accounting offices
- **Compliance:** KVKK, Turkish tax regulations
- **Scalability:** Designed for multi-tenant SaaS at scale
- **Testing:** Comprehensive integration and E2E tests

---

**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

