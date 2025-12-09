# Routes Documentation

This document lists all routes and URLs in the AI Muhasebi project.

## Backend API Routes

All backend routes are prefixed with `/api/v1/` and require authentication (except auth routes).

### Health & Config
- `GET /health` - Health check endpoint (returns status and database connectivity)
- `GET /ready` - Readiness check endpoint (returns 200 only when database is reachable, used by orchestration systems)
- `GET /healthz` - Kubernetes-style health check endpoint (no auth, lightweight)
- `GET /readyz` - Kubernetes-style readiness check endpoint (no auth, lightweight)
- `GET /api/v1/config/check` - Config check endpoint (development only)

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - Tenant registration with user
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token
- `POST /api/v1/auth/logout` - User logout

### Users (`/api/v1/users`)
- `GET /api/v1/users/me` - Get current user with tenants
- `POST /api/v1/users/switch-tenant` - Switch active tenant

### Tenants (`/api/v1/tenants`)
- `GET /api/v1/tenants/:tenantId` - Get tenant details
- `PATCH /api/v1/tenants/:tenantId` - Update tenant (TenantOwner only)

### Tenant Users (`/api/v1/tenants`)
- `GET /api/v1/tenants/:tenantId/users` - List tenant users
- `POST /api/v1/tenants/:tenantId/users/invite` - Invite user to tenant
- `POST /api/v1/tenants/:tenantId/users/:userId/accept-invitation` - Accept invitation
- `PATCH /api/v1/tenants/:tenantId/users/:userId/role` - Change user role
- `PATCH /api/v1/tenants/:tenantId/users/:userId/status` - Update user status

### Client Companies (`/api/v1/client-companies`)
- `GET /api/v1/client-companies` - List client companies (with filters: isActive, search, page, pageSize)
- `GET /api/v1/client-companies/:id` - Get client company by ID
- `POST /api/v1/client-companies` - Create client company
- `PATCH /api/v1/client-companies/:id` - Update client company
- `DELETE /api/v1/client-companies/:id` - Delete client company

#### Bank Accounts (`/api/v1/client-companies/:id/bank-accounts`)
- `GET /api/v1/client-companies/:id/bank-accounts` - List bank accounts for client
- `POST /api/v1/client-companies/:id/bank-accounts` - Create bank account
- `PATCH /api/v1/client-companies/:id/bank-accounts/:accountId` - Update bank account
- `DELETE /api/v1/client-companies/:id/bank-accounts/:accountId` - Delete bank account

### Invoices (`/api/v1/invoices`)
- `GET /api/v1/invoices` - List invoices (with filters: clientCompanyId, issueDateFrom, issueDateTo, type, status, page, pageSize)
- `GET /api/v1/invoices/:id` - Get invoice by ID
- `POST /api/v1/invoices` - Create invoice
- `PATCH /api/v1/invoices/:id` - Update invoice
- `PATCH /api/v1/invoices/:id/status` - Update invoice status (TenantOwner/Accountant only)
- `DELETE /api/v1/invoices/:id` - Delete invoice

### Transactions (`/api/v1/transactions`)
- `GET /api/v1/transactions` - List transactions (with filters: clientCompanyId, dateFrom, dateTo, referenceNo, page, pageSize)
- `GET /api/v1/transactions/:id` - Get transaction by ID
- `POST /api/v1/transactions` - Create transaction
- `PATCH /api/v1/transactions/:id` - Update transaction
- `DELETE /api/v1/transactions/:id` - Delete transaction (TenantOwner/Accountant only)
- `GET /api/v1/transactions/trial-balance` - Get trial balance report

### Ledger Accounts (`/api/v1/ledger-accounts`)
- `GET /api/v1/ledger-accounts` - List ledger accounts
- `GET /api/v1/ledger-accounts/:id` - Get ledger account by ID
- `POST /api/v1/ledger-accounts` - Create ledger account (TenantOwner/Accountant only)
- `PATCH /api/v1/ledger-accounts/:id` - Update ledger account (TenantOwner/Accountant only)

