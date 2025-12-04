import { describe, it, expect, beforeEach, vi } from "vitest";
import { TransactionService } from "../transaction-service";
import { ValidationError } from "@repo/shared-utils";
import { prisma } from "../../lib/prisma";

// Mock Prisma
vi.mock("../../lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    transactionLine: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    clientCompany: {
      findFirst: vi.fn(),
    },
    ledgerAccount: {
      findMany: vi.fn(),
    },
  },
}));

describe("TransactionService", () => {
  let service: TransactionService;
  const mockTenantId = "tenant-123";

  beforeEach(() => {
    service = new TransactionService();
    vi.clearAllMocks();
  });

  describe("createTransaction", () => {
    it("should create a transaction with balanced debit and credit", async () => {
      const input = {
        clientCompanyId: "client-1",
        date: new Date(),
        referenceNo: "REF-001",
        description: "Test transaction",
        source: "manual" as const,
        lines: [
          {
            ledgerAccountId: "account-1",
            debitAmount: 1000,
            creditAmount: 0,
            description: "Debit line",
          },
          {
            ledgerAccountId: "account-2",
            debitAmount: 0,
            creditAmount: 1000,
            description: "Credit line",
          },
        ],
      };

      vi.mocked(prisma.clientCompany.findFirst).mockResolvedValue({
        id: "client-1",
        tenantId: mockTenantId,
      } as any);

      vi.mocked(prisma.ledgerAccount.findMany).mockResolvedValue([
        { id: "account-1", tenantId: mockTenantId },
        { id: "account-2", tenantId: mockTenantId },
      ] as any);

      vi.mocked(prisma.transaction.create).mockResolvedValue({
        id: "transaction-1",
        tenantId: mockTenantId,
        clientCompanyId: "client-1",
        date: input.date,
        referenceNo: input.referenceNo,
        description: input.description,
        source: "manual",
        createdAt: new Date(),
        updatedAt: new Date(),
        lines: [
          {
            id: "line-1",
            transactionId: "transaction-1",
            tenantId: mockTenantId,
            ledgerAccountId: "account-1",
            debitAmount: 1000,
            creditAmount: 0,
            description: "Debit line",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "line-2",
            transactionId: "transaction-1",
            tenantId: mockTenantId,
            ledgerAccountId: "account-2",
            debitAmount: 0,
            creditAmount: 1000,
            description: "Credit line",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      } as any);

      const result = await service.createTransaction(mockTenantId, input);

      expect(result.id).toBe("transaction-1");
      expect(prisma.transaction.create).toHaveBeenCalled();
      // Transaction service uses nested create, not createMany
      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lines: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  tenantId: mockTenantId,
                  ledgerAccountId: "account-1",
                  debitAmount: 1000,
                  creditAmount: 0,
                }),
                expect.objectContaining({
                  tenantId: mockTenantId,
                  ledgerAccountId: "account-2",
                  debitAmount: 0,
                  creditAmount: 1000,
                }),
              ]),
            }),
          }),
        })
      );
    });

    it("should throw ValidationError when debit and credit totals don't match", async () => {
      const input = {
        clientCompanyId: "client-1",
        date: new Date(),
        referenceNo: "REF-001",
        description: "Unbalanced transaction",
        source: "manual" as const,
        lines: [
          {
            ledgerAccountId: "account-1",
            debitAmount: 1000,
            creditAmount: 0,
            description: "Debit line",
          },
          {
            ledgerAccountId: "account-2",
            debitAmount: 0,
            creditAmount: 500, // Unbalanced!
            description: "Credit line",
          },
        ],
      };

      vi.mocked(prisma.clientCompany.findFirst).mockResolvedValue({
        id: "client-1",
        tenantId: mockTenantId,
      } as any);

      vi.mocked(prisma.ledgerAccount.findMany).mockResolvedValue([
        { id: "account-1", tenantId: mockTenantId },
        { id: "account-2", tenantId: mockTenantId },
      ] as any);

      await expect(service.createTransaction(mockTenantId, input)).rejects.toThrow(ValidationError);
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it("should throw ValidationError when transaction has less than 2 lines", async () => {
      const input = {
        clientCompanyId: "client-1",
        date: new Date(),
        referenceNo: "REF-001",
        description: "Single line transaction",
        source: "manual" as const,
        lines: [
          {
            ledgerAccountId: "account-1",
            debitAmount: 1000,
            creditAmount: 0,
            description: "Single line",
          },
        ],
      };

      vi.mocked(prisma.clientCompany.findFirst).mockResolvedValue({
        id: "client-1",
        tenantId: mockTenantId,
      } as any);

      vi.mocked(prisma.ledgerAccount.findMany).mockResolvedValue([
        { id: "account-1", tenantId: mockTenantId },
        { id: "account-2", tenantId: mockTenantId },
      ] as any);

      await expect(service.createTransaction(mockTenantId, input)).rejects.toThrow(ValidationError);
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe("listTransactions", () => {
    it("should return paginated list of transactions for a tenant", async () => {
      const mockTransactions = [
        {
          id: "transaction-1",
          tenantId: mockTenantId,
          clientCompanyId: "client-1",
          date: new Date(),
          referenceNo: "REF-001",
          description: "Test transaction",
          source: "manual",
          createdAt: new Date(),
          updatedAt: new Date(),
          lines: [
            {
              id: "line-1",
              transactionId: "transaction-1",
              tenantId: mockTenantId,
              ledgerAccountId: "account-1",
              debitAmount: 1000,
              creditAmount: 0,
              description: "Test line",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "line-2",
              transactionId: "transaction-1",
              tenantId: mockTenantId,
              ledgerAccountId: "account-2",
              debitAmount: 0,
              creditAmount: 1000,
              description: "Test line",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ];

      vi.mocked(prisma.transaction.findMany).mockResolvedValue(mockTransactions as any);
      vi.mocked(prisma.transaction.count).mockResolvedValue(1);

      const result = await service.listTransactions(mockTenantId);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
        })
      );
    });

    it("should filter by client company when provided", async () => {
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.transaction.count).mockResolvedValue(0);

      await service.listTransactions(mockTenantId, { clientCompanyId: "client-1" });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId, clientCompanyId: "client-1" },
        })
      );
    });
  });
});

