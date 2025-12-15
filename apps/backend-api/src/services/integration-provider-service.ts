import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import type { IntegrationProvider } from "@repo/core-domain";

export class IntegrationProviderService {
  async listProviders(type?: "accounting" | "bank"): Promise<IntegrationProvider[]> {
    const where: any = {
      isActive: true,
    };

    if (type) {
      where.type = type;
    }

    const providers = await prisma.integrationProvider.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return providers.map((provider) => ({
      id: provider.id,
      type: provider.type as any,
      code: provider.code,
      name: provider.name,
      description: provider.description,
      isActive: provider.isActive,
      configSchema: provider.configSchema as Record<string, unknown> | null,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    }));
  }

  async getProviderById(id: string): Promise<IntegrationProvider> {
    const provider = await prisma.integrationProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundError("Entegrasyon sağlayıcısı bulunamadı.");
    }

    return {
      id: provider.id,
      type: provider.type as any,
      code: provider.code,
      name: provider.name,
      description: provider.description,
      isActive: provider.isActive,
      configSchema: provider.configSchema as Record<string, unknown> | null,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }
}

export const integrationProviderService = new IntegrationProviderService();








