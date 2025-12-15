# Platform Admin Console Implementation Plan

## Overview
This plan implements a complete Platform Admin Console for internal platform operators, allowing them to manage tenants, users, view metrics, handle support incidents, and impersonate users for troubleshooting. All UI text is in Turkish.

---

## PART A: Domain & Roles (Platform Admin)

### A1. Add Platform Roles to Domain Layer

**File: `packages/core-domain/src/types/roles.ts`**
- Add `PLATFORM_ROLES` constant with `PLATFORM_ADMIN` and optionally `PLATFORM_SUPPORT`
- Add `PlatformRole` type
- Add Turkish labels: `PLATFORM_ROLE_LABELS_TR`

**File: `apps/backend-api/prisma/schema.prisma`**
- Add `platformRole String? @map("platform_role") @db.VarChar(50)` field to `User` model
- Add `status String @default("ACTIVE") @db.VarChar(50)` field to `Tenant` model (ACTIVE, SUSPENDED)
- Run migration: `pnpm --filter backend-api prisma migrate dev --name add_platform_role_and_tenant_status`

**File: `packages/core-domain/src/entities/audit-log.ts`**
- Extend `AuditAction` type to include:
  - `"IMPERSONATION_START"`
  - `"IMPERSONATION_STOP"`
  - `"TENANT_SUSPEND"`
  - `"TENANT_ACTIVATE"`
  - `"ADMIN_TENANT_VIEWED"`
  - `"ADMIN_USER_VIEWED"`

### A2. Extend Authentication Context

**File: `apps/backend-api/src/types/request-context.ts`**
- Extend `RequestContext` interface:
  ```typescript
  platformRoles?: string[];
  isImpersonating?: boolean;
  impersonatorId?: string;
  impersonatedUserId?: string;
  ```

**File: `apps/backend-api/src/middleware/auth-middleware.ts`**
- After loading user, check for `platformRole` field
- If platform role exists, add to `req.context.platformRoles`
- If token contains impersonation metadata, set `isImpersonating`, `impersonatorId`, `impersonatedUserId`

**File: `packages/shared-utils/src/jwt/generate.ts`**
- Extend `TokenPayload` interface to include:
  - `platformRoles?: string[]`
  - `isImpersonating?: boolean`
  - `impersonatorId?: string`
  - `impersonatedUserId?: string`

**File: `apps/backend-api/src/services/auth-service.ts`**
- In `login()` method, include `platformRoles` in token payload if user has platform role
- Update token generation to include platform roles

### A3. Create Platform Admin Middleware

**File: `apps/backend-api/src/middleware/platform-admin-middleware.ts`** (NEW)
- Create `requirePlatformAdmin()` middleware function
- Checks `req.context.platformRoles` includes `"PLATFORM_ADMIN"`
- Returns 403 if not platform admin
- Uses Turkish error messages

---

## PART B: Backend API Endpoints

### B1. Admin Routes Structure

**File: `apps/backend-api/src/routes/admin-routes.ts`** (NEW)
- Main router for all admin endpoints
- Mounts sub-routers:
  - `/tenants` → admin-tenants-routes
  - `/users` → admin-users-routes
  - `/support` → admin-support-routes
  - `/impersonation` → admin-impersonation-routes
  - `/metrics` → admin-metrics-routes

**File: `apps/backend-api/src/server.ts`**
- Add: `app.use("/api/v1/admin", adminRoutes);`
- Ensure it's after auth middleware registration

### B2. Admin Tenants Routes

**File: `apps/backend-api/src/routes/admin-tenants-routes.ts`** (NEW)

**GET `/api/v1/admin/tenants`**
- Query params: `page`, `pageSize`, `status`, `search`
- Returns paginated list with:
  - id, name, slug, createdAt
  - status (ACTIVE/SUSPENDED)
  - billing_plan (from TenantSubscription)
  - userCount (aggregate)
  - clientCompanyCount (aggregate)
  - documentCount (aggregate)
  - invoiceCount (aggregate)
- Requires: `authMiddleware`, `requirePlatformAdmin()`

**GET `/api/v1/admin/tenants/:tenantId`**
- Returns detailed tenant info:
  - Basic info (name, slug, taxNumber, etc.)
  - Status
  - Billing info (plan, quota usage from TenantUsage)
  - Recent risk alerts count (last 7 days)
  - Recent failed integrations count (last 7 days)
  - TenantSettings
  - Recent audit events (last 10)
