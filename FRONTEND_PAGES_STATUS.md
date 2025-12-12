# Frontend Pages Status Report

**Last Updated:** January 2025  
**Status:** Missing pages identified

---

## Overview

This document tracks which backend API routes have corresponding frontend pages and which are missing. The user has manually fixed some, but many are still missing.

---

## ✅ Routes with Frontend Pages (EXISTING)

### 1. E-Fatura (Electronic Invoice)
- **Backend Routes:** `/api/v1/e-fatura/*`
- **Frontend Page:** ✅ `/e-fatura/page.tsx`
- **Status:** **COMPLETE**
- **Location:** `apps/web-app/src/app/(protected)/e-fatura/page.tsx`
- **Features:**
  - Submit invoices to E-Fatura system
  - Check invoice status
  - Retry failed submissions
  - List invoices ready for submission

### 2. E-Arşiv (Electronic Archive)
- **Backend Routes:** `/api/v1/e-arsiv/*`
- **Frontend Page:** ✅ `/e-arsiv/page.tsx`
- **Status:** **COMPLETE**
- **Location:** `apps/web-app/src/app/(protected)/e-arsiv/page.tsx`
- **Features:**
  - Archive invoices
  - Search archived invoices
  - Auto-archive functionality

### 3. E-Defter (Electronic Ledger)
- **Backend Routes:** `/api/v1/e-defter/*`
- **Frontend Page:** ✅ `/e-defter/page.tsx`
- **Status:** **COMPLETE**
- **Location:** `apps/web-app/src/app/(protected)/e-defter/page.tsx`
- **Features:**
  - Generate E-Defter for periods
  - Submit to GIB
  - List ledgers

### 4. ML Fraud Detection
- **Backend Routes:** `/api/v1/risk/ml-fraud/*`
- **Frontend Page:** ✅ `/risk/ml-fraud/page.tsx`
- **Status:** **COMPLETE**
- **Location:** `apps/web-app/src/app/(protected)/risk/ml-fraud/page.tsx`
- **Features:**
  - View ML fraud scores
  - Check for fraud patterns

---

## ❌ Routes WITHOUT Frontend Pages (MISSING)

### 1. Tax Routes (VERGI/KDV/TMS) - **HIGH PRIORITY**

**Backend Routes:** `/api/v1/tax/*`

#### Missing Pages:

1. **Tax Dashboard/Overview**
   - **Route:** `/vergi` or `/tax`
   - **Backend:** Multiple endpoints
   - **Priority:** 🔴 HIGH
   - **Features Needed:**
     - Tax compliance overview
     - VAT summary
     - Tax deadlines
     - Compliance status

2. **VAT Optimization**
   - **Route:** `/vergi/kdv` or `/tax/vat`
   - **Backend:** `/api/v1/tax/vat/*`
   - **Priority:** 🔴 HIGH
   - **Features Needed:**
     - VAT analysis dashboard
     - Input/output VAT tracking
     - VAT inconsistencies list
     - VAT return preparation
     - VAT optimization suggestions

3. **Tax Compliance**
   - **Route:** `/vergi/uyumluluk` or `/tax/compliance`
   - **Backend:** `/api/v1/tax/compliance/*`
   - **Priority:** 🔴 HIGH
   - **Features Needed:**
     - Compliance checklist
     - Tax deadline reminders
     - Compliance issues list
     - Compliance status per client

4. **Tax Reporting**
   - **Route:** `/vergi/raporlar` or `/tax/reports`
   - **Backend:** `/api/v1/tax/reports/*`
   - **Priority:** 🔴 HIGH
   - **Features Needed:**
     - VAT declaration generator
     - Corporate tax report
     - Withholding tax report
     - Monthly tax summary
     - Report history

5. **TMS Compliance**
   - **Route:** `/vergi/tms` or `/tax/tms`
   - **Backend:** `/api/v1/tax/tms/*`
   - **Priority:** 🟡 MEDIUM
   - **Features Needed:**
     - TMS compliance validation
     - Balance sheet generator
     - Income statement generator
     - TMS compliance report

**Total Missing:** 5 pages

---

### 2. KVKK (Data Protection) Routes - **HIGH PRIORITY**

**Backend Routes:** `/api/v1/kvkk/*`

#### Missing Pages:

1. **KVKK Compliance Dashboard**
   - **Route:** `/kvkk` or `/veri-koruma`
   - **Backend:** Multiple endpoints
   - **Priority:** 🔴 HIGH
   - **Features Needed:**
     - Consent management overview
     - Data access requests
     - Data deletion requests
     - Breach notifications
     - Audit log

