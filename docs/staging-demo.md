# Staging/Demo Environment Setup

This document describes the demo seed data and how to use it for staging environments.

## Overview

The demo seed script (`apps/backend-api/scripts/seed-demo.ts`) creates comprehensive demo data for staging and demonstration purposes. It creates two demo tenants with realistic Turkish accounting office data.

## Running the Demo Seed

```bash
# From the backend-api directory
pnpm seed:demo

# Or with dry-run mode (to test without making changes)
DRY_RUN=true pnpm seed:demo
```

## Safety Checks

The seed script includes safety checks to prevent accidental execution in production:

- ✅ Only runs if `NODE_ENV` is not "production"
- ✅ Checks that `DATABASE_URL` doesn't contain "production"
- ✅ Supports dry-run mode for testing

## Demo Tenants

### Örnek Muhasebe Ofisi 1

- **Slug**: `ornek_ofis_1`
- **Name**: Örnek Muhasebe Ofisi 1
- **Tax Number**: 1234567890
- **Location**: İstanbul

#### Users

1. **Ahmet Yılmaz** (Accountant)
   - Email: `yonetici@ornekofis1.com`
   - Password: `Demo123!`
   - Role: TenantOwner (Accountant - full access)

2. **Ayşe Demir** (Customer)
   - Email: `musteri@ornekofis1.com`
   - Password: `Demo123!`
   - Role: ReadOnly (Customer - view-only access)

#### Client Companies

1. ABC Teknoloji A.Ş. (Tax: 1111111111)
2. XYZ İnşaat Ltd. (Tax: 2222222222)
3. DEF Ticaret A.Ş. (Tax: 3333333333)
4. GHI Gıda San. Tic. Ltd. (Tax: 4444444444)
5. JKL Lojistik A.Ş. (Tax: 5555555555)

#### Data Included

- ✅ 5 invoices per company (various statuses: PAID, PENDING, OVERDUE)
- ✅ 3 transactions per company
- ✅ 3 documents per company (INVOICE, BANK_STATEMENT, RECEIPT)
- ✅ AI analysis stubs for processed documents
- ✅ Risk scores and alerts
- ✅ Tenant settings (locale: tr-TR, timezone: Europe/Istanbul)
- ✅ Sample notifications
- ✅ Scheduled reports

### Örnek Muhasebe Ofisi 2

- **Slug**: `ornek_ofis_2`
- **Name**: Örnek Muhasebe Ofisi 2
- **Tax Number**: 0987654321
- **Location**: Ankara

#### Users

1. **Fatma Şahin** (Accountant)
   - Email: `yonetici@ornekofis2.com`
   - Password: `Demo123!`
   - Role: TenantOwner (Accountant - full access)

2. **Ali Öztürk** (Customer)
   - Email: `musteri@ornekofis2.com`
   - Password: `Demo123!`
   - Role: ReadOnly (Customer - view-only access)

#### Client Companies

1. MNO Eğitim Hiz. A.Ş. (Tax: 6666666666)
2. PQR Danışmanlık Ltd. (Tax: 7777777777)
3. STU Sağlık Hiz. A.Ş. (Tax: 8888888888)

#### Data Included

Same data structure as Office 1:
- ✅ Invoices, transactions, documents
- ✅ Risk scores and alerts
- ✅ Tenant settings
- ✅ Notifications
- ✅ Scheduled reports

## Login Instructions

1. Navigate to the login page
2. Use any of the demo user credentials above
3. After login, you'll be in the tenant context for that user

## What to Test

With this demo data, you can test:

- ✅ **Multi-tenant isolation**: Switch between tenants and verify data isolation
- ✅ **RBAC**: Test different user roles (Accountant/TenantOwner and Customer/ReadOnly)
- ✅ **Client Companies**: View and manage client companies
- ✅ **Invoices**: View invoices with different statuses
- ✅ **Documents**: Upload and process documents
- ✅ **Risk Features**: View risk scores and alerts
- ✅ **Notifications**: See in-app notifications
- ✅ **Reports**: View scheduled reports
- ✅ **Settings**: Configure tenant and user settings
- ✅ **Audit Logs**: View audit trail

## Notes

- All passwords are set to `Demo123!` for easy testing
- Data is created with realistic Turkish names and tax numbers
- Risk scores are set to demonstrate medium-risk scenarios
- Some documents are marked as "PROCESSED" with AI analysis stubs
- Notifications include both read and unread items

## Resetting Demo Data

To reset the demo data:

```bash
# Option 1: Delete specific tenants (if you have database access)
# Option 2: Re-run the seed script (it will skip existing tenants)
# Option 3: Drop and recreate the database (use with caution!)
```

The seed script is idempotent for tenants and users - it will skip creation if they already exist, but will create new data for companies, invoices, etc. each time it runs.



