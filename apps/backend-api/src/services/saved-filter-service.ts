import { prisma } from "../lib/prisma";
import { NotFoundError, AuthorizationError } from "@repo/shared-utils";
import type { SavedFilter, SavedFilterTarget } from "@repo/core-domain";

export interface CreateSavedFilterInput {
  name: string;
  target: SavedFilterTarget;
  filters: Record<string, any>;
  isDefault?: boolean;
}

export interface UpdateSavedFilterInput {
  name?: string;
  filters?: Record<string, any>;
  isDefault?: boolean;
}

export class SavedFilterService {
  async listSavedFilters(
    tenantId: string,
    userId: string,
    target?: SavedFilterTarget
  ): Promise<SavedFilter[]> {
    const where: any = {
      tenantId,
      userId,
    };

    if (target) {
      where.target = target;
    }

    const filters = await prisma.savedFilter.findMany({
      where,
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    });

    return filters.map((f) => ({
      id: f.id,
      tenantId: f.tenantId,
      userId: f.userId,
      name: f.name,
      target: f.target as SavedFilterTarget,
      filters: f.filters as Record<string, any>,
      isDefault: f.isDefault,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));
  }

  async createSavedFilter(
    tenantId: string,
    userId: string,
    input: CreateSavedFilterInput
  ): Promise<SavedFilter> {
    // If setting as default, unset all other defaults for this (tenant, user, target)
    if (input.isDefault) {
      await prisma.savedFilter.updateMany({
        where: {
          tenantId,
          userId,
          target: input.target,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const filter = await prisma.savedFilter.create({
      data: {
        tenantId,
        userId,
        name: input.name,
        target: input.target,
        filters: input.filters,
        isDefault: input.isDefault || false,
      },
    });

    return {
      id: filter.id,
      tenantId: filter.tenantId,
      userId: filter.userId,
      name: filter.name,
      target: filter.target as SavedFilterTarget,
      filters: filter.filters as Record<string, any>,
      isDefault: filter.isDefault,
      createdAt: filter.createdAt,
      updatedAt: filter.updatedAt,
    };
  }

  async updateSavedFilter(
    tenantId: string,
    userId: string,
    id: string,
    input: UpdateSavedFilterInput
  ): Promise<SavedFilter> {
    // First, verify ownership
    const existing = await prisma.savedFilter.findFirst({
      where: {
        id,
        tenantId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Kayıtlı filtre bulunamadı.");
    }

    // If setting as default, unset all other defaults for this (tenant, user, target)
    if (input.isDefault === true) {
      await prisma.savedFilter.updateMany({
        where: {
          tenantId,
          userId,
          target: existing.target,
          isDefault: true,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const updated = await prisma.savedFilter.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.filters !== undefined && { filters: input.filters }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      userId: updated.userId,
      name: updated.name,
      target: updated.target as SavedFilterTarget,
      filters: updated.filters as Record<string, any>,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteSavedFilter(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<void> {
    // Verify ownership
    const existing = await prisma.savedFilter.findFirst({
      where: {
        id,
        tenantId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Kayıtlı filtre bulunamadı.");
    }

    await prisma.savedFilter.delete({
      where: { id },
    });
  }
}

export const savedFilterService = new SavedFilterService();

