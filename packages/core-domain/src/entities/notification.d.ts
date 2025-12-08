export type NotificationType = "RISK_ALERT" | "SCHEDULED_REPORT" | "INTEGRATION_SYNC" | "SYSTEM";
export interface Notification {
    id: string;
    tenantId: string;
    userId: string | null;
    type: NotificationType;
    title: string;
    message: string;
    meta: Record<string, unknown> | null;
    is_read: boolean;
    read_at: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateNotificationInput {
    tenantId: string;
    userId?: string | null;
    type: NotificationType;
    title: string;
    message: string;
    meta?: Record<string, unknown> | null;
}
//# sourceMappingURL=notification.d.ts.map