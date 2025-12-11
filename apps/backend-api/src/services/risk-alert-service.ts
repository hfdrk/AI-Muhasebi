import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import type {
  RiskAlert,
  CreateRiskAlertInput,
  UpdateRiskAlertInput,
  RiskAlertStatus,
} from "@repo/core-domain";
import { notificationService } from "./notification-service";
import { emailService } from "./email-service";

export class RiskAlertService {
  private mapToRiskAlert(alert: any): RiskAlert {
    return {
      id: alert.id,
      tenantId: alert.tenantId,
      clientCompanyId: alert.clientCompanyId,
      documentId: alert.documentId,
      type: alert.type as any,
      title: alert.title,
      message: alert.message,
      severity: alert.severity as any,
      status: alert.status as RiskAlertStatus,
      resolvedAt: alert.resolvedAt,
      resolvedByUserId: alert.resolvedByUserId,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }

  /**
   * Create a new risk alert
   */
  async createAlert(input: CreateRiskAlertInput): Promise<RiskAlert> {
    // Check if similar alert already exists (to avoid duplicates)
    const existing = await prisma.riskAlert.findFirst({
      where: {
        tenantId: input.tenantId,
        clientCompanyId: input.clientCompanyId || null,
        documentId: input.documentId || null,
        type: input.type,
        status: {
          in: ["open", "in_progress"],
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (existing) {
      // Update existing alert instead of creating duplicate
      const updated = await prisma.riskAlert.update({
        where: { id: existing.id },
        data: {
          message: input.message,
          severity: input.severity,
          updatedAt: new Date(),
        },
      });
      return this.mapToRiskAlert(updated);
    }

    const alert = await prisma.riskAlert.create({
      data: {
        tenantId: input.tenantId,
        clientCompanyId: input.clientCompanyId ?? null,
        documentId: input.documentId ?? null,
        type: input.type,
        title: input.title,
        message: input.message,
        severity: input.severity,
        status: input.status || "open",
      },
    });

    // Create notification for risk alert
    try {
      // Get client company name if available
      let companyName = "Bir şirket";
      if (input.clientCompanyId) {
        const company = await prisma.clientCompany.findUnique({
          where: { id: input.clientCompanyId },
          select: { name: true },
        });
        if (company) {
          companyName = company.name;
        }
      }

      const notification = await notificationService.createNotification({
        tenantId: input.tenantId,
        userId: null, // Tenant-wide notification
        type: "RISK_ALERT",
        title: "Yeni risk uyarısı",
        message: `${companyName} için yüksek riskli bir belge tespit edildi.`,
        meta: {
          riskAlertId: alert.id,
          clientCompanyId: input.clientCompanyId,
          documentId: input.documentId,
        },
      });

      // Send email notification (stub) - for MVP, send to tenant owners
      try {
        const tenantMembers = await prisma.userTenantMembership.findMany({
          where: {
            tenantId: input.tenantId,
            status: "active",
            role: "TenantOwner",
          },
          include: {
            user: {
              select: { email: true },
            },
          },
        });

        const recipientEmails = tenantMembers
          .map((m) => m.user.email)
          .filter((email): email is string => email !== null);

        if (recipientEmails.length > 0) {
          await emailService.sendNotificationEmail(
            recipientEmails,
            "RISK_ALERT",
            notification.title,
            notification.message,
            undefined,
            input.tenantId
          );
        }
      } catch (emailError: any) {
        // Don't fail notification creation if email fails
        console.error("[RiskAlertService] Failed to send notification email:", emailError);
      }
    } catch (notificationError: any) {
      // Don't fail alert creation if notification fails
      console.error("[RiskAlertService] Failed to create notification:", notificationError);
    }

    return this.mapToRiskAlert(alert);
  }

  /**
   * List risk alerts with filters
   */
  async listAlerts(
    tenantId: string,
    filters: {
      clientCompanyId?: string;
      severity?: string;
      status?: RiskAlertStatus;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{
    data: RiskAlert[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
    };

    if (filters.clientCompanyId) {
      where.clientCompanyId = filters.clientCompanyId;
    }

    if (filters.severity) {
      where.severity = filters.severity;
    }

    if (filters.status) {
      where.status = filters.status;
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
      prisma.riskAlert.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          clientCompany: {
            select: {
              id: true,
              name: true,
            },
          },
          document: {
            select: {
              id: true,
              originalFileName: true,
            },
          },
        },
      }),
      prisma.riskAlert.count({ where }),
    ]);

    return {
      data: data.map((alert) => this.mapToRiskAlert(alert)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update alert status
   */
  async updateAlertStatus(
    tenantId: string,
    alertId: string,
    status: RiskAlertStatus,
    userId: string
  ): Promise<RiskAlert> {
    const alert = await prisma.riskAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert || alert.tenantId !== tenantId) {
      throw new NotFoundError("Uyarı bulunamadı.");
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === "closed" || status === "ignored") {
      updateData.resolvedAt = new Date();
      updateData.resolvedByUserId = userId;
    } else {
      // If reopening, clear resolved fields
      updateData.resolvedAt = null;
      updateData.resolvedByUserId = null;
    }

    const updated = await prisma.riskAlert.update({
      where: { id: alertId },
      data: updateData,
    });

    return this.mapToRiskAlert(updated);
  }
}

export const riskAlertService = new RiskAlertService();



