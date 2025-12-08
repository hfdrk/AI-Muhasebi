import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import type {
  Notification,
  CreateNotificationInput,
  NotificationType,
} from "@repo/core-domain";

export class NotificationService {
  private mapToNotification(notification: any): Notification {
    return {
      id: notification.id,
      tenantId: notification.tenantId,
      userId: notification.userId,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.message,
      meta: notification.meta as Record<string, unknown> | null,
      is_read: notification.is_read,
      read_at: notification.read_at,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  /**
   * Create a new notification
   */
  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        type: input.type,
        title: input.title,
        message: input.message,
        meta: (input.meta ?? {}) as any,
      },
    });

    return this.mapToNotification(notification);
  }

  /**
   * List notifications with filters
   */
  async listNotifications(
    tenantId: string,
    userId: string,
    filters: {
      is_read?: boolean;
      type?: NotificationType;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    data: Notification[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const where: any = {
      tenantId,
      OR: [
        { userId: userId },
        { userId: null }, // Tenant-wide notifications
      ],
    };

    if (filters.is_read !== undefined) {
      where.is_read = filters.is_read;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data: data.map((notification) => this.mapToNotification(notification)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(
    tenantId: string,
    userId: string,
    notificationId: string
  ): Promise<Notification> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError("Bildirim bulunamadı.");
    }

    // Check tenant isolation
    if (notification.tenantId !== tenantId) {
      throw new NotFoundError("Bildirim bulunamadı.");
    }

    // Check user ownership (user must be the owner or notification must be tenant-wide)
    if (notification.userId !== null && notification.userId !== userId) {
      throw new NotFoundError("Bildirim bulunamadı.");
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    return this.mapToNotification(updated);
  }

  /**
   * Mark all notifications as read for a user in a tenant
   */
  async markAllAsRead(tenantId: string, userId: string): Promise<{ updatedCount: number }> {
    const result = await prisma.notification.updateMany({
      where: {
        tenantId,
        OR: [
          { userId: userId },
          { userId: null }, // Tenant-wide notifications
        ],
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    return { updatedCount: result.count };
  }

  /**
   * Get unread count for a user in a tenant
   */
  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        tenantId,
        OR: [
          { userId: userId },
          { userId: null }, // Tenant-wide notifications
        ],
        is_read: false,
      },
    });
  }
}

export const notificationService = new NotificationService();


