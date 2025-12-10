# Role-Based Access Control (RBAC)

## Platform-Level Roles

- **PlatformAdmin**: Full system access, manages all tenants, system configuration
- **Support**: Read-only access to all tenants for support purposes

## Tenant-Level Roles

The system uses a simplified two-role model:

- **TenantOwner** (Accountant): Full control within tenant (billing, user management, all features)
  - Label: "Muhasebeci" (Accountant)
  - Full access to all features
  
- **ReadOnly** (Customer): View-only access to all tenant data
  - Label: "Müşteri" (Customer)
  - Can view documents, invoices, clients, reports, and risk information
  - Cannot create, edit, or delete anything

**Note**: The Accountant and Staff roles are deprecated and should not be used for new users.

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

- **TenantOwner** (Accountant): All permissions - full access to create, read, update, delete, and manage all features
- **ReadOnly** (Customer): View-only permissions - can only read/view data, cannot modify anything

## Implementation

- **Backend**: Permission decorators/middleware on routes, resource-level checks
- **Frontend**: Route guards, component-level permission checks, conditional UI rendering

