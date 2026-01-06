import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError, logger } from "@repo/shared-utils";
import type {
  TenantIntegration,
  CreateTenantIntegrationInput,
  UpdateTenantIntegrationInput,
  IntegrationSyncJobType,
} from "@repo/core-domain";
import { connectorRegistry } from "../integrations/connectors/connector-registry";
import type { PaginatedResult } from "./client-company-service";

export interface ListTenantIntegrationsFilters {
  type?: "accounting" | "bank";
  clientCompanyId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

// Mask sensitive config fields
function maskConfig(config: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...config };
  const sensitiveFields = ["apiKey", "api_key", "password", "secret", "token"];

  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = "***";
    }
  }

  return masked;
}

export class TenantIntegrationService {
  async listIntegrations(
    tenantId: string,
    filters: ListTenantIntegrationsFilters = {}
  ): Promise<PaginatedResult<TenantIntegration>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
    };

    if (filters.clientCompanyId) {
      where.clientCompanyId = filters.clientCompanyId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.provider = {
        type: filters.type,
      };
    }

    const [data, total] = await Promise.all([
      prisma.tenantIntegration.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          provider: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.tenantIntegration.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        tenantId: item.tenantId,
        clientCompanyId: item.clientCompanyId,
        providerId: item.providerId,
        provider: item.provider ? {
          id: item.provider.id,
          type: item.provider.type,
          code: item.provider.code,
          name: item.provider.name,
          description: item.provider.description,
          isActive: item.provider.isActive,
        } : null,
        status: item.status as any,
        displayName: item.displayName,
        config: maskConfig(item.config as Record<string, unknown>),
        lastSyncAt: item.lastSyncAt,
        lastSyncStatus: item.lastSyncStatus as any,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getIntegrationById(tenantId: string, id: string): Promise<TenantIntegration & { provider: any }> {
    const integration = await prisma.tenantIntegration.findFirst({
      where: { id, tenantId },
      include: {
        provider: true,
      },
    });

    if (!integration) {
      throw new NotFoundError("Entegrasyon bulunamadı.");
    }

    return {
      id: integration.id,
      tenantId: integration.tenantId,
      clientCompanyId: integration.clientCompanyId,
      providerId: integration.providerId,
      status: integration.status as any,
      displayName: integration.displayName,
      config: maskConfig(integration.config as Record<string, unknown>),
      lastSyncAt: integration.lastSyncAt,
      lastSyncStatus: integration.lastSyncStatus as any,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      provider: {
        id: integration.provider.id,
        type: integration.provider.type,
        code: integration.provider.code,
        name: integration.provider.name,
        description: integration.provider.description,
        isActive: integration.provider.isActive,
        configSchema: integration.provider.configSchema,
      },
    } as any;
  }

  async createIntegration(
    tenantId: string,
    input: CreateTenantIntegrationInput
  ): Promise<TenantIntegration> {
    // Verify provider exists and is active
    const provider = await prisma.integrationProvider.findUnique({
      where: { id: input.providerId },
    });

    if (!provider || !provider.isActive) {
      throw new NotFoundError("Entegrasyon sağlayıcısı bulunamadı veya aktif değil.");
    }

    // Verify client company if provided
    if (input.clientCompanyId) {
      const clientCompany = await prisma.clientCompany.findFirst({
        where: { id: input.clientCompanyId, tenantId },
      });

      if (!clientCompany) {
        throw new NotFoundError("Müşteri şirketi bulunamadı.");
      }
    }

    // Test connection using connector
    try {
      logger.info(`[Integration Service] Testing connection for provider: ${provider.code}, type: ${provider.type}`);
      const connector = connectorRegistry.getConnector(provider.code, provider.type as "accounting" | "bank");
      if (!connector) {
        logger.error(`[Integration Service] Connector not found for code: ${provider.code}, type: ${provider.type}`);
        throw new ValidationError(`Bu sağlayıcı için bağlayıcı bulunamadı. (Kod: ${provider.code}, Tür: ${provider.type})`);
      }

      logger.info(`[Integration Service] Connector found, testing connection...`);
      const testResult = await connector.testConnection(input.config);
      logger.info(`[Integration Service] Test result:`, testResult);
      if (!testResult.success) {
        throw new ValidationError(testResult.message || "Bağlantı testi başarısız.");
      }
    } catch (error: any) {
      logger.error(`[Integration Service] Error during connection test:`, { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Bağlantı testi sırasında hata: ${error.message || "Bilinmeyen hata"}`);
    }

    // Create integration with status "connected"
    try {
      logger.info(`[Integration Service] Creating integration in database...`);
      const integration = await prisma.tenantIntegration.create({
        data: {
          tenantId,
          clientCompanyId: input.clientCompanyId ?? null,
          providerId: input.providerId,
          status: "connected",
          displayName: input.displayName || provider.name,
          config: input.config as any,
        },
      });

      logger.info(`[Integration Service] Integration created with ID: ${integration.id}`);
      return {
        id: integration.id,
        tenantId: integration.tenantId,
        clientCompanyId: integration.clientCompanyId,
        providerId: integration.providerId,
        status: integration.status as any,
        displayName: integration.displayName,
        config: maskConfig(integration.config as Record<string, unknown>),
        lastSyncAt: integration.lastSyncAt,
        lastSyncStatus: integration.lastSyncStatus as any,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      };
    } catch (error: any) {
      logger.error(`[Integration Service] Error creating integration in database:`, { error });
      throw error;
    }
  }

  async updateIntegration(
    tenantId: string,
    id: string,
    input: UpdateTenantIntegrationInput
  ): Promise<TenantIntegration> {
    const existing = await prisma.tenantIntegration.findFirst({
      where: { id, tenantId },
      include: { provider: true },
    });

    if (!existing) {
      throw new NotFoundError("Entegrasyon bulunamadı.");
    }

    // If config is being updated, test connection
    if (input.config) {
      const connector = connectorRegistry.getConnector(
        existing.provider.code,
        existing.provider.type as "accounting" | "bank"
      );
      if (!connector) {
        throw new ValidationError("Bu sağlayıcı için bağlayıcı bulunamadı.");
      }

      const testResult = await connector.testConnection(input.config);
      if (!testResult.success) {
        throw new ValidationError(testResult.message || "Bağlantı testi başarısız.");
      }
    }

    const updated = await prisma.tenantIntegration.update({
      where: { id },
      data: {
        displayName: input.displayName,
        config: input.config ? (input.config as any) : undefined,
        status: input.config ? "connected" : undefined,
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      clientCompanyId: updated.clientCompanyId,
      providerId: updated.providerId,
      status: updated.status as any,
      displayName: updated.displayName,
      config: maskConfig(updated.config as Record<string, unknown>),
      lastSyncAt: updated.lastSyncAt,
      lastSyncStatus: updated.lastSyncStatus as any,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteIntegration(tenantId: string, id: string): Promise<void> {
    const integration = await prisma.tenantIntegration.findFirst({
      where: { id, tenantId },
    });

    if (!integration) {
      throw new NotFoundError("Entegrasyon bulunamadı.");
    }

    // Set status to disconnected instead of deleting
    await prisma.tenantIntegration.update({
      where: { id },
      data: { status: "disconnected" },
    });
  }

  async testConnection(tenantId: string, id: string): Promise<{ success: boolean; message?: string }> {
    const integration = await prisma.tenantIntegration.findFirst({
      where: { id, tenantId },
      include: { provider: true },
    });

    if (!integration) {
      throw new NotFoundError("Entegrasyon bulunamadı.");
    }

    const connector = connectorRegistry.getConnector(
      integration.provider.code,
      integration.provider.type as "accounting" | "bank"
    );

    if (!connector) {
      return { success: false, message: "Bağlayıcı bulunamadı." };
    }

    return await connector.testConnection(integration.config as Record<string, unknown>);
  }

  async triggerSync(
    tenantId: string,
    id: string,
    jobType: IntegrationSyncJobType
  ): Promise<{ id: string; message: string }> {
    const integration = await prisma.tenantIntegration.findFirst({
      where: { id, tenantId },
    });

    if (!integration) {
      throw new NotFoundError("Entegrasyon bulunamadı.");
    }

    if (integration.status !== "connected") {
      throw new ValidationError("Sadece bağlı entegrasyonlar senkronize edilebilir.");
    }

    // Create sync job
    const job = await prisma.integrationSyncJob.create({
      data: {
        tenantId,
        clientCompanyId: integration.clientCompanyId,
        tenantIntegrationId: integration.id,
        jobType,
        status: "pending",
      },
    });

    return {
      id: job.id,
      message: "Senkronizasyon işi oluşturuldu.",
    };
  }
}

export const tenantIntegrationService = new TenantIntegrationService();

