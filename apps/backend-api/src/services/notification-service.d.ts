import type { Notification, CreateNotificationInput, NotificationType } from "@repo/core-domain";
export declare class NotificationService {
    private mapToNotification;
    /**
     * Create a new notification
     */
    createNotification(input: CreateNotificationInput): Promise<Notification>;
    /**
     * List notifications with filters
     */
    listNotifications(tenantId: string, userId: string, filters?: {
        is_read?: boolean;
        type?: NotificationType;
        dateFrom?: Date;
        dateTo?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        data: Notification[];
        total: number;
        limit: number;
        offset: number;
    }>;
    /**
     * Mark a notification as read
     */
    markAsRead(tenantId: string, userId: string, notificationId: string): Promise<Notification>;
    /**
     * Mark all notifications as read for a user in a tenant
     */
    markAllAsRead(tenantId: string, userId: string): Promise<{
        updatedCount: number;
    }>;
    /**
     * Get unread count for a user in a tenant
     */
    getUnreadCount(tenantId: string, userId: string): Promise<number>;
}
export declare const notificationService: NotificationService;
//# sourceMappingURL=notification-service.d.ts.map