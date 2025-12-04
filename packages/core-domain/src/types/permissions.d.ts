import type { TenantRole } from "../entities/user-tenant-membership";
export type Permission = "documents:create" | "documents:read" | "documents:update" | "documents:delete" | "documents:analyze" | "invoices:create" | "invoices:read" | "invoices:update" | "invoices:delete" | "invoices:export" | "clients:create" | "clients:read" | "clients:update" | "clients:delete" | "risk:view" | "risk:configure" | "risk:acknowledge" | "reports:view" | "reports:create" | "reports:export" | "users:invite" | "users:read" | "users:update" | "users:delete" | "settings:read" | "settings:update" | "settings:billing" | "integrations:read" | "integrations:manage";
export declare const ROLE_PERMISSIONS: Record<TenantRole, Permission[]>;
export declare function hasPermission(role: TenantRole, permission: Permission): boolean;
export declare function hasAnyPermission(role: TenantRole, permissions: Permission[]): boolean;
export declare function hasAllPermissions(role: TenantRole, permissions: Permission[]): boolean;
//# sourceMappingURL=permissions.d.ts.map