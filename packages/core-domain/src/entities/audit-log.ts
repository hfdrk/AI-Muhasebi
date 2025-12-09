export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "USER_CREATED"
  | "TENANT_CREATED"
  | "USER_INVITED"
  | "ROLE_CHANGED"
  | "USER_ACTIVATED"
  | "USER_DEACTIVATED"
  | "USER_STATUS_CHANGED"
  | "TENANT_UPDATED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_DELETED"
  | "DOCUMENT_DOWNLOADED"
  | "DOCUMENT_RETRY"
  | "IMPERSONATION_START"
  | "IMPERSONATION_STOP"
  | "TENANT_SUSPEND"
  | "TENANT_ACTIVATE"
  | "ADMIN_TENANT_VIEWED"
  | "ADMIN_USER_VIEWED"
  | "AI_CHAT"
  | "AI_SUMMARY_DAILY_RISK"
  | "AI_SUMMARY_PORTFOLIO";

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

