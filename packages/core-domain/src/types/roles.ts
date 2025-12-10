import type { TenantRole } from "../entities/user-tenant-membership";

export const TENANT_ROLES = {
  TENANT_OWNER: "TenantOwner",
  ACCOUNTANT: "Accountant",
  STAFF: "Staff",
  READ_ONLY: "ReadOnly",
} as const;

export type TenantRoleType = TenantRole;

export const ROLE_LABELS_TR: Record<TenantRole, string> = {
  TenantOwner: "Muhasebeci", // Accountant role - full access
  Accountant: "Muhasebeci", // Deprecated - use TenantOwner instead
  Staff: "Personel", // Deprecated - not used
  ReadOnly: "Müşteri", // Customer role - view-only access
};

export const PLATFORM_ROLES = {
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  PLATFORM_SUPPORT: "PLATFORM_SUPPORT",
} as const;

export type PlatformRole = typeof PLATFORM_ROLES[keyof typeof PLATFORM_ROLES];

export const PLATFORM_ROLE_LABELS_TR: Record<PlatformRole, string> = {
  PLATFORM_ADMIN: "Platform Yöneticisi",
  PLATFORM_SUPPORT: "Platform Destek",
};

