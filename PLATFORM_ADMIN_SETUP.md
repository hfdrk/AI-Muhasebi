# Platform Admin Console Setup Guide

## Database Migration

The migration file has been created at:
`apps/backend-api/prisma/migrations/20251209200000_add_platform_role_and_tenant_status/migration.sql`

To apply the migration:

```bash
cd apps/backend-api
pnpm prisma migrate deploy
```

Or if using development mode:

```bash
cd apps/backend-api
pnpm prisma migrate dev
```

## Create Platform Admin User

### Option 1: Using SQL (Quick)

```sql
-- Update existing user to platform admin
UPDATE users SET platform_role = 'PLATFORM_ADMIN' WHERE email = 'your-admin@example.com';

-- Or create new platform admin user
INSERT INTO users (id, email, hashed_password, full_name, locale, is_active, platform_role, created_at, updated_at)
VALUES (
  gen_random_uuid()::text,
  'admin@example.com',
  '$2b$10$...', -- Use a password hasher to generate this
  'Platform Admin',
  'tr-TR',
  true,
  'PLATFORM_ADMIN',
  NOW(),
  NOW()
);
```

### Option 2: Using the Script

A helper script is available at `apps/backend-api/scripts/create-platform-admin.ts`:

```bash
cd apps/backend-api
pnpm tsx scripts/create-platform-admin.ts admin@example.com
```

This will:
- Create a new user with email `admin@example.com`
- Set default password: `Admin123!@#`
- Assign `PLATFORM_ADMIN` role
- **Important**: Change the password after first login!

## Testing

Run the admin console integration tests:

```bash
cd apps/backend-api
pnpm test -- admin.integration.test.ts
```

## Accessing the Admin Console

1. Log in as a platform admin user
2. Look for "Yönetim Konsolu" link in the header navigation
3. Navigate to:
   - `/admin/overview` - Platform metrics dashboard
   - `/admin/tenants` - Tenant management
   - `/admin/users` - User search
   - `/admin/support` - Support incidents

## Features

- **Tenant Management**: View all tenants, see details, suspend/activate tenants
- **User Search**: Search users across all tenants, see platform and tenant roles
- **Support Incidents**: View failed scheduled reports and integration syncs
- **Platform Metrics**: Overview of platform-wide statistics
- **Impersonation**: Safely impersonate users for troubleshooting (with audit logging)

## Security Notes

- All admin endpoints require `PLATFORM_ADMIN` role
- Tenant-only users (TenantOwner, Accountant, Staff, ReadOnly) cannot access admin endpoints
- All admin actions are logged in audit logs
- Impersonation tokens are short-lived (15 minutes)
- Impersonation is clearly visible in the UI with a banner



