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
  | "clients:create"
  | "clients:read"
  | "clients:update"
  | "clients:delete"
  | "risk:view"
  | "risk:configure"
  | "risk:acknowledge"
  | "reports:view"
  | "reports:create"
  | "reports:export"
  | "users:invite"
  | "users:read"
  | "users:update"
  | "users:delete"
  | "settings:read"
  | "settings:update"
  | "settings:billing"
  | "integrations:manage";

export const ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
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
    "clients:create",
    "clients:read",
    "clients:update",
    "clients:delete",
    "risk:view",
    "risk:configure",
    "risk:acknowledge",
    "reports:view",
    "reports:create",
    "reports:export",
    "users:invite",
    "users:read",
    "users:update",
    "users:delete",
    "settings:read",
    "settings:update",
    "settings:billing",
    "integrations:manage",
  ],
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
    "clients:create",
    "clients:read",
    "clients:update",
    "clients:delete",
    "risk:view",
    "risk:configure",
    "risk:acknowledge",
    "reports:view",
    "reports:create",
    "reports:export",
  ],
  Staff: [
    "documents:create",
    "documents:read",
    "invoices:create",
    "invoices:read",
    "clients:read",
    "reports:view",
  ],
  ReadOnly: [
    "documents:read",
    "invoices:read",
    "clients:read",
    "risk:view",
    "reports:view",
  ],
};

export function hasPermission(role: TenantRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAnyPermission(role: TenantRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(role: TenantRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

