import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError, logger } from "@repo/shared-utils";

export interface CreateScheduledReportInput {
  tenantId: string;
  createdByUserId: string;
  reportCode: string;
  clientCompanyId?: string | null;
  name: string;
  format: "pdf" | "excel";
  scheduleCron: "daily" | "weekly" | "monthly";
  filters: unknown;
  recipients: string[];
  isActive: boolean;
}

export interface UpdateScheduledReportInput {
  name?: string;
  clientCompanyId?: string | null;
  format?: "pdf" | "excel";
  scheduleCron?: "daily" | "weekly" | "monthly";
  filters?: unknown;
  recipients?: string[];
  isActive?: boolean;
}

export class ScheduledReportService {
  /**
   * Validate that a report code exists and is active
   */
  private async validateReportCode(reportCode: string): Promise<void> {
    const reportDefinition = await prisma.reportDefinition.findUnique({
      where: { code: reportCode },
    });

    if (!reportDefinition) {
      throw new ValidationError(`Geçersiz rapor kodu: ${reportCode}`);
    }

    if (!reportDefinition.isActive) {
      throw new ValidationError(`Rapor tanımı aktif değil: ${reportCode}`);
    }
  }

  /**
   * Validate that a client company belongs to the given tenant
   */
  private async validateClientCompany(tenantId: string, clientCompanyId: string): Promise<void> {
    const company = await prisma.clientCompany.findFirst({
      where: {
        id: clientCompanyId,
        tenantId,
      },
    });

    if (!company) {
      throw new NotFoundError("Müşteri şirketi bulunamadı veya bu kiracıya ait değil.");
    }
  }