- Requires: `authMiddleware`, `requirePlatformAdmin()`
- Logs: `ADMIN_TENANT_VIEWED` audit event

**PATCH `/api/v1/admin/tenants/:tenantId/status`**
- Body: `{ status: "ACTIVE" | "SUSPENDED" }`
- Updates tenant status
- Logs: `TENANT_SUSPEND` or `TENANT_ACTIVATE` audit event
- Requires: `authMiddleware`, `requirePlatformAdmin()`

### B3. Admin Users Routes

**File: `apps/backend-api/src/routes/admin-users-routes.ts`** (NEW)

**GET `/api/v1/admin/users`**
- Query params: `email` (partial), `tenantId`, `role`, `page`, `pageSize`
- Returns paginated list with:
  - id, name, email
  - platformRoles (array)
  - tenantMemberships (summary: tenant name, role, status)
  - lastLoginAt
- Requires: `authMiddleware`, `requirePlatformAdmin()`
- Logs: `ADMIN_USER_VIEWED` audit event (for each user viewed)

### B4. Admin Support Routes

**File: `apps/backend-api/src/routes/admin-support-routes.ts`** (NEW)

**GET `/api/v1/admin/support/incidents`**
- Query params: `page`, `pageSize`, `tenantId`, `type`, `status`
- Aggregates from:
  - `ReportExecutionLog` where `status = "failed"`
  - `IntegrationSyncJob` where `status = "failed"`
- Returns flattened entries:
  - type: `"SCHEDULED_REPORT"` | `"INTEGRATION_SYNC"` | `"OTHER"`
  - tenant_id, tenant_name
  - message (from errorMessage or lastErrorMessage)
  - created_at
  - status
  - resource_id (scheduledReportId or tenantIntegrationId)
- Requires: `authMiddleware`, `requirePlatformAdmin()`

### B5. Admin Impersonation Routes

**File: `apps/backend-api/src/routes/admin-impersonation-routes.ts`** (NEW)

**POST `/api/v1/admin/impersonation/start`**
- Body: `{ targetUserId?: string, targetTenantId?: string, targetUserEmail?: string }`
- Validates target user exists and is member of target tenant (if tenantId provided)
- Generates short-lived impersonation token (15 min expiry):
  - Includes: `userId` (target), `tenantId` (target), `isImpersonating: true`, `impersonatorId`, `impersonatedUserId`
- Returns: `{ impersonationToken: string, expiresAt: Date }`
- Logs: `IMPERSONATION_START` audit event with metadata
- Requires: `authMiddleware`, `requirePlatformAdmin()`

**POST `/api/v1/admin/impersonation/stop`**
- Body: `{ impersonationToken: string }` (optional, can be inferred from context)
- Logs: `IMPERSONATION_STOP` audit event
- Returns: `{ message: "İmpersonasyon sonlandırıldı" }`
- Requires: `authMiddleware`, `requirePlatformAdmin()`

### B6. Admin Metrics Routes

**File: `apps/backend-api/src/routes/admin-metrics-routes.ts`** (NEW)

**GET `/api/v1/admin/metrics/overview`**
- Returns aggregated metrics:
  - total_tenants
  - active_tenants (status = ACTIVE)
  - suspended_tenants (status = SUSPENDED)
  - total_users
  - total_client_companies
  - total_documents
  - total_invoices
  - total_risk_alerts_last_7_days
  - total_failed_integrations_last_7_days
- Requires: `authMiddleware`, `requirePlatformAdmin()`

### B7. Admin Services

**File: `apps/backend-api/src/services/admin-service.ts`** (NEW)
- `getTenantsOverview(params)` - paginated tenant list with stats
- `getTenantDetail(tenantId)` - detailed tenant info
- `updateTenantStatus(tenantId, status)` - update status
- `getUsersOverview(params)` - paginated user list
- `getSupportIncidents(params)` - aggregated incidents
- `getPlatformMetrics()` - platform-wide metrics

---

## PART C: Frontend Admin Console UI

### C1. i18n Translations

**File: `packages/i18n/src/locales/tr/admin.json`** (NEW)
- Add Turkish labels:
  - `"yönetimKonsolu": "Yönetim Konsolu"`
  - `"genelBakış": "Genel Bakış"`
  - `"kiracılar": "Kiracılar"`
  - `"kullanıcılar": "Kullanıcılar"`
  - `"destekOlaylar": "Destek / Olaylar"`
  - `"impersonasyonBaşlat": "İmpersonasyon Başlat"`
  - `"çıkVeKendiHesabımaDön": "Çık ve kendi hesabıma dön"`
  - And all other admin-related labels