### Documents (`/api/v1/documents`)
- `POST /api/v1/documents/upload` - Upload document (multipart/form-data)
- `GET /api/v1/documents` - List documents (with filters: clientCompanyId, type, status, dateFrom, dateTo, page, pageSize)
- `GET /api/v1/documents/:id` - Get document by ID
- `GET /api/v1/documents/:id/download` - Download document file
- `POST /api/v1/documents/:id/retry` - Retry processing failed document
- `DELETE /api/v1/documents/:id` - Delete document (TenantOwner/Accountant only)

### Document AI (`/api/v1/documents`)
- `GET /api/v1/documents/:id/ai-analysis` - Get AI analysis for document
- `GET /api/v1/documents/search-by-risk` - Search documents by risk criteria

### Risk (`/api/v1/risk`)
- `GET /api/v1/risk/documents/:id` - Get document risk score
- `GET /api/v1/risk/companies/:id` - Get client company risk score
- `GET /api/v1/risk/dashboard` - Get tenant risk dashboard

### Risk Alerts (`/api/v1/risk/alerts`)
- `GET /api/v1/risk/alerts` - List risk alerts (with filters: clientCompanyId, severity, status, dateFrom, dateTo, page, pageSize)
- `PATCH /api/v1/risk/alerts/:id/status` - Update alert status

### Integrations (`/api/v1/integrations`)
- `GET /api/v1/integrations/providers` - List available integration providers (with filter: type)
- `GET /api/v1/integrations/providers/:id` - Get provider by ID
- `GET /api/v1/integrations` - List tenant integrations (with filters: type, clientCompanyId, status, page, pageSize)
- `GET /api/v1/integrations/:id` - Get integration by ID
- `POST /api/v1/integrations` - Create integration
- `PATCH /api/v1/integrations/:id` - Update integration
- `DELETE /api/v1/integrations/:id` - Delete/disconnect integration
- `POST /api/v1/integrations/:id/test-connection` - Test integration connection
- `POST /api/v1/integrations/:id/sync` - Trigger manual sync
- `GET /api/v1/integrations/:id/jobs` - List sync jobs (with filters: status, jobType, page, pageSize)
- `GET /api/v1/integrations/:id/logs` - List sync logs (with filters: level, page, pageSize)

### Reports (`/api/v1/reports`)
- `GET /api/v1/reports/definitions` - List available report definitions
- `POST /api/v1/reports/generate` - Generate report (on-demand)
- `POST /api/v1/reports/download` - Download report in PDF or Excel format

### Scheduled Reports (`/api/v1/scheduled-reports`)
- `GET /api/v1/scheduled-reports` - List scheduled reports
- `GET /api/v1/scheduled-reports/:id` - Get scheduled report by ID
- `POST /api/v1/scheduled-reports` - Create scheduled report
- `PUT /api/v1/scheduled-reports/:id` - Update scheduled report
- `DELETE /api/v1/scheduled-reports/:id` - Delete/deactivate scheduled report

### Report Execution Logs (`/api/v1/report-execution-logs`)
- `GET /api/v1/report-execution-logs` - List recent execution logs (with limit query param, default 20, max 100)
- `GET /api/v1/report-execution-logs/scheduled/:scheduledReportId` - List execution logs for a scheduled report

### Notifications (`/api/v1/notifications`)
- `GET /api/v1/notifications` - List notifications (with filters: is_read, type, limit, offset)
- `POST /api/v1/notifications/read-all` - Mark all notifications as read
- `POST /api/v1/notifications/:id/read` - Mark notification as read

### Settings (`/api/v1/settings`)
#### Tenant Settings (`/api/v1/settings/tenant`)
- `GET /api/v1/settings/tenant` - Get tenant settings
- `PUT /api/v1/settings/tenant` - Update tenant settings (TenantOwner/Accountant only)

#### User Settings (`/api/v1/settings/user`)
- `GET /api/v1/settings/user` - Get user settings
- `PUT /api/v1/settings/user` - Update user settings

### Audit Logs (`/api/v1/audit-logs`)
- `GET /api/v1/audit-logs` - List audit logs (with filters: user_id, action, resource_type, from, to, limit, offset, page, pageSize) - TenantOwner/Accountant only

