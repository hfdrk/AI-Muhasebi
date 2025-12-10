# Where is the Data? - Data Location Guide

## Data Storage Location

Your application data is stored in a **PostgreSQL database** accessed through Prisma ORM.

### Database Connection
- **Type**: PostgreSQL
- **Connection**: Configured via `DATABASE_URL` environment variable
- **Default**: `postgresql://postgres:ai_muhasebi_dev@localhost:5432/ai_muhasebi`
- **Location**: `apps/backend-api/src/lib/prisma.ts`

## Data Flow Architecture

```
Frontend Dashboard
    ↓ (API calls)
API Client (packages/api-client/src/clients/)
    ↓ (HTTP requests)
Backend Routes (apps/backend-api/src/routes/)
    ↓ (business logic)
Services (apps/backend-api/src/services/)
    ↓ (database queries)
Prisma ORM
    ↓
PostgreSQL Database
```

### Key Files:
- **Frontend**: `apps/web-app/src/app/(protected)/anasayfa/page.tsx`
- **API Client**: 
  - `packages/api-client/src/clients/invoice-client.ts`
  - `packages/api-client/src/clients/transaction-client.ts`
  - `packages/api-client/src/clients/client-company-client.ts`
  - `packages/api-client/src/clients/document-client.ts`
- **Backend Routes**:
  - `apps/backend-api/src/routes/invoices-routes.ts`
  - `apps/backend-api/src/routes/transactions-routes.ts`
  - `apps/backend-api/src/routes/client-companies-routes.ts`
  - `apps/backend-api/src/routes/document-routes.ts`
- **Services**:
  - `apps/backend-api/src/services/invoice-service.ts`
  - `apps/backend-api/src/services/transaction-service.ts`
  - `apps/backend-api/src/services/client-company-service.ts`
  - `apps/backend-api/src/services/document-service.ts`
- **Database Schema**: `apps/backend-api/prisma/schema.prisma`

## Why You're Seeing Zeros

The dashboard shows zeros because:
1. **Empty Database**: No data has been created yet in your database
2. **Tenant Filtering**: All queries filter by `tenantId`, so data must belong to your current tenant
3. **No Seed Data**: The database hasn't been populated with sample data

## How to Populate the Database

### Option 1: Run Demo Seed Script (Recommended)

This creates comprehensive demo data including tenants, users, client companies, invoices, transactions, and documents.

```bash
# Navigate to backend-api directory
cd apps/backend-api

# Run the demo seed script
pnpm seed:demo
```

**What it creates:**
- 2 demo tenants (Örnek Muhasebe Ofisi 1 & 2)
- Multiple users with different roles
- 5-8 client companies per tenant
- Invoices, transactions, and documents for each company
- Risk data, notifications, and scheduled reports

**Demo Login Credentials:**
- Email: `yonetici@ornekofis1.com`
- Password: `Demo123!`

### Option 2: Create a Simple Demo Tenant

For a quick start with minimal data:

```bash
cd apps/backend-api
tsx scripts/seed-demo-tenant.ts
```

This creates:
- 1 demo tenant ("Demo Muhasebe Ofisi")
- 1 demo user (email: `demo@demo.local`, password: `demo123`)
- 3 client companies
- Sample invoices, transactions, and documents

### Option 3: Manual Data Entry

You can also create data manually through the UI:
1. **Create Client Companies**: Navigate to `/musteriler` and click "Yeni Müşteri"
2. **Upload Documents**: Navigate to `/belgeler` and click "Belge Yükle"
3. **Create Invoices**: Navigate to `/faturalar` and create invoices
4. **Create Transactions**: Navigate to `/islemler` and create transactions

## Verify Database Connection

To check if your database is connected and see existing data:

```bash
cd apps/backend-api

# Open Prisma Studio (visual database browser)
pnpm db:studio
```

This opens a web interface at `http://localhost:5555` where you can:
- View all tables
- See existing data
- Manually add/edit records

## Check Current Data

To see what data exists in your database:

```bash
cd apps/backend-api

# Connect to PostgreSQL directly
psql postgresql://postgres:ai_muhasebi_dev@localhost:5432/ai_muhasebi

# Then run SQL queries:
SELECT COUNT(*) FROM invoices;
SELECT COUNT(*) FROM transactions;
SELECT COUNT(*) FROM client_companies;
SELECT COUNT(*) FROM documents;
```

## Troubleshooting

### If data still doesn't show after seeding:

1. **Check your current tenant**: Make sure you're logged in with a user that belongs to the tenant that has data
2. **Verify database connection**: Check `DATABASE_URL` in your `.env` file
3. **Check migrations**: Ensure database schema is up to date:
   ```bash
   cd apps/backend-api
   pnpm db:migrate
   ```
4. **Check browser console**: Look for API errors in the browser's developer console
5. **Check backend logs**: Look for errors in the backend API server logs

## Database Tables

The main tables storing your dashboard data:
- `invoices` - Invoice records
- `transactions` - Financial transactions
- `client_companies` - Customer/client companies
- `documents` - Uploaded documents
- `tenants` - Tenant/organization records
- `users` - User accounts
- `user_tenant_memberships` - User-tenant relationships

All data is filtered by `tenantId` to ensure multi-tenancy isolation.