**File: `packages/i18n/src/locales/tr/index.ts`**
- Export `admin` from `./admin.json`

### C2. Admin Console Layout & Navigation

**File: `apps/web-app/src/app/(protected)/layout.tsx`**
- Add conditional navigation item for platform admins:
  - Check user's platform roles from API
  - If `PLATFORM_ADMIN`, show "Yönetim Konsolu" link in header
  - Link to `/admin/overview`

**File: `apps/web-app/src/app/(protected)/admin/layout.tsx`** (NEW)
- Admin-specific layout
- Shows impersonation banner if `isImpersonating` is true
- Banner text: "Şu anda [Kullanıcı Adı] kullanıcısı olarak [Ofis Adı] kiracısında oturum açtınız."
- "Çık ve kendi hesabıma dön" button
- Sidebar navigation: Genel Bakış, Kiracılar, Kullanıcılar, Destek / Olaylar

### C3. Admin Overview Page

**File: `apps/web-app/src/app/(protected)/admin/overview/page.tsx`** (NEW)
- Route: `/admin/overview`
- Title: "Yönetim Konsolu - Genel Bakış"
- Fetches from: `GET /api/v1/admin/metrics/overview`
- Displays metric cards:
  - Toplam Kiracı
  - Aktif Kiracı
  - Askıya Alınan Kiracı
  - Toplam Kullanıcı
  - Toplam Müşteri Şirket
  - Toplam Belge
  - Toplam Fatura
  - Son 7 Günde Risk Uyarıları
  - Son 7 Günde Başarısız Entegrasyonlar

### C4. Admin Tenants Page

**File: `apps/web-app/src/app/(protected)/admin/tenants/page.tsx`** (NEW)
- Route: `/admin/tenants`
- Title: "Kiracılar"
- Table columns (Turkish):
  - Ofis Adı
  - Slug
  - Durum (Aktif / Askıya Alındı)
  - Plan
  - Kullanıcı Sayısı
  - Müşteri Şirket Sayısı
  - Oluşturulma Tarihi
  - Actions (Detay, İmpersonasyon Başlat)
- Fetches from: `GET /api/v1/admin/tenants`
- Pagination support

**File: `apps/web-app/src/app/(protected)/admin/tenants/[tenantId]/page.tsx`** (NEW)
- Route: `/admin/tenants/[tenantId]`
- Title: "Kiracı Detayı"
- Sections:
  - Ofis Bilgileri
  - Plan ve Kullanım
  - Son Aktivite
  - Son Denetim Kayıtları (last 10 audit logs)
- Fetches from: `GET /api/v1/admin/tenants/:tenantId`
- Action: "Durumu Değiştir" button (if status can be changed)

### C5. Admin Users Page

**File: `apps/web-app/src/app/(protected)/admin/users/page.tsx`** (NEW)
- Route: `/admin/users`
- Title: "Kullanıcılar"
- Filters:
  - E-posta (text input)
  - Kiracı (dropdown)
  - Rol (dropdown: tenant roles + platform roles)
- Table columns:
  - Ad Soyad
  - E-posta
  - Kiracılar (comma-separated list)
  - Roller (platform roles + tenant roles)
  - Son Giriş Zamanı
- Fetches from: `GET /api/v1/admin/users`
- Read-only (no edit actions for MVP)

### C6. Admin Support Page

**File: `apps/web-app/src/app/(protected)/admin/support/page.tsx`** (NEW)
- Route: `/admin/support`
- Title: "Destek / Olaylar"
- Table columns:
  - Tarih
  - Kiracı
  - Tür (Zamanlanmış Rapor / Entegrasyon / Sistem)
  - Mesaj
  - Durum
- Fetches from: `GET /api/v1/admin/support/incidents`
- Empty state: "Gösterilecek olay bulunamadı."

### C7. Impersonation UX

**File: `apps/web-app/src/components/impersonation-banner.tsx`** (NEW)
- Component that shows impersonation banner
- Checks for impersonation token/context
- Displays banner with user/tenant info
- "Çık ve kendi hesabıma dön" button
- On click: calls `POST /api/v1/admin/impersonation/stop`, clears token, reloads app