2. **Consent Management**
   - **Route:** `/kvkk/onaylar` or `/kvkk/consent`
   - **Backend:** `/api/v1/kvkk/consent/*`
   - **Priority:** 🔴 HIGH
   - **Features Needed:**
     - View consent status per user
     - Record consent
     - Consent history
     - Consent types (data_processing, marketing, analytics, third_party)

3. **Data Access Requests**
   - **Route:** `/kvkk/veri-erisim` or `/kvkk/data-access`
   - **Backend:** `/api/v1/kvkk/data-access/*`
   - **Priority:** 🟡 MEDIUM
   - **Features Needed:**
     - List data access requests
     - Request data access
     - Export user data
     - Request status tracking

4. **Data Deletion Requests**
   - **Route:** `/kvkk/veri-silme` or `/kvkk/data-deletion`
   - **Backend:** `/api/v1/kvkk/data-deletion/*`
   - **Priority:** 🟡 MEDIUM
   - **Features Needed:**
     - List deletion requests
     - Request data deletion
     - Deletion status tracking
     - Data retention information

5. **Breach Management**
   - **Route:** `/kvkk/ihlaller` or `/kvkk/breaches`
   - **Backend:** `/api/v1/kvkk/breach`
   - **Priority:** 🔴 HIGH
   - **Features Needed:**
     - Record data breaches
     - Breach severity levels
     - Affected users count
     - Breach notification tracking

6. **Audit Log**
   - **Route:** `/kvkk/denetim` or `/kvkk/audit`
   - **Backend:** `/api/v1/kvkk/audit-log`
   - **Priority:** 🟡 MEDIUM
   - **Features Needed:**
     - Data access audit log
     - Filter by user
     - Export audit log

**Total Missing:** 6 pages

---

### 3. Security Routes - **MEDIUM PRIORITY**

**Backend Routes:** `/api/v1/security/*`

#### Missing Pages:

1. **Security Settings Dashboard**
   - **Route:** `/guvenlik` or `/security`
   - **Backend:** Multiple endpoints
   - **Priority:** 🟡 MEDIUM
   - **Features Needed:**
     - Security overview
     - 2FA status
     - IP whitelist status
     - Account lockout status

2. **Two-Factor Authentication (2FA)**
   - **Route:** `/guvenlik/2fa` or `/security/2fa`
   - **Backend:** `/api/v1/security/2fa/*`
   - **Priority:** 🟡 MEDIUM
   - **Features Needed:**
     - Enable 2FA
     - QR code display
     - Backup codes display
     - Verify and activate 2FA
     - Disable 2FA
     - 2FA status per user

3. **IP Whitelisting**
   - **Route:** `/guvenlik/ip-izin-listesi` or `/security/ip-whitelist`
   - **Backend:** `/api/v1/security/ip-whitelist/*`
   - **Priority:** 🟢 LOW
   - **Features Needed:**
     - List whitelisted IPs
     - Add IP to whitelist
     - Remove IP from whitelist
     - Check current IP status
     - IP whitelist per user/tenant

4. **Password Policy**
   - **Route:** `/guvenlik/sifre-politikasi` or `/security/password-policy`
   - **Backend:** `/api/v1/security/password/validate`
   - **Priority:** 🟢 LOW
   - **Features Needed:**
     - Password validation
     - Password policy display
     - Password strength indicator

5. **Account Lockout Management**
   - **Route:** `/guvenlik/hesap-kilidi` or `/security/account-lockout`
   - **Backend:** `/api/v1/security/account-lockout/*`
   - **Priority:** 🟢 LOW
   - **Features Needed:**
     - View lockout status
     - Unlock accounts
     - Failed attempt history

**Total Missing:** 5 pages

---

### 4. Analytics Routes - **MEDIUM PRIORITY**

**Backend Routes:** `/api/v1/analytics/*`

#### Missing Pages:

1. **Analytics Dashboard**
   - **Route:** `/analitik` or `/analytics`
   - **Backend:** `/api/v1/analytics/dashboard`
   - **Priority:** 🟡 MEDIUM
   - **Features Needed:**
     - Financial trends charts
     - Risk trends charts
     - Client portfolio analytics
     - Revenue/expense forecasts
     - Summary metrics

2. **Financial Trends**
   - **Route:** `/analitik/finansal-trendler` or `/analytics/financial-trends`
   - **Backend:** `/api/v1/analytics/financial-trends`
   - **Priority:** 🟡 MEDIUM
   - **Features Needed:**
     - Revenue/expense/profit trends
     - Period selector (daily/weekly/monthly/quarterly)
     - Chart visualizations
     - Export functionality

