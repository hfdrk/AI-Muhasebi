import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import type { IntegrationSyncJob, IntegrationSyncLog } from "@repo/core-domain";
import type { PaginatedResult } from "./client-company-service";

export interface ListSyncJobsFilters {
  status?: string;
  jobType?: string;
  page?: number;
  pageSize?: number;
}

export interface ListSyncLogsFilters {
  level?: string;
  page?: number;
  pageSize?: number;
}

export class IntegrationSyncService {
  async listSyncJobs(
    tenantId: string,
    tenantIntegrationId: string,
    filters: ListSyncJobsFilters = {}
  ): Promise<PaginatedResult<IntegrationSyncJob>> {
    // Verify integration belongs to tenant
    const integration = await prisma.tenantIntegration.findFirst({
      where: { id: tenantIntegrationId, tenantId },
    });

    if (!integration) {
      throw new NotFoundError("Entegrasyon bulunamadı.");
    }

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
      tenantIntegrationId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.jobType) {
      where.jobType = filters.jobType;
    }

    const [data, total] = await Promise.all([
      prisma.integrationSyncJob.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.integrationSyncJob.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        tenantId: item.tenantId,
        clientCompanyId: item.clientCompanyId,
        tenantIntegrationId: item.tenantIntegrationId,
        jobType: item.jobType as any,
        status: item.status as any,
        startedAt: item.startedAt,
        finishedAt: item.finishedAt,
        errorMessage: item.errorMessage,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getSyncJobById(tenantId: string, id: string): Promise<IntegrationSyncJob> {
    const job = await prisma.integrationSyncJob.findFirst({
      where: { id, tenantId },
    });

    if (!job) {
      throw new NotFoundError("Senkronizasyon işi bulunamadı.");
    }

    return {
      id: job.id,
      tenantId: job.tenantId,
      clientCompanyId: job.clientCompanyId,
      tenantIntegrationId: job.tenantIntegrationId,
      jobType: job.jobType as any,
      status: job.status as any,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  async listSyncLogs(
    tenantId: string,
    tenantIntegrationId: string,
    filters: ListSyncLogsFilters = {}
  ): Promise<PaginatedResult<IntegrationSyncLog>> {
    // Verify integration belongs to tenant
    const integration = await prisma.tenantIntegration.findFirst({
      where: { id: tenantIntegrationId, tenantId },
    });

    if (!integration) {
      throw new NotFoundError("Entegrasyon bulunamadı.");
    }

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
      tenantIntegrationId,
    };

    if (filters.level) {
      where.level = filters.level;
    }

    const [data, total] = await Promise.all([
      prisma.integrationSyncLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.integrationSyncLog.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        tenantId: item.tenantId,
        tenantIntegrationId: item.tenantIntegrationId,
        level: item.level as any,
        message: item.message,
        context: item.context as Record<string, unknown> | null,
        createdAt: item.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}

export const integrationSyncService = new IntegrationSyncService();








