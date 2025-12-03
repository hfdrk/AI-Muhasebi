import { describe, it, expect, beforeEach, vi } from "vitest";
import { InvoiceService } from "../invoice-service";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import { prisma } from "../../lib/prisma";

// Mock Prisma
vi.mock("../../lib/prisma", () => ({
  prisma: {
    invoice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    invoiceLine: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    clientCompany: {
      findFirst: vi.fn(),
    },
  },
}));

describe("InvoiceService", () => {
  let service: InvoiceService;
  const mockTenantId = "tenant-123";

  beforeEach(() => {
    service = new InvoiceService();
    vi.clearAllMocks();
  });

  describe("createInvoice", () => {
    it("should create an invoice with lines", async () => {
      const input = {
        clientCompanyId: "client-1",
        externalId: "INV-001",
        type: "SATIŞ" as const,
        issueDate: new Date(),
        dueDate: new Date(),
        totalAmount: 1180,
        currency: "TRY",
        taxAmount: 180,
        netAmount: 1000,
        counterpartyName: "Test Customer",
        counterpartyTaxNumber: "1234567890",
        status: "taslak" as const,
        source: "manual" as const,
        lines: [
          {
            lineNumber: 1,
            description: "Test item",
            quantity: 1,
            unitPrice: 1000,
            lineTotal: 1000,
            vatRate: 0.18,
            vatAmount: 180,
          },
        ],
      };

      vi.mocked(prisma.clientCompany.findFirst).mockResolvedValue({
        id: "client-1",
        tenantId: mockTenantId,
      } as any);

      vi.mocked(prisma.invoice.create).mockResolvedValue({
        id: "invoice-1",
        tenantId: mockTenantId,
        clientCompanyId: "client-1",
        externalId: "INV-001",
        type: "SATIŞ",
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        totalAmount: 1180,
        currency: "TRY",
        taxAmount: 180,
        netAmount: 1000,
        counterpartyName: "Test Customer",
        counterpartyTaxNumber: "1234567890",
        status: "taslak",
        source: "manual",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.invoiceLine.createMany).mockResolvedValue({ count: 1 } as any);

      const result = await service.createInvoice(mockTenantId, input);

      expect(result.id).toBe("invoice-1");
      expect(prisma.invoice.create).toHaveBeenCalled();
      expect(prisma.invoiceLine.createMany).toHaveBeenCalled();
    });

    it("should throw ValidationError when client company doesn't belong to tenant", async () => {
      const input = {
        clientCompanyId: "client-1",
        externalId: "INV-001",
        type: "SATIŞ" as const,
        issueDate: new Date(),
        totalAmount: 1180,
        currency: "TRY",
        taxAmount: 180,
        status: "taslak" as const,
        source: "manual" as const,
        lines: [
          {
            lineNumber: 1,
            description: "Test item",
            quantity: 1,
            unitPrice: 1000,
            lineTotal: 1000,
            vatRate: 0.18,
            vatAmount: 180,
          },
        ],
      };

      vi.mocked(prisma.clientCompany.findFirst).mockResolvedValue(null);

      await expect(service.createInvoice(mockTenantId, input)).rejects.toThrow(ValidationError);
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });
  });

  describe("updateInvoiceStatus", () => {
    it("should update invoice status", async () => {
      const existing = {
        id: "invoice-1",
        tenantId: mockTenantId,
        status: "taslak",
      };

      vi.mocked(prisma.invoice.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.invoice.update).mockResolvedValue({
        ...existing,
        status: "kesildi",
        type: "SATIŞ",
        externalId: "INV-001",
        issueDate: new Date(),
        totalAmount: 1180,
        currency: "TRY",
        taxAmount: 180,
        netAmount: 1000,
        counterpartyName: null,
        counterpartyTaxNumber: null,
        dueDate: null,
        source: "manual",
        clientCompanyId: "client-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.updateInvoiceStatus(mockTenantId, "invoice-1", "kesildi");

      expect(result.status).toBe("kesildi");
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: "invoice-1" },
        data: { status: "kesildi" },
      });
    });

    it("should throw NotFoundError when invoice not found", async () => {
      vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null);

      await expect(
        service.updateInvoiceStatus(mockTenantId, "non-existent", "kesildi")
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("listInvoices", () => {
    it("should return paginated list of invoices for a tenant", async () => {
      const mockInvoices = [
        {
          id: "invoice-1",
          tenantId: mockTenantId,
          clientCompanyId: "client-1",
          externalId: "INV-001",
          type: "SATIŞ",
          issueDate: new Date(),
          dueDate: null,
          totalAmount: 1180,
          currency: "TRY",
          taxAmount: 180,
          netAmount: 1000,
          counterpartyName: null,
          counterpartyTaxNumber: null,
          status: "taslak",
          source: "manual",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.invoice.findMany).mockResolvedValue(mockInvoices as any);
      vi.mocked(prisma.invoice.count).mockResolvedValue(1);

      const result = await service.listInvoices(mockTenantId);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
        })
      );
    });
  });
});