  /**
   * Create a new scheduled report
   */
  async createScheduledReport(input: CreateScheduledReportInput) {
    // Validate report code
    await this.validateReportCode(input.reportCode);

    // Validate client company if provided
    if (input.clientCompanyId) {
      await this.validateClientCompany(input.tenantId, input.clientCompanyId);
    }

    // Validate schedule cron
    if (!["daily", "weekly", "monthly"].includes(input.scheduleCron)) {
      throw new ValidationError("Geçersiz zamanlama: daily, weekly veya monthly olmalıdır.");
    }

    // Validate format
    if (!["pdf", "excel"].includes(input.format)) {
      throw new ValidationError("Geçersiz format: pdf veya excel olmalıdır.");
    }

    // Validate recipients
    if (!Array.isArray(input.recipients) || input.recipients.length === 0) {
      throw new ValidationError("En az bir alıcı e-posta adresi gerekli.");
    }

    for (const email of input.recipients) {
      if (typeof email !== "string" || !email.includes("@")) {
        throw new ValidationError(`Geçersiz e-posta adresi: ${email}`);
      }
    }

    // Check usage limit before creation
    const { usageService } = await import("./usage-service");
    const limitCheck = await usageService.checkLimit(input.tenantId, "SCHEDULED_REPORTS" as any);
    if (!limitCheck.allowed) {
      throw new ValidationError(
        "Maksimum zamanlanmış rapor limitine ulaşıldı. Daha fazla rapor eklemek için planınızı yükseltmeniz gerekiyor."
      );
    }

    // Ensure recipients is properly formatted as JSON array
    const recipientsData = Array.isArray(input.recipients) ? input.recipients : [];
    
    // Ensure filters is properly formatted as JSON object
    let filtersData: any = {};
    if (input.filters) {
      if (typeof input.filters === 'object' && !Array.isArray(input.filters)) {
        filtersData = input.filters;
      } else {
        filtersData = {};
      }
    }
    
    try {
      const report = await prisma.scheduledReport.create({
        data: {
          tenantId: input.tenantId,
          reportCode: input.reportCode,
          clientCompanyId: input.clientCompanyId || null,
          name: input.name,
          format: input.format,
          scheduleCron: input.scheduleCron,
          filters: filtersData,
          recipients: recipientsData,
          isActive: input.isActive,
        },
        include: {
          clientCompany: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Increment usage after successful creation
      await usageService.incrementUsage(input.tenantId, "SCHEDULED_REPORTS" as any, 1);

      return report;
    } catch (error: any) {
      logger.error("[ScheduledReportService.createScheduledReport] Prisma error:", {
        error,
        input: {
          tenantId: input.tenantId,
          reportCode: input.reportCode,
          clientCompanyId: input.clientCompanyId,
          name: input.name,
          format: input.format,
          scheduleCron: input.scheduleCron,
          filters: filtersData,
          recipients: recipientsData,
          isActive: input.isActive,
        },
        prismaErrorCode: error.code,
        prismaErrorMeta: error.meta,
      });
      throw error;
    }
  }

  /**
   * Update a scheduled report
   */
  async updateScheduledReport(
    id: string,
    tenantId: string,
    patchData: UpdateScheduledReportInput
  ) {
    // Verify the scheduled report exists and belongs to tenant
    const existing = await prisma.scheduledReport.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Zamanlanmış rapor bulunamadı.");
    }

    // Validate client company if provided
    if (patchData.clientCompanyId !== undefined && patchData.clientCompanyId !== null) {
      await this.validateClientCompany(tenantId, patchData.clientCompanyId);
    }

    // Validate schedule cron if provided
    if (patchData.scheduleCron && !["daily", "weekly", "monthly"].includes(patchData.scheduleCron)) {
      throw new ValidationError("Geçersiz zamanlama: daily, weekly veya monthly olmalıdır.");
    }

    // Validate format if provided
    if (patchData.format && !["pdf", "excel"].includes(patchData.format)) {
      throw new ValidationError("Geçersiz format: pdf veya excel olmalıdır.");
    }

    // Validate recipients if provided
    if (patchData.recipients !== undefined) {
      if (!Array.isArray(patchData.recipients) || patchData.recipients.length === 0) {
        throw new ValidationError("En az bir alıcı e-posta adresi gerekli.");
      }

      for (const email of patchData.recipients) {
        if (typeof email !== "string" || !email.includes("@")) {
          throw new ValidationError(`Geçersiz e-posta adresi: ${email}`);
        }
      }
    }

    const updateData: any = {};

    if (patchData.name !== undefined) updateData.name = patchData.name;
    if (patchData.clientCompanyId !== undefined) updateData.clientCompanyId = patchData.clientCompanyId || null;
    if (patchData.format !== undefined) updateData.format = patchData.format;
    if (patchData.scheduleCron !== undefined) updateData.scheduleCron = patchData.scheduleCron;
    if (patchData.filters !== undefined) updateData.filters = patchData.filters;
    if (patchData.recipients !== undefined) updateData.recipients = patchData.recipients;
    if (patchData.isActive !== undefined) updateData.isActive = patchData.isActive;

    return await prisma.scheduledReport.update({
      where: { id },
      data: updateData,
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Deactivate a scheduled report (soft delete)
   */
  async deactivateScheduledReport(id: string, tenantId: string) {
    const existing = await prisma.scheduledReport.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Zamanlanmış rapor bulunamadı.");
    }

    return await prisma.scheduledReport.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * List all scheduled reports for a tenant
   */
  async listScheduledReports(tenantId: string) {
    return await prisma.scheduledReport.findMany({
      where: {
        tenantId,
      },
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Get a scheduled report by ID (tenant-scoped)
   */
  async getScheduledReportById(id: string, tenantId: string) {
    const report = await prisma.scheduledReport.findFirst({
      where: {
        id,
        tenantId,
        isActive: true, // Only return active reports
      },
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundError("Zamanlanmış rapor bulunamadı.");
    }

    return report;
  }

  /**
   * List execution logs for a specific scheduled report
   */
  async listExecutionLogsForScheduledReport(tenantId: string, scheduledReportId: string) {
    // Verify the scheduled report belongs to tenant
    const scheduledReport = await prisma.scheduledReport.findFirst({
      where: {
        id: scheduledReportId,
        tenantId,
      },
    });

    if (!scheduledReport) {
      throw new NotFoundError("Zamanlanmış rapor bulunamadı.");
    }

    return await prisma.reportExecutionLog.findMany({
      where: {
        tenantId,
        scheduledReportId,
      },
      orderBy: {
        startedAt: "desc",
      },
    });
  }

  /**
   * List recent execution logs for a tenant
   */
  async listRecentExecutionLogsForTenant(tenantId: string, limit: number = 20) {
    return await prisma.reportExecutionLog.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        startedAt: "desc",
      },
      take: limit,
    });
  }
}

export const scheduledReportService = new ScheduledReportService();

