# Role-Based Access Control (RBAC)

## Platform-Level Roles

- **PlatformAdmin**: Full system access, manages all tenants, system configuration
- **Support**: Read-only access to all tenants for support purposes

## Tenant-Level Roles

- **TenantOwner**: Full control within tenant (billing, user management, all features)
- **Accountant**: Full access to accounting features, cannot manage users or billing
- **Staff**: Limited access (view clients, create invoices, view reports)
- **ReadOnly**: View-only access to all tenant data

## Permissions

### Document Management
- `documents:create`, `documents:read`, `documents:update`, `documents:delete`, `documents:analyze`

### Invoice Management
- `invoices:create`, `invoices:read`, `invoices:update`, `invoices:delete`, `invoices:export`

### Client Management
- `clients:create`, `clients:read`, `clients:update`, `clients:delete`

### Risk & Analysis
- `risk:view`, `risk:configure`, `risk:acknowledge`

### Reporting
- `reports:view`, `reports:create`, `reports:export`

### User Management
- `users:invite`, `users:read`, `users:update`, `users:delete`

### Settings
- `settings:read`, `settings:update`, `settings:billing`

### Integrations
- `integrations:manage`

## Role-to-Permission Mapping

- **TenantOwner**: All permissions
- **Accountant**: All document/invoice/client/report permissions, no user management or billing
- **Staff**: `documents:create`, `documents:read`, `invoices:create`, `invoices:read`, `clients:read`, `reports:view`
- **ReadOnly**: All `:read` permissions only

## Implementation

- **Backend**: Permission decorators/middleware on routes, resource-level checks
- **Frontend**: Route guards, component-level permission checks, conditional UI rendering

