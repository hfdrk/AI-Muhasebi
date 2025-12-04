# Verification Tests for Tasks 0-6

This document describes the automated verification system for Tasks 0-6 of the AI Muhasebi platform.

## Overview

The verification system provides automated testing to ensure all features from Tasks 0-6 are working correctly. It includes:

- **Backend Integration Tests**: Test API endpoints and business logic
- **Frontend E2E Tests**: Test user flows through the web interface

## Running Verification

To run all verification tests:

```bash
pnpm verify:tasks0-6
```

This single command will:
1. Run all backend integration tests
2. Start the backend server (if not already running)
3. Start the frontend server (via Playwright's webServer config)
4. Run all frontend E2E tests
5. Collect and report results

## What is Verified

### Auth + Tenants + RBAC (Task 1)
- User registration creates User, Tenant, and UserTenantMembership
- Login with correct/wrong credentials
- Tenant isolation (users cannot access other tenants' data)
- Role-based access control (TenantOwner, Accountant, Staff, ReadOnly permissions)

### Core Domain (Task 2)
- Client company creation and duplicate tax number validation
- Invoice creation with line items and total validation
- Transaction creation with debit/credit balance validation
- Tenant-scoped data filtering

### Documents & AI (Tasks 3 & 4)
- Document upload creates Document record with UPLOADED status
- Document processing pipeline (OCR → Parse → Risk Features)
- OCR stub service returns text and engine name
- Parser stub extracts structured data
- Risk feature generator detects issues (due_date < issue_date, duplicate invoice numbers)

### Risk & Alerts (Task 5)
- Risk scoring engine calculates document and company risk scores
- Risk rules trigger correctly based on features
- Risk alerts are created for high-risk documents/companies
- Severity levels (low/medium/high/critical) are assigned correctly

### Integrations & Sync (Task 6)
- Integration provider connection testing
- Integration sync jobs process successfully
- Invoices/transactions are imported from mock providers
- Tenant isolation for integration data

## Test Structure

### Backend Tests

Located in `apps/backend-api/src/routes/__tests__/` and `apps/backend-api/src/services/__tests__/`:

- `auth-routes.integration.test.ts` - Authentication and tenant flows
- `rbac.integration.test.ts` - Role-based access control
- `core-domain.integration.test.ts` - Client companies, invoices, transactions
- `documents.integration.test.ts` - Document upload and processing
- `ai-pipeline.integration.test.ts` - OCR, parser, risk features
- `risk-engine.integration.test.ts` - Risk scoring and alerts
- `integrations.integration.test.ts` - Integration providers and sync

### Frontend E2E Tests

Located in `apps/web-app/e2e/`:

- `auth.spec.ts` - Signup and login flows
- `client-companies.spec.ts` - Client company management
- `invoices.spec.ts` - Invoice creation and viewing
- `documents.spec.ts` - Document upload and AI analysis
- `risk.spec.ts` - Risk dashboard and alerts
- `integrations.spec.ts` - Integration management

## Prerequisites

### Environment Variables

The following environment variables must be set:

- `DATABASE_URL` - Main database connection (default: `postgresql://ai_muhasebi:ai_muhasebi_dev@localhost:5432/ai_muhasebi`)
- `DATABASE_URL_TEST` - Test database connection (default: `postgresql://ai_muhasebi:ai_muhasebi_dev@localhost:5432/ai_muhasebi_test`)
- `JWT_SECRET` - JWT secret for token generation (min 32 characters)
- `JWT_ACCESS_TOKEN_EXPIRY` - Access token expiry (default: "15m")
- `JWT_REFRESH_TOKEN_EXPIRY` - Refresh token expiry (default: "7d")
- `PORT` - Backend server port (default: 3800)

### Services

The following services must be running:

- **PostgreSQL**: Database server (via Docker Compose or local installation)
  ```bash
  docker-compose up -d postgres
  ```

### Test Database

The verification script will automatically:
- Create the test database (`ai_muhasebi_test`) if it doesn't exist
- Run migrations on the test database
- Reset the test database before each test run

**Note**: The test database is separate from the development database to ensure test isolation.

## Understanding Results

### PASS vs FAIL

- **PASS**: All tests in a category passed (0 failures)
- **FAIL**: One or more tests in a category failed

### Output Format

The verification script outputs:

1. **Backend Tests Summary**:
   - Total tests, passed, failed
   - Breakdown by test suite

2. **Frontend E2E Tests Summary**:
   - Total tests, passed, failed
   - Breakdown by test suite

3. **Key Flows Summary**:
   - Auth & Tenants: PASS/FAIL
   - Core Domain: PASS/FAIL
   - Documents & AI: PASS/FAIL
   - Risk & Alerts: PASS/FAIL
   - Integrations: PASS/FAIL

4. **Overall Status**:
   - ✅ ALL TESTS PASSED - Tasks 0-6 are working correctly
   - ❌ SOME TESTS FAILED - Review results above

## Troubleshooting

### Database Connection Errors

If you see database connection errors:

1. Ensure PostgreSQL is running:
   ```bash
   docker-compose up -d postgres
   ```

2. Check database credentials in `.env` files

3. Verify test database exists and migrations are applied

### Port Conflicts

If ports 3000 or 3800 are already in use:

1. Stop existing servers
2. Or set `PORT` environment variable to a different port
3. Update `playwright.config.ts` if frontend port changes

### Test Timeouts

If tests timeout:

1. Increase timeout values in test files
2. Check server startup logs
3. Verify network connectivity

### E2E Tests Failing

If E2E tests fail:

1. Ensure backend server is running on port 3800
2. Check browser console for errors
3. Verify test data setup (users, companies, etc.)
4. Check Playwright browser installation: `pnpm --filter web-app exec playwright install`

## Test Data

Tests use isolated test data:
- Test users are created with unique emails (timestamp-based)
- Test tenants use unique slugs
- All test data is cleaned up between test runs

## Continuous Integration

The verification can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Verification
  run: pnpm verify:tasks0-6
  env:
    DATABASE_URL: postgresql://...
    DATABASE_URL_TEST: postgresql://...
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

## Maintenance

### Adding New Tests

When adding new features:

1. Add backend integration tests in `apps/backend-api/src/routes/__tests__/` or `apps/backend-api/src/services/__tests__/`
2. Add E2E tests in `apps/web-app/e2e/`
3. Update this documentation if new test categories are added

### Updating Test Utilities

Test utilities are located in:
- `apps/backend-api/src/test-utils/` - Backend test helpers
- `apps/web-app/e2e/utils/` - E2E test helpers

## Support

For issues with the verification system, check:
1. Test logs in `test-results/` directory
2. Server logs for backend/frontend startup issues
3. Database connection and migration status