3. **Risk Trends**
   - **Route:** `/analitik/risk-trendleri` or `/analytics/risk-trends`
   - **Backend:** `/api/v1/analytics/risk-trends`
   - **Priority:** 🟡 MEDIUM
   - **Features Needed:**
     - Risk score trends
     - High-risk client count trends
     - Critical alerts trends
     - Risk score change indicators

4. **Client Portfolio Analytics**
   - **Route:** `/analitik/musteri-portfoyu` or `/analytics/portfolio`
   - **Backend:** `/api/v1/analytics/portfolio`
   - **Priority:** 🟡 MEDIUM
   - **Features Needed:**
     - Total/active clients
     - Risk distribution
     - Top clients by revenue
     - Average revenue per client

5. **Revenue Forecast**
   - **Route:** `/analitik/gelir-tahmini` or `/analytics/revenue-forecast`
   - **Backend:** `/api/v1/analytics/revenue-forecast`
   - **Priority:** 🟢 LOW
   - **Features Needed:**
     - Forecast chart
     - Confidence intervals
     - Forecast factors
     - Period selector

6. **Expense Forecast**
   - **Route:** `/analitik/gider-tahmini` or `/analytics/expense-forecast`
   - **Backend:** `/api/v1/analytics/expense-forecast`
   - **Priority:** 🟢 LOW
   - **Features Needed:**
     - Forecast chart
     - Category breakdown
     - Confidence intervals
     - Period selector

**Total Missing:** 6 pages

---

### 5. Database Optimization Routes - **LOW PRIORITY**

**Backend Routes:** `/api/v1/db-optimization/*`

#### Missing Pages:

1. **Database Optimization Dashboard**
   - **Route:** `/veritabani-optimizasyonu` or `/db-optimization`
   - **Backend:** Multiple endpoints
   - **Priority:** 🟢 LOW (Admin only)
   - **Features Needed:**
     - Index recommendations
     - Connection pool stats
     - Table sizes
     - Optimization actions

2. **Index Management**
   - **Route:** `/veritabani-optimizasyonu/indexler` or `/db-optimization/indexes`
   - **Backend:** `/api/v1/db-optimization/indexes/*`
   - **Priority:** 🟢 LOW (Admin only)
   - **Features Needed:**
     - List recommended indexes
     - Create indexes
     - Index impact analysis

3. **Connection Pool Monitor**
   - **Route:** `/veritabani-optimizasyonu/baglanti-havuzu` or `/db-optimization/connection-pool`
   - **Backend:** `/api/v1/db-optimization/connection-pool/*`
   - **Priority:** 🟢 LOW (Admin only)
   - **Features Needed:**
     - Active/idle connections
     - Max connections
     - Connection pool stats

4. **Table Analysis**
   - **Route:** `/veritabani-optimizasyonu/tablolar` or `/db-optimization/tables`
   - **Backend:** `/api/v1/db-optimization/tables/*`
   - **Priority:** 🟢 LOW (Admin only)
   - **Features Needed:**
     - Table sizes
     - Row counts
     - Index sizes
     - Vacuum operations

**Total Missing:** 4 pages

---

## Summary Statistics

### By Status:
- ✅ **Complete:** 4 route groups (E-Fatura, E-Arşiv, E-Defter, ML Fraud)
- ❌ **Missing:** 5 route groups (Tax, KVKK, Security, Analytics, DB Optimization)

### By Priority:
- 🔴 **HIGH Priority:** 11 pages
  - Tax routes (5 pages)
  - KVKK routes (6 pages)
- 🟡 **MEDIUM Priority:** 11 pages
  - Security routes (5 pages)
  - Analytics routes (6 pages)
- 🟢 **LOW Priority:** 4 pages
  - Database optimization (4 pages)

### Total Missing Pages: **26 pages**

---

## Recommended Implementation Order

### Phase 1: Critical (HIGH Priority) - 11 pages
1. Tax Dashboard (`/vergi`)
2. VAT Optimization (`/vergi/kdv`)
3. Tax Compliance (`/vergi/uyumluluk`)
4. Tax Reporting (`/vergi/raporlar`)
5. KVKK Dashboard (`/kvkk`)
6. Consent Management (`/kvkk/onaylar`)
7. Breach Management (`/kvkk/ihlaller`)
8. TMS Compliance (`/vergi/tms`)
9. Data Access Requests (`/kvkk/veri-erisim`)
10. Data Deletion Requests (`/kvkk/veri-silme`)
11. KVKK Audit Log (`/kvkk/denetim`)

