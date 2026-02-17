import type { TenantRole } from "../entities/user-tenant-membership";

export type Permission =
  | "documents:create"
  | "documents:read"
  | "documents:update"
  | "documents:delete"
  | "documents:analyze"
  | "invoices:create"
  | "invoices:read"
  | "invoices:update"
  | "invoices:delete"
  | "invoices:export"
  | "invoices:manage"
  | "clients:create"
  | "clients:read"
  | "clients:update"
  | "clients:delete"
  | "risk:view"
  | "risk:configure"
  | "risk:acknowledge"
  | "reports:view"
  | "reports:read"
  | "reports:create"
  | "reports:manage"
  | "reports:export"
  | "users:invite"
  | "users:read"
  | "users:update"
  | "users:delete"
  | "users:manage"
  | "settings:read"
  | "settings:update"
  | "settings:billing"
  | "integrations:read"
  | "integrations:manage"
  | "tasks:create"
  | "tasks:read"
  | "tasks:update"
  | "tasks:delete"
  | "masak:view"
  | "masak:create"
  | "masak:manage"
  | "kurgan:view"
  | "kurgan:manage"
  | "babs:view"
  | "babs:create"
  | "babs:manage"
  | "beyanname:view"
  | "beyanname:create"
  | "beyanname:manage"
  | "mali_musavir:view"
  | "mali_musavir:manage"
  | "check_notes:view"
  | "check_notes:manage"
  | "cash_flow:view"
  | "cash_flow:manage"
  | "exchange_rates:view"
  | "exchange_rates:manage"
  | "payment_reminders:view"
  | "payment_reminders:manage";

export const ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
  // Accountant role (TenantOwner) - Full access
  TenantOwner: [
    "documents:create",
    "documents:read",
    "documents:update",
    "documents:delete",
    "documents:analyze",
    "invoices:create",
    "invoices:read",
    "invoices:update",
    "invoices:delete",
    "invoices:export",
    "invoices:manage",
    "clients:create",
    "clients:read",
    "clients:update",
    "clients:delete",
    "risk:view",
    "risk:configure",
    "risk:acknowledge",
    "reports:view",
    "reports:read",
    "reports:create",
    "reports:manage",
    "reports:export",
    "users:invite",
    "users:read",
    "users:update",
    "users:delete",
    "users:manage",
    "settings:read",
    "settings:update",
    "settings:billing",
    "integrations:read",
    "integrations:manage",
    "tasks:create",
    "tasks:read",
    "tasks:update",
    "tasks:delete",
    "masak:view",
    "masak:create",
    "masak:manage",
    "kurgan:view",
    "kurgan:manage",
    "babs:view",
    "babs:create",
    "babs:manage",
    "beyanname:view",
    "beyanname:create",
    "beyanname:manage",
    "mali_musavir:view",
    "mali_musavir:manage",
    "check_notes:view",
    "check_notes:manage",
    "cash_flow:view",
    "cash_flow:manage",
    "exchange_rates:view",
    "exchange_rates:manage",
    "payment_reminders:view",
    "payment_reminders:manage",
  ],
  // Deprecated - use TenantOwner instead (mapped to same permissions)
  Accountant: [
    "documents:create",
    "documents:read",
    "documents:update",
    "documents:delete",
    "documents:analyze",
    "invoices:create",
    "invoices:read",
    "invoices:update",
    "invoices:delete",
    "invoices:export",
    "invoices:manage",
    "clients:create",
    "clients:read",
    "clients:update",
    "clients:delete",
    "risk:view",
    "risk:configure",
    "risk:acknowledge",
    "reports:view",
    "reports:read",
    "reports:create",
    "reports:manage",
    "reports:export",
    "users:invite",
    "users:read",
    "users:update",
    "settings:read",
    "settings:billing",
    "integrations:read",
    "integrations:manage",
    "tasks:create",
    "tasks:read",
    "tasks:update",
    "tasks:delete",
    "masak:view",
    "masak:create",
    "masak:manage",
    "kurgan:view",
    "kurgan:manage",
    "babs:view",
    "babs:create",
    "babs:manage",
    "beyanname:view",
    "beyanname:create",
    "beyanname:manage",
    "mali_musavir:view",
    "mali_musavir:manage",
    "check_notes:view",
    "check_notes:manage",
    "cash_flow:view",
    "cash_flow:manage",
    "exchange_rates:view",
    "exchange_rates:manage",
    "payment_reminders:view",
    "payment_reminders:manage",
  ],
  // Deprecated - not used
  Staff: [
    "documents:create",
    "documents:read",
    "invoices:create",
    "invoices:read",
    "clients:read",
    "users:read",
    "reports:view",
    "reports:read",
    "tasks:read",
  ],
  // Customer role (ReadOnly) - View-only access
  ReadOnly: [
    "documents:read",
    "invoices:read",
    "clients:read",
    "risk:view",
    "reports:view",
    "users:read",
    "integrations:read",
    "tasks:read",
    "check_notes:view",
    "cash_flow:view",
    "exchange_rates:view",
    "payment_reminders:view",
  ],
};

export function hasPermission(role: TenantRole, permission: Permission): boolean {
  if (!role || !ROLE_PERMISSIONS[role]) {
    return false;
  }
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAnyPermission(role: TenantRole, permissions: Permission[]): boolean {
  if (!role || !permissions || permissions.length === 0) {
    return false;
  }
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(role: TenantRole, permissions: Permission[]): boolean {
  if (!role || !permissions || permissions.length === 0) {
    return false;
  }
  return permissions.every((permission) => hasPermission(role, permission));
}

