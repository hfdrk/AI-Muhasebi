export type TenantRole = "TenantOwner" | "Accountant" | "Staff" | "ReadOnly";
export type MembershipStatus = "active" | "invited" | "suspended";
export interface UserTenantMembership {
    id: string;
    userId: string;
    tenantId: string;
    role: TenantRole;
    status: MembershipStatus;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateMembershipInput {
    userId: string;
    tenantId: string;
    role: TenantRole;
    status?: MembershipStatus;
}
export interface UpdateMembershipInput {
    role?: TenantRole;
    status?: MembershipStatus;
}
//# sourceMappingURL=user-tenant-membership.d.ts.map