**File: `apps/web-app/src/app/(protected)/admin/layout.tsx`**
- Include `<ImpersonationBanner />` at top

**File: `apps/web-app/src/lib/auth.ts`** (or wherever auth logic is)
- Add function to handle impersonation token
- Store impersonation token separately from regular access token
- When impersonation token exists, use it for API calls
- Update token refresh logic to handle impersonation

### C8. API Client Updates

**File: `packages/api-client/src/clients/admin-client.ts`** (NEW)
- `getTenantsOverview(params)`
- `getTenantDetail(tenantId)`
- `updateTenantStatus(tenantId, status)`
- `getUsersOverview(params)`
- `getSupportIncidents(params)`
- `getPlatformMetrics()`
- `startImpersonation(params)`
- `stopImpersonation()`

**File: `packages/api-client/src/index.ts`**
- Export admin client

---

## PART D: Testing

### D1. Admin Integration Tests

**File: `apps/backend-api/src/routes/__tests__/admin.integration.test.ts`** (NEW)

**Test Cases:**

1. **Platform Admin Access**
   - Platform admin can access all `/api/v1/admin/*` endpoints
   - Returns 200 with correct data

2. **Tenant-Only User Access Denied**
   - TenantOwner, Accountant, Staff, ReadOnly users cannot access `/api/v1/admin/*` endpoints
   - Returns 403 Forbidden

3. **Tenants Overview**
   - `GET /api/v1/admin/tenants` returns paginated list
   - Includes correct stats (user count, client count, etc.)

4. **Tenant Detail**
   - `GET /api/v1/admin/tenants/:tenantId` returns detailed info
   - Logs `ADMIN_TENANT_VIEWED` audit event

5. **Tenant Status Update**
   - `PATCH /api/v1/admin/tenants/:tenantId/status` updates status
   - Logs `TENANT_SUSPEND` or `TENANT_ACTIVATE` audit event

6. **Users Overview**
   - `GET /api/v1/admin/users` returns paginated list
   - Filters work correctly (email, tenantId, role)

7. **Support Incidents**
   - `GET /api/v1/admin/support/incidents` aggregates from ReportExecutionLog and IntegrationSyncJob

8. **Platform Metrics**
   - `GET /api/v1/admin/metrics/overview` returns correct aggregated metrics

9. **Impersonation**
   - `POST /api/v1/admin/impersonation/start` returns impersonation token
   - Token includes correct metadata (isImpersonating, impersonatorId, etc.)
   - Logs `IMPERSONATION_START` audit event
   - Actions performed with impersonation token are logged with both impersonator and target user in metadata

10. **Impersonation Stop**
    - `POST /api/v1/admin/impersonation/stop` logs `IMPERSONATION_STOP` audit event

**Test Setup:**
- Create test users: one with `platformRole = "PLATFORM_ADMIN"`, others with tenant-only roles
- Create test tenants with various statuses
- Create test data (users, client companies, documents, invoices, etc.)

**Run Tests:**
```bash
cd apps/backend-api
pnpm test -- admin.integration.test.ts
```

---

## Implementation Order

1. **PART A** - Domain & Roles (foundation)
   - A1: Add platform roles to domain
   - A2: Extend auth context
   - A3: Create platform admin middleware

2. **PART B** - Backend API
   - B1: Admin routes structure
   - B2-B6: Individual route files
   - B7: Admin services

3. **PART C** - Frontend UI
   - C1: i18n translations
   - C2: Layout & navigation
   - C3-C6: Admin pages
   - C7: Impersonation UX
   - C8: API client

4. **PART D** - Testing
   - D1: Integration tests

---

## Security Considerations

1. **Platform Admin Check**: All admin endpoints MUST use `requirePlatformAdmin()` middleware
2. **Audit Logging**: All sensitive admin actions MUST be logged
3. **Impersonation**: 
   - Short-lived tokens (15 min)
   - Clear audit trail
   - Visible banner in UI
4. **Tenant Isolation**: Platform admins can view all tenants, but must still respect data isolation when impersonating
5. **Error Messages**: Use Turkish, but don't leak sensitive info

---

## Notes

- All UI text MUST be in Turkish
- Platform admins are different from tenant owners
- Platform admin routes are separate from tenant routes (`/api/v1/admin/*` vs `/api/v1/tenants/*`)
- Impersonation tokens are separate from regular access tokens
- Tests focus only on admin console endpoints, not refactoring existing code