### Billing (`/api/v1/billing`)
- `GET /api/v1/billing/subscription` - Get subscription details (TenantOwner/Accountant see full data, others see limited data)
- `PUT /api/v1/billing/subscription` - Update subscription (TenantOwner only)
- `GET /api/v1/billing/usage` - Get usage statistics (clientCompanies, documents, aiAnalyses, users, scheduledReports)

### Onboarding (`/api/v1/onboarding`)
- `GET /api/v1/onboarding/state` - Get onboarding state for tenant

### Search (`/api/v1/search`)
- `GET /api/v1/search/global` - Global search across all resources (query param required, min 2 chars)

### Saved Filters (`/api/v1/saved-filters`)
- `GET /api/v1/saved-filters` - List saved filters (with optional target filter: CLIENT_COMPANIES, INVOICES, DOCUMENTS, RISK_ALERTS, REPORTS)
- `POST /api/v1/saved-filters` - Create saved filter
- `PUT /api/v1/saved-filters/:id` - Update saved filter
- `DELETE /api/v1/saved-filters/:id` - Delete saved filter

### AI Assistant (`/api/v1/ai`)
- `POST /api/v1/ai/chat` - Chat with AI assistant (with question, optional type, dateRange, companyId)
- `POST /api/v1/ai/summaries/daily-risk` - Generate daily risk summary (optional date)
- `POST /api/v1/ai/summaries/portfolio` - Generate portfolio overview summary

### Mobile (`/api/v1/mobile`)
- `GET /api/v1/mobile/dashboard` - Get mobile dashboard statistics (totalClientCompanies, openRiskAlerts, pendingDocuments, todayInvoices, recentNotifications)

### Admin (`/api/v1/admin`)
**Note:** All admin routes require Platform Admin role.

#### Admin Tenants (`/api/v1/admin/tenants`)
- `GET /api/v1/admin/tenants` - List tenants with overview stats (with filters: page, pageSize, status, search)
- `GET /api/v1/admin/tenants/:tenantId` - Get tenant detail
- `PATCH /api/v1/admin/tenants/:tenantId/status` - Update tenant status (ACTIVE or SUSPENDED)

#### Admin Users (`/api/v1/admin/users`)
- `GET /api/v1/admin/users` - List users with filters (with filters: page, pageSize, email, tenantId, role)

#### Admin Support (`/api/v1/admin/support`)
- `GET /api/v1/admin/support/incidents` - List support incidents (with filters: page, pageSize, tenantId, type, status)

#### Admin Impersonation (`/api/v1/admin/impersonation`)
- `POST /api/v1/admin/impersonation/start` - Start impersonating a user (requires targetUserId or targetUserEmail, optional targetTenantId)
- `POST /api/v1/admin/impersonation/stop` - Stop impersonation

#### Admin Metrics (`/api/v1/admin/metrics`)
- `GET /api/v1/admin/metrics/overview` - Get platform metrics overview

---

## Frontend Routes (Next.js App Router)

### Public Routes
- `/` - Root page (redirects to `/anasayfa` if authenticated, otherwise `/auth/login`)
- `/auth/login` - Login page
- `/auth/register` - Tenant registration page
- `/auth/forgot-password` - Forgot password page
- `/auth/reset-password` - Reset password page

### Protected Routes (require authentication)

#### Dashboard
- `/dashboard` - Main dashboard (English)
- `/anasayfa` - Main dashboard (Turkish)

#### Clients / Müşteriler
- `/clients` - Client companies list (English)
- `/clients/new` - Create new client company (English)
- `/clients/[id]` - Client company detail page (English)
- `/clients/[id]/edit` - Edit client company (English)
- `/musteriler` - Client companies list (Turkish)
- `/musteriler/new` - Create new client company (Turkish)
- `/musteriler/[id]` - Client company detail page (Turkish)
- `/musteriler/[id]/edit` - Edit client company (Turkish)

#### Invoices / Faturalar
- `/invoices` - Invoices list (English)
- `/invoices/new` - Create new invoice (English)
- `/invoices/[id]` - Invoice detail page (English)
- `/invoices/[id]/edit` - Edit invoice (English)
- `/faturalar` - Invoices list (Turkish)
- `/faturalar/new` - Create new invoice (Turkish)
- `/faturalar/[id]` - Invoice detail page (Turkish)
- `/faturalar/[id]/edit` - Edit invoice (Turkish)

