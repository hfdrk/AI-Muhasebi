"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const prisma_1 = require("../lib/prisma");
const shared_utils_1 = require("@repo/shared-utils");
class NotificationService {
    mapToNotification(notification) {
        return {
            id: notification.id,
            tenantId: notification.tenantId,
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            meta: notification.meta,
            is_read: notification.is_read,
            read_at: notification.read_at,
            createdAt: notification.createdAt,
            updatedAt: notification.updatedAt,
        };
    }
    /**
     * Create a new notification
     */
    async createNotification(input) {
        const notification = await prisma_1.prisma.notification.create({
            data: {
                tenantId: input.tenantId,
                userId: input.userId ?? null,
                type: input.type,
                title: input.title,
                message: input.message,
                meta: input.meta ?? {},
            },
        });
        return this.mapToNotification(notification);
    }
    /**
     * List notifications with filters
     */
    async listNotifications(tenantId, userId, filters = {}) {
        const limit = filters.limit || 20;
        const offset = filters.offset || 0;
        const where = {
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
            prisma_1.prisma.notification.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma_1.prisma.notification.count({ where }),
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
    async markAsRead(tenantId, userId, notificationId) {
        const notification = await prisma_1.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            throw new shared_utils_1.NotFoundError("Bildirim bulunamadı.");
        }
        // Check tenant isolation
        if (notification.tenantId !== tenantId) {
            throw new shared_utils_1.NotFoundError("Bildirim bulunamadı.");
        }
        // Check user ownership (user must be the owner or notification must be tenant-wide)
        if (notification.userId !== null && notification.userId !== userId) {
            throw new shared_utils_1.NotFoundError("Bildirim bulunamadı.");
        }
        const updated = await prisma_1.prisma.notification.update({
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
    async markAllAsRead(tenantId, userId) {
        const result = await prisma_1.prisma.notification.updateMany({
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
    async getUnreadCount(tenantId, userId) {
        return prisma_1.prisma.notification.count({
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
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
//# sourceMappingURL=notification-service.js.map