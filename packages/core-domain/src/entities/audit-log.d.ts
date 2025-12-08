export type AuditAction = "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOGOUT" | "PASSWORD_RESET_REQUESTED" | "PASSWORD_RESET_COMPLETED" | "USER_CREATED" | "TENANT_CREATED" | "USER_INVITED" | "ROLE_CHANGED" | "USER_ACTIVATED" | "USER_DEACTIVATED" | "TENANT_UPDATED" | "DOCUMENT_UPLOADED" | "DOCUMENT_DELETED" | "DOCUMENT_DOWNLOADED";
export interface AuditLog {
    id: string;
    tenantId: string | null;
    userId: string | null;
    action: AuditAction;
    resourceType: string | null;
    resourceId: string | null;
    ipAddress: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
}
export interface CreateAuditLogInput {
    tenantId?: string | null;
    userId?: string | null;
    action: AuditAction;
    resourceType?: string | null;
    resourceId?: string | null;
    ipAddress?: string | null;
    metadata?: Record<string, unknown> | null;
}
//# sourceMappingURL=audit-log.d.ts.map