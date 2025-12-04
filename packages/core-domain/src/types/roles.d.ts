import type { TenantRole } from "../entities/user-tenant-membership";
export declare const TENANT_ROLES: {
    readonly TENANT_OWNER: "TenantOwner";
    readonly ACCOUNTANT: "Accountant";
    readonly STAFF: "Staff";
    readonly READ_ONLY: "ReadOnly";
};
export type TenantRoleType = TenantRole;
export declare const ROLE_LABELS_TR: Record<TenantRole, string>;
//# sourceMappingURL=roles.d.ts.map