### Phase 2: Important (MEDIUM Priority) - 11 pages
1. Analytics Dashboard (`/analitik`)
2. Financial Trends (`/analitik/finansal-trendler`)
3. Risk Trends (`/analitik/risk-trendleri`)
4. Client Portfolio (`/analitik/musteri-portfoyu`)
5. Security Dashboard (`/guvenlik`)
6. 2FA Management (`/guvenlik/2fa`)
7. IP Whitelisting (`/guvenlik/ip-izin-listesi`)
8. Revenue Forecast (`/analitik/gelir-tahmini`)
9. Expense Forecast (`/analitik/gider-tahmini`)
10. Password Policy (`/guvenlik/sifre-politikasi`)
11. Account Lockout (`/guvenlik/hesap-kilidi`)

### Phase 3: Optional (LOW Priority) - 4 pages
1. Database Optimization Dashboard (`/veritabani-optimizasyonu`)
2. Index Management (`/veritabani-optimizasyonu/indexler`)
3. Connection Pool Monitor (`/veritabani-optimizasyonu/baglanti-havuzu`)
4. Table Analysis (`/veritabani-optimizasyonu/tablolar`)

---

## Implementation Notes

### Common Patterns to Follow:

1. **Use existing page structure:**
   - Follow patterns from `/e-fatura/page.tsx`
   - Use React Query for data fetching
   - Use existing UI components from `components/ui/`

2. **Navigation Integration:**
   - Add routes to `layout.tsx` navigation items
   - Use Turkish labels for consistency
   - Add appropriate icons

3. **API Client Integration:**
   - Ensure API client methods exist in `@repo/api-client`
   - Add methods if missing
   - Handle errors gracefully

4. **Permissions:**
   - Check RBAC permissions match backend
   - Hide/show UI based on permissions
   - Use `requirePermission` checks

5. **Styling:**
   - Use design system from `styles/design-system.ts`
   - Follow existing color schemes
   - Maintain responsive design

---

## Quick Reference: Route Mapping

| Backend Route | Frontend Route (Turkish) | Frontend Route (English) | Status |
|--------------|-------------------------|-------------------------|--------|
| `/api/v1/e-fatura/*` | `/e-fatura` | `/e-invoice` | ✅ |
| `/api/v1/e-arsiv/*` | `/e-arsiv` | `/e-archive` | ✅ |
| `/api/v1/e-defter/*` | `/e-defter` | `/e-ledger` | ✅ |
| `/api/v1/tax/*` | `/vergi` | `/tax` | ❌ |
| `/api/v1/tax/vat/*` | `/vergi/kdv` | `/tax/vat` | ❌ |
| `/api/v1/tax/compliance/*` | `/vergi/uyumluluk` | `/tax/compliance` | ❌ |
| `/api/v1/tax/reports/*` | `/vergi/raporlar` | `/tax/reports` | ❌ |
| `/api/v1/tax/tms/*` | `/vergi/tms` | `/tax/tms` | ❌ |
| `/api/v1/kvkk/*` | `/kvkk` | `/data-protection` | ❌ |
| `/api/v1/kvkk/consent/*` | `/kvkk/onaylar` | `/kvkk/consent` | ❌ |
| `/api/v1/kvkk/data-access/*` | `/kvkk/veri-erisim` | `/kvkk/data-access` | ❌ |
| `/api/v1/kvkk/data-deletion/*` | `/kvkk/veri-silme` | `/kvkk/data-deletion` | ❌ |
| `/api/v1/kvkk/breach` | `/kvkk/ihlaller` | `/kvkk/breaches` | ❌ |
| `/api/v1/kvkk/audit-log` | `/kvkk/denetim` | `/kvkk/audit` | ❌ |
| `/api/v1/security/*` | `/guvenlik` | `/security` | ❌ |
| `/api/v1/security/2fa/*` | `/guvenlik/2fa` | `/security/2fa` | ❌ |
| `/api/v1/security/ip-whitelist/*` | `/guvenlik/ip-izin-listesi` | `/security/ip-whitelist` | ❌ |
| `/api/v1/analytics/*` | `/analitik` | `/analytics` | ❌ |
| `/api/v1/analytics/financial-trends` | `/analitik/finansal-trendler` | `/analytics/financial-trends` | ❌ |
| `/api/v1/analytics/risk-trends` | `/analitik/risk-trendleri` | `/analytics/risk-trends` | ❌ |
| `/api/v1/analytics/portfolio` | `/analitik/musteri-portfoyu` | `/analytics/portfolio` | ❌ |
| `/api/v1/db-optimization/*` | `/veritabani-optimizasyonu` | `/db-optimization` | ❌ |
| `/api/v1/risk/ml-fraud/*` | `/risk/ml-fraud` | `/risk/ml-fraud` | ✅ |

---

**Document Status:** Complete  
**Next Steps:** Implement missing pages in priority order

