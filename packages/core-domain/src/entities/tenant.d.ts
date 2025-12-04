export interface Tenant {
    id: string;
    name: string;
    slug: string;
    taxNumber: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    settings: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateTenantInput {
    name: string;
    slug: string;
    taxNumber?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    settings?: Record<string, unknown> | null;
}
export interface UpdateTenantInput {
    name?: string;
    taxNumber?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    settings?: Record<string, unknown> | null;
}
//# sourceMappingURL=tenant.d.ts.map