# Risk Scoring Migration Instructions

## Prerequisites
- PostgreSQL database running
- DATABASE_URL environment variable set

## Steps to Complete

### 1. Set DATABASE_URL
Create a `.env` file in `apps/backend-api/` with:
```
DATABASE_URL="postgresql://user:password@localhost:5432/database_name"
```

### 2. Run Migration
```bash
cd apps/backend-api
pnpm db:migrate --name add_risk_scoring_models
```

### 3. Seed Risk Rules
```bash
cd apps/backend-api
tsx prisma/seed-risk-rules.ts
```

## Alternative: Manual SQL Migration
If Prisma migration fails, you can run the SQL manually:
```bash
psql $DATABASE_URL -f apps/backend-api/prisma/migrations/20250101000000_add_risk_scoring_models/migration.sql
```

## Note
Prisma was temporarily downgraded to 5.22.0 for Node.js 20.10.0 compatibility.
Consider upgrading Node.js to 20.19+ or 22.12+ to use Prisma 7.1.0.
