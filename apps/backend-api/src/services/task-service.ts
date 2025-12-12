import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  TaskPriority,
} from "@repo/core-domain";
import type { PaginatedResult } from "./client-company-service";
import { notificationService } from "./notification-service";

export interface ListTasksFilters {
  clientCompanyId?: string;
  assignedToUserId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  overdue?: boolean;
  page?: number;
  pageSize?: number;
}

export class TaskService {
  async listTasks(
    tenantId: string,
    filters: ListTasksFilters = {}
  ): Promise<PaginatedResult<Task>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
    };

    if (filters.clientCompanyId) {
      where.clientCompanyId = filters.clientCompanyId;
    }

    if (filters.assignedToUserId) {
      where.assignedToUserId = filters.assignedToUserId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.overdue) {
      const now = new Date();
      where.dueDate = {
        lt: now,
      };
      where.status = {
        not: "completed",
      };
    }

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          clientCompany: {
            select: {
              id: true,
              name: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: [
          { priority: "desc" },
          { dueDate: "asc" },
          { createdAt: "desc" },
        ],
      }),
      prisma.task.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        tenantId: item.tenantId,
        clientCompanyId: item.clientCompanyId,
        assignedToUserId: item.assignedToUserId,
        title: item.title,
        description: item.description,
        status: item.status as TaskStatus,
        priority: item.priority as TaskPriority,
        dueDate: item.dueDate,
        completedAt: item.completedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getTaskById(tenantId: string, id: string): Promise<Task> {
    const task = await prisma.task.findFirst({
      where: { id, tenantId },
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundError("Görev bulunamadı.");
    }

    return {
      id: task.id,
      tenantId: task.tenantId,
      clientCompanyId: task.clientCompanyId,
      assignedToUserId: task.assignedToUserId,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async createTask(tenantId: string, input: CreateTaskInput): Promise<Task> {
    // Verify client company belongs to tenant if provided
    if (input.clientCompanyId) {
      const client = await prisma.clientCompany.findFirst({
        where: { id: input.clientCompanyId, tenantId },
      });

      if (!client) {
        throw new NotFoundError("Müşteri şirketi bulunamadı.");
      }
    }

    // Verify assigned user belongs to tenant if provided
    if (input.assignedToUserId) {
      const membership = await prisma.userTenantMembership.findFirst({
        where: {
          userId: input.assignedToUserId,
          tenantId,
          status: "active",
        },
      });

      if (!membership) {
        throw new NotFoundError("Kullanıcı bu kiracıya ait değil.");
      }
    }

    const task = await prisma.task.create({
      data: {
        tenantId,
        clientCompanyId: input.clientCompanyId ?? null,
        assignedToUserId: input.assignedToUserId ?? null,
        title: input.title,
        description: input.description ?? null,
        status: input.status || "pending",
        priority: input.priority || "medium",
        dueDate: input.dueDate ?? null,
      },
    });

    // Create notification if task is assigned
    if (task.assignedToUserId) {
      try {
        await notificationService.createNotification({
          tenantId,
          userId: task.assignedToUserId,
          type: "SYSTEM",
          title: "Yeni Görev Atandı",
          message: `Size yeni bir görev atandı: ${task.title}`,
          meta: {
            taskId: task.id,
            taskTitle: task.title,
          },
        });
      } catch (error) {
        // Don't fail task creation if notification fails
        console.error("[TaskService] Error creating notification:", error);
      }
    }

    return {
      id: task.id,
      tenantId: task.tenantId,
      clientCompanyId: task.clientCompanyId,
      assignedToUserId: task.assignedToUserId,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async updateTask(
    tenantId: string,
    id: string,
    input: UpdateTaskInput
  ): Promise<Task> {
    const existing = await prisma.task.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError("Görev bulunamadı.");
    }

    // Verify client company if provided
    if (input.clientCompanyId) {
      const client = await prisma.clientCompany.findFirst({
        where: { id: input.clientCompanyId, tenantId },
      });

      if (!client) {
        throw new NotFoundError("Müşteri şirketi bulunamadı.");
      }
    }

    // Verify assigned user if provided
    if (input.assignedToUserId) {
      const membership = await prisma.userTenantMembership.findFirst({
        where: {
          userId: input.assignedToUserId,
          tenantId,
          status: "active",
        },
      });

      if (!membership) {
        throw new NotFoundError("Kullanıcı bu kiracıya ait değil.");
      }
    }

    // Set completedAt if status is being changed to completed
    const updateData: any = { ...input };
    if (input.status === "completed" && !existing.completedAt) {
      updateData.completedAt = new Date();
    } else if (input.status !== "completed" && existing.completedAt) {
      updateData.completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    // Create notification if task assignment changed
    if (input.assignedToUserId && input.assignedToUserId !== existing.assignedToUserId) {
      try {
        await notificationService.createNotification({
          tenantId,
          userId: input.assignedToUserId,
          type: "SYSTEM",
          title: "Görev Size Atandı",
          message: `"${task.title}" görevi size atandı.`,
          meta: {
            taskId: task.id,
            taskTitle: task.title,
          },
        });
      } catch (error) {
        console.error("[TaskService] Error creating notification:", error);
      }
    }

    // Create notification if task is due soon or overdue
    if (task.dueDate && task.status !== "completed") {
      const daysUntilDue = Math.floor(
        (task.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDue <= 1 && daysUntilDue >= 0) {
        // Due soon (within 1 day)
        try {
          await notificationService.createNotification({
            tenantId,
            userId: task.assignedToUserId,
            type: "SYSTEM",
            title: "Görev Vadesi Yaklaşıyor",
            message: `"${task.title}" görevinin vadesi yaklaşıyor (${daysUntilDue === 0 ? "bugün" : "yarın"}).`,
            meta: {
              taskId: task.id,
              taskTitle: task.title,
              dueDate: task.dueDate,
            },
          });
        } catch (error) {
          console.error("[TaskService] Error creating notification:", error);
        }
      } else if (daysUntilDue < 0) {
        // Overdue
        try {
          await notificationService.createNotification({
            tenantId,
            userId: task.assignedToUserId,
            type: "SYSTEM",
            title: "Görev Vadesi Geçti",
            message: `"${task.title}" görevinin vadesi geçti (${Math.abs(daysUntilDue)} gün önce).`,
            meta: {
              taskId: task.id,
              taskTitle: task.title,
              dueDate: task.dueDate,
            },
          });
        } catch (error) {
          console.error("[TaskService] Error creating notification:", error);
        }
      }
    }

    return {
      id: task.id,
      tenantId: task.tenantId,
      clientCompanyId: task.clientCompanyId,
      assignedToUserId: task.assignedToUserId,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async deleteTask(tenantId: string, id: string): Promise<void> {
    const task = await prisma.task.findFirst({
      where: { id, tenantId },
    });

    if (!task) {
      throw new NotFoundError("Görev bulunamadı.");
    }

    // Only allow deletion if not completed
    if (task.status === "completed") {
      throw new ValidationError("Tamamlanmış görevler silinemez.");
    }

    await prisma.task.delete({
      where: { id },
    });
  }

  /**
   * Get task statistics for a tenant
   */
  async getTaskStatistics(tenantId: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    byPriority: {
      low: number;
      medium: number;
      high: number;
    };
  }> {
    const now = new Date();

    const [total, pending, inProgress, completed, overdue, low, medium, high] = await Promise.all([
      prisma.task.count({ where: { tenantId } }),
      prisma.task.count({ where: { tenantId, status: "pending" } }),
      prisma.task.count({ where: { tenantId, status: "in_progress" } }),
      prisma.task.count({ where: { tenantId, status: "completed" } }),
      prisma.task.count({
        where: {
          tenantId,
          dueDate: { lt: now },
          status: { not: "completed" },
        },
      }),
      prisma.task.count({ where: { tenantId, priority: "low" } }),
      prisma.task.count({ where: { tenantId, priority: "medium" } }),
      prisma.task.count({ where: { tenantId, priority: "high" } }),
    ]);

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
      byPriority: {
        low,
        medium,
        high,
      },
    };
  }
}

export const taskService = new TaskService();


