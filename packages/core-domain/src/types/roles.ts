import type { TenantRole } from "../entities/user-tenant-membership";

export const TENANT_ROLES = {
  TENANT_OWNER: "TenantOwner",
  ACCOUNTANT: "Accountant",
  STAFF: "Staff",
  READ_ONLY: "ReadOnly",
} as const;

export type TenantRoleType = TenantRole;

export const ROLE_LABELS_TR: Record<TenantRole, string> = {
  TenantOwner: "Ofis Sahibi",
  Accountant: "Muhasebeci",
  Staff: "Personel",
  ReadOnly: "Sadece Görüntüleme",
};

