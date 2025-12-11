# TASK 10 — Test Baseline Inventory

**Date:** Generated from test run  
**Total Test Files:** 24 (14 failed, 10 passed)  
**Total Tests:** 241 (90 failed, 151 passed)  
**Unhandled Rejections:** 2  
**Duration:** 1228.36s

## Failure Categories

### 1. Prisma Foreign Key Constraint Violations (P2003) — 40+ failures

**Root Cause:** Test data creation order issues - creating child records before parent records are committed to database.

**Affected Tests:**
- `audit-logs.integration.test.ts` - `audit_logs_tenant_id_fkey` violations
- `notifications.integration.test.ts` - `notifications_user_id_fkey` and `notifications_tenant_id_fkey` violations
- `auth-routes.integration.test.ts` - `user_tenant_memberships_tenant_id_fkey` violations
- `settings.integration.test.ts` - `user_tenant_memberships_user_id_fkey` and `user_tenant_memberships_tenant_id_fkey` violations
- `security.integration.test.ts` - `client_companies_tenant_id_fkey` violations
- `scheduled-report-service.test.ts` - `user_tenant_memberships_tenant_id_fkey` violations
- `reporting-service.test.ts` - `user_tenant_memberships_tenant_id_fkey` violations

**Pattern:** Tests create users/tenants but then immediately try to create related records (memberships, notifications, audit logs) before the parent records are fully committed.

### 2. Prisma Unique Constraint Violations (P2002) — 3 failures

**Root Cause:** Duplicate tenant slugs - test database not properly resetting between tests or test data not using unique identifiers.

**Affected Tests:**
- `report-download.integration.test.ts` - Duplicate tenant slug
- `security.integration.test.ts` - Duplicate tenant slug

**Pattern:** `createTestUser` or similar helpers creating tenants with non-unique slugs.

### 3. Authentication Errors (401) — 20+ failures

**Root Cause:** Token generation failing with "E-posta veya şifre hatalı" - likely due to:
1. User/tenant not fully committed when login attempted
2. Password hashing mismatch
3. User not found in database

**Affected Tests:**
- `audit-logs.integration.test.ts` - Multiple "Failed to get auth token" errors
- `notifications.integration.test.ts` - Auth token failures
- `report-download.integration.test.ts` - Auth token failures
- `scheduled-reports.integration.test.ts` - Auth token failures
- `settings.integration.test.ts` - Auth token failures

**Pattern:** Tests call `getAuthToken()` immediately after `createTestUser()`, but user/tenant not yet committed.

### 4. Unhandled Rejections — 2 errors

**Location:** `src/routes/reporting-routes.ts:156`

**Error:** `TypeError: Cannot read properties of undefined (reading '0')`

**Root Cause:** `error.errors` is undefined when handling ZodError, but code tries to access `error.errors[0]`.

**Affected Tests:**
- `reporting-routes.integration.test.ts` - "should return 400 for missing filters"
- `reporting-routes.integration.test.ts` - "should return 400 for invalid date format in filters"

### 5. Logic/Assertion Failures — 10+ failures

**Categories:**

#### A. Integration Sync Issues
- `integrations.integration.test.ts` - Sync job not creating invoices (expected > 0, got 0)
- `integrations.integration.test.ts` - Tenant isolation failing (integration not found in list)

#### B. Missing Report Definitions
- `scheduled-report-service.test.ts` - "Geçersiz rapor kodu: TENANT_PORTFOLIO"
- Report definitions not seeded properly in test setup

#### C. User Not Found in Test Factories
- `reporting-service.test.ts` - "User {id} not found. Create user before creating document."
- Test factories trying to create documents with user IDs that don't exist

#### D. Wrong Error Messages
- `report-download.integration.test.ts` - Expected "Müşteri şirketi ID'si gerekli" but got "Bu rapor için müşteri şirket seçilmesi zorunludur."
- `security.integration.test.ts` - Expected "kısa ad" but got "Kısa ad sadece küçük harf, rakam ve tire içerebilir."

#### E. Wrong Status Codes
- `security.integration.test.ts` - Expected 401 but got 400/500
- `scheduled-reports.integration.test.ts` - Expected 404 but got 401

#### F. Data Not Persisting
- `reporting-service.test.ts` - Invoice counts by status not matching (expected 1, got 0)

### 6. Record Not Found (P2025) — 1 failure

**Location:** `security.integration.test.ts:544`

**Error:** User not found when trying to update (user was deleted/not committed)

## Priority Fix Order

1. **Fix Prisma error handling in error middleware** (10E) - Add P2002, P2003, P2025 handling
2. **Fix unhandled rejections** (10E) - Fix ZodError handling in reporting-routes.ts
3. **Fix test data creation order** (10B) - Ensure parent records committed before children
4. **Fix authentication token generation** (10C) - Ensure users committed before login
5. **Fix unique constraint violations** (10B) - Ensure unique slugs in test data
6. **Fix missing report definitions** (10D) - Ensure report definitions seeded in tests
7. **Fix logic/assertion failures** (10D) - Fix integration sync, error messages, etc.

## Files Requiring Changes

### Error Handling
- `apps/backend-api/src/middleware/error-handler.ts` - Add Prisma error handling
- `apps/backend-api/src/routes/reporting-routes.ts` - Fix ZodError handling

### Test Infrastructure
- `apps/backend-api/src/test-utils/test-auth.ts` - Fix user/tenant creation and commit order
- `apps/backend-api/src/test-utils/test-db.ts` - Improve reset logic
- `apps/backend-api/src/test-utils/test-factories.ts` - Fix document creation with user validation

### Test Files (Fix data creation order)
- Multiple test files need to ensure data is committed before use

### Services
- `apps/backend-api/src/services/scheduled-report-service.ts` - Fix report definition validation
- Integration sync processor - Fix invoice creation logic