#### Transactions / İşlemler
- `/transactions` - Transactions list (English)
- `/transactions/new` - Create new transaction (English)
- `/transactions/[id]` - Transaction detail page (English)
- `/transactions/[id]/edit` - Edit transaction (English)
- `/islemler` - Transactions list (Turkish)
- `/islemler/new` - Create new transaction (Turkish)
- `/islemler/[id]` - Transaction detail page (Turkish)
- `/islemler/[id]/edit` - Edit transaction (Turkish)

#### Documents / Belgeler
- `/documents` - Documents list (English)
- `/documents/[id]` - Document detail page (English)
- `/belgeler` - Documents list (Turkish)
- `/belgeler/[id]` - Document detail page (Turkish)

#### Risk
- `/risk/dashboard` - Risk dashboard
- `/risk/alerts` - Risk alerts list

#### Reports / Raporlar
- `/raporlar` - Reports main page
- `/raporlar/anlik` - On-demand reports page
- `/raporlar/zamanlanmis` - Scheduled reports list
- `/raporlar/zamanlanmis/new` - Create new scheduled report
- `/raporlar/zamanlanmis/[id]` - Scheduled report detail page

#### Integrations / Entegrasyonlar
- `/integrations` - Integrations list (English)
- `/integrations/new` - Create new integration (English)
- `/integrations/[id]` - Integration detail page (English)
- `/entegrasyonlar` - Integrations list (Turkish)
- `/entegrasyonlar/new` - Create new integration (Turkish)
- `/entegrasyonlar/[id]` - Integration detail page (Turkish)

#### Notifications / Bildirimler
- `/bildirimler` - Notifications page

#### Settings / Ayarlar
- `/ayarlar` - Settings root (redirects to `/ayarlar/ofis` or `/ayarlar/profil` based on role)
- `/ayarlar/ofis` - Office/tenant settings
- `/ayarlar/profil` - User profile settings
- `/ayarlar/abonelik` - Subscription/billing page
- `/ayarlar/denetim-kayitlari` - Audit logs page
- `/ayarlar/kullanicilar` - Tenant users management page (Turkish)
- `/settings/users` - Tenant users management page (English)

#### AI Assistant / AI Asistan
- `/ai-asistan` - AI Assistant chat page

#### Admin (Platform Admin only)
- `/admin/overview` - Admin overview dashboard
- `/admin/tenants` - List all tenants
- `/admin/tenants/[tenantId]` - Tenant detail page
- `/admin/users` - List all users
- `/admin/support` - Support incidents page

---

## Route Organization Notes

### Backend Routes
- All API routes are versioned with `/api/v1/` prefix
- Most routes require authentication via `authMiddleware`
- Most routes require tenant context via `tenantMiddleware`
- Routes use RBAC middleware (`requirePermission`, `requireRole`) for authorization
- Query parameters are used for filtering, pagination, and search

### Frontend Routes
- Uses Next.js 14+ App Router
- Protected routes are under `(protected)` route group
- Dynamic routes use `[id]` syntax
- Some routes redirect based on user role/permissions

### Authentication
- JWT tokens in `Authorization: Bearer <token>` header
- Refresh tokens stored in httpOnly cookies
- Tenant context extracted from JWT token

---

## Summary Statistics

- **Backend API Routes**: ~110+ endpoints
- **Frontend Routes**: ~60+ pages (including both English and Turkish versions)
- **Route Groups**: 
  - Health & Config: 3 routes
  - Authentication: 5 routes
  - Users & Tenants: 8 routes
  - Client Companies: 8 routes (including bank accounts)
  - Invoices: 6 routes
  - Transactions: 6 routes
  - Ledger Accounts: 4 routes
  - Documents: 7 routes
  - Risk: 5 routes
  - Integrations: 11 routes
  - Reports: 7 routes
  - Notifications: 3 routes
  - Settings: 4 routes
  - Audit Logs: 1 route
  - Billing: 3 routes
  - Onboarding: 1 route
  - Search: 1 route
  - Saved Filters: 4 routes
  - AI Assistant: 3 routes
  - Mobile: 1 route
  - Admin: 9 routes (tenants: 3, users: 1, support: 1, impersonation: 2, metrics: 1)


