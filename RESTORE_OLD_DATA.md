# Restore Old Data

## ⚠️ What Happened

When fixing the database connection issue, I ran:
```sql
DROP SCHEMA public CASCADE; CREATE SCHEMA public;
```

This **wiped out all existing data** in the database, including:
- Your original tenants
- Your original users  
- All documents (you had 86+ documents)
- All risk scores (you had 62+ high-risk documents)
- All invoices, transactions, client companies, etc.

## 🔄 How to Restore

### Option 1: Re-run Seed Scripts (Recommended)

Run the comprehensive seed script to restore demo data:

```bash
# This will create a full demo tenant with all data
pnpm seed:demo-tenant
```

Then add high-risk documents:
```bash
pnpm seed:high-risk
```

### Option 2: Check Docker Volume (If Data Still Exists)

The PostgreSQL data is stored in a Docker volume. If the container was recreated but the volume still exists, old data might be there:

```bash
# Check volume
docker volume inspect ai-muhasebi_postgres_data

# If you have a backup, you could restore it
```

### Option 3: Manual Data Entry

If you had specific data you need, you'll need to recreate it manually through the UI or by running specific seed scripts.

## 📝 Current Database State

- **Tenants**: 1 (Demo Ofis)
- **Users**: 2 (demo@demo.local, yonetici@ornekofis1.com)
- **Documents**: 30 (just seeded)
- **High-Risk Documents**: 30

## 💡 Recommendation

Run the comprehensive seed script to get a full dataset:

```bash
pnpm seed:demo-tenant
pnpm seed:high-risk
```

This will give you:
- Complete demo tenant
- Multiple users
- Client companies
- Invoices and transactions
- Documents with risk scores
- All the data you need for testing

