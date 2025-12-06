import { describe, it, expect, beforeEach, vi } from "vitest";
import { ClientCompanyService } from "../client-company-service";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import { prisma } from "../../lib/prisma";

// Mock Prisma
vi.mock("../../lib/prisma", () => ({
  prisma: {
    clientCompany: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

describe("ClientCompanyService", () => {
  let service: ClientCompanyService;
  const mockTenantId = "tenant-123";

  beforeEach(() => {
    service = new ClientCompanyService();
    vi.clearAllMocks();
  });

  describe("listClientCompanies", () => {
    it("should return paginated list of client companies for a tenant", async () => {
      const mockClients = [
        {
          id: "client-1",
          tenantId: mockTenantId,
          name: "Test Company",
          legalType: "Limited",
          taxNumber: "1234567890",
          tradeRegistryNumber: null,
          sector: null,
          contactPersonName: null,
          contactPhone: null,
          contactEmail: null,
          address: null,
          startDate: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.clientCompany.findMany).mockResolvedValue(mockClients as any);
      vi.mocked(prisma.clientCompany.count).mockResolvedValue(1);

      const result = await service.listClientCompanies(mockTenantId);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(prisma.clientCompany.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
        })
      );
    });

    it("should filter by isActive when provided", async () => {
      vi.mocked(prisma.clientCompany.findMany).mockResolvedValue([]);
      vi.mocked(prisma.clientCompany.count).mockResolvedValue(0);

      await service.listClientCompanies(mockTenantId, { isActive: true });

      expect(prisma.clientCompany.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId, isActive: true },
        })
      );
    });

    it("should search by name or tax number when search filter is provided", async () => {
      vi.mocked(prisma.clientCompany.findMany).mockResolvedValue([]);
      vi.mocked(prisma.clientCompany.count).mockResolvedValue(0);

      await service.listClientCompanies(mockTenantId, { search: "test" });

      expect(prisma.clientCompany.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            OR: [
              { name: { contains: "test", mode: "insensitive" } },
              { taxNumber: { contains: "test", mode: "insensitive" } },
            ],
          },
        })
      );
    });
  });

  describe("getClientCompanyById", () => {
    it("should return client company with stats when found", async () => {
      const mockClient = {
        id: "client-1",
        tenantId: mockTenantId,
        name: "Test Company",
        legalType: "Limited",
        taxNumber: "1234567890",
        tradeRegistryNumber: null,
        sector: null,
        contactPersonName: null,
        contactPhone: null,
        contactEmail: null,
        address: null,
        startDate: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          invoices: 5,
          transactions: 10,
        },
      };

      vi.mocked(prisma.clientCompany.findFirst).mockResolvedValue(mockClient as any);

      const result = await service.getClientCompanyById(mockTenantId, "client-1");

      expect(result.id).toBe("client-1");
      expect(result.stats?.invoiceCount).toBe(5);
      expect(result.stats?.transactionCount).toBe(10);
    });

    it("should throw NotFoundError when client company not found", async () => {
      vi.mocked(prisma.clientCompany.findFirst).mockResolvedValue(null);

      await expect(service.getClientCompanyById(mockTenantId, "non-existent")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("createClientCompany", () => {
    it("should create a new client company", async () => {
      const input = {
        name: "New Company",
        legalType: "Limited" as const,
        taxNumber: "9876543210",
      };

      vi.mocked(prisma.clientCompany.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.clientCompany.create).mockResolvedValue({
        id: "client-new",
        tenantId: mockTenantId,
        ...input,
        tradeRegistryNumber: null,
        sector: null,
        contactPersonName: null,
        contactPhone: null,
        contactEmail: null,
        address: null,
        startDate: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.createClientCompany(mockTenantId, input);

      expect(result.name).toBe("New Company");
      expect(result.taxNumber).toBe("9876543210");
      expect(prisma.clientCompany.create).toHaveBeenCalled();
    });

    it("should throw ValidationError when tax number already exists", async () => {
      const input = {
        name: "New Company",
        legalType: "Limited" as const,
        taxNumber: "1234567890",
      };

      vi.mocked(prisma.clientCompany.findUnique).mockResolvedValue({
        id: "existing-client",
        taxNumber: "1234567890",
      } as any);

      await expect(service.createClientCompany(mockTenantId, input)).rejects.toThrow(ValidationError);
    });
  });

  describe("updateClientCompany", () => {
    it("should update an existing client company", async () => {
      const existing = {
        id: "client-1",
        tenantId: mockTenantId,
        name: "Old Name",
      };

      const update = {
        name: "New Name",
        legalType: "Anonim" as const,
      };

      vi.mocked(prisma.clientCompany.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.clientCompany.update).mockResolvedValue({
        ...existing,
        ...update,
        legalType: "Anonim",
        taxNumber: "1234567890",
        tradeRegistryNumber: null,
        sector: null,
        contactPersonName: null,
        contactPhone: null,
        contactEmail: null,
        address: null,
        startDate: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.updateClientCompany(mockTenantId, "client-1", update);

      expect(result.name).toBe("New Name");
      expect(prisma.clientCompany.update).toHaveBeenCalled();
    });

    it("should throw NotFoundError when client company not found", async () => {
      vi.mocked(prisma.clientCompany.findFirst).mockResolvedValue(null);

      await expect(
        service.updateClientCompany(mockTenantId, "non-existent", { name: "New Name" })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteClientCompany", () => {
    it("should delete an existing client company", async () => {
      const existing = {
        id: "client-1",
        tenantId: mockTenantId,
      };

      vi.mocked(prisma.clientCompany.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.clientCompany.delete).mockResolvedValue(existing as any);

      await service.deleteClientCompany(mockTenantId, "client-1");

      expect(prisma.clientCompany.delete).toHaveBeenCalledWith({ where: { id: "client-1" } });
    });

    it("should throw NotFoundError when client company not found", async () => {
      vi.mocked(prisma.clientCompany.findFirst).mockResolvedValue(null);

      await expect(service.deleteClientCompany(mockTenantId, "non-existent")).rejects.toThrow(
        NotFoundError
      );
    });
  });
});

