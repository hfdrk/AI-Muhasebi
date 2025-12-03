import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import type {
  ClientCompany,
  CreateClientCompanyInput,
  UpdateClientCompanyInput,
} from "@repo/core-domain";

export interface ListClientCompaniesFilters {
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ClientCompanyService {
  async listClientCompanies(
    tenantId: string,
    filters: ListClientCompaniesFilters = {}
  ): Promise<PaginatedResult<ClientCompany>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
    };

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { taxNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.clientCompany.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.clientCompany.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        tenantId: item.tenantId,
        name: item.name,
        legalType: item.legalType as any,
        taxNumber: item.taxNumber,
        tradeRegistryNumber: item.tradeRegistryNumber,
        sector: item.sector,
        contactPersonName: item.contactPersonName,
        contactPhone: item.contactPhone,
        contactEmail: item.contactEmail,
        address: item.address,
        startDate: item.startDate,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getClientCompanyById(tenantId: string, id: string): Promise<ClientCompany & { stats?: { invoiceCount: number; transactionCount: number } }> {
    const client = await prisma.clientCompany.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        _count: {
          select: {
            invoices: true,
            transactions: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    return {
      id: client.id,
      tenantId: client.tenantId,
      name: client.name,
      legalType: client.legalType as any,
      taxNumber: client.taxNumber,
      tradeRegistryNumber: client.tradeRegistryNumber,
      sector: client.sector,
      contactPersonName: client.contactPersonName,
      contactPhone: client.contactPhone,
      contactEmail: client.contactEmail,
      address: client.address,
      startDate: client.startDate,
      isActive: client.isActive,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      stats: {
        invoiceCount: client._count.invoices,
        transactionCount: client._count.transactions,
      },
    } as any;
  }

  async createClientCompany(
    tenantId: string,
    input: CreateClientCompanyInput
  ): Promise<ClientCompany> {
    // Check if tax number already exists for this tenant
    const existing = await prisma.clientCompany.findUnique({
      where: {
        tenantId_taxNumber: {
          tenantId,
          taxNumber: input.taxNumber,
        },
      },
    });

    if (existing) {
      throw new ValidationError("Bu vergi numarası zaten kullanılıyor.");
    }

    const client = await prisma.clientCompany.create({
      data: {
        tenantId,
        name: input.name,
        legalType: input.legalType,
        taxNumber: input.taxNumber,
        tradeRegistryNumber: input.tradeRegistryNumber ?? null,
        sector: input.sector ?? null,
        contactPersonName: input.contactPersonName ?? null,
        contactPhone: input.contactPhone ?? null,
        contactEmail: input.contactEmail ?? null,
        address: input.address ?? null,
        startDate: input.startDate ?? null,
        isActive: input.isActive ?? true,
      },
    });

    return {
      id: client.id,
      tenantId: client.tenantId,
      name: client.name,
      legalType: client.legalType as any,
      taxNumber: client.taxNumber,
      tradeRegistryNumber: client.tradeRegistryNumber,
      sector: client.sector,
      contactPersonName: client.contactPersonName,
      contactPhone: client.contactPhone,
      contactEmail: client.contactEmail,
      address: client.address,
      startDate: client.startDate,
      isActive: client.isActive,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  async updateClientCompany(
    tenantId: string,
    id: string,
    input: UpdateClientCompanyInput
  ): Promise<ClientCompany> {
    const existing = await prisma.clientCompany.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    const client = await prisma.clientCompany.update({
      where: { id },
      data: {
        name: input.name,
        legalType: input.legalType,
        tradeRegistryNumber: input.tradeRegistryNumber ?? undefined,
        sector: input.sector ?? undefined,
        contactPersonName: input.contactPersonName ?? undefined,
        contactPhone: input.contactPhone ?? undefined,
        contactEmail: input.contactEmail ?? undefined,
        address: input.address ?? undefined,
        startDate: input.startDate ?? undefined,
        isActive: input.isActive ?? undefined,
      },
    });

    return {
      id: client.id,
      tenantId: client.tenantId,
      name: client.name,
      legalType: client.legalType as any,
      taxNumber: client.taxNumber,
      tradeRegistryNumber: client.tradeRegistryNumber,
      sector: client.sector,
      contactPersonName: client.contactPersonName,
      contactPhone: client.contactPhone,
      contactEmail: client.contactEmail,
      address: client.address,
      startDate: client.startDate,
      isActive: client.isActive,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  async deleteClientCompany(tenantId: string, id: string): Promise<void> {
    const existing = await prisma.clientCompany.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    await prisma.clientCompany.delete({
      where: { id },
    });
  }
}

export const clientCompanyService = new ClientCompanyService();

