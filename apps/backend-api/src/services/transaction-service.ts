import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import type {
  Transaction,
  TransactionLine,
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@repo/core-domain";
import type { PaginatedResult } from "./client-company-service";

export interface ListTransactionsFilters {
  clientCompanyId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  referenceNo?: string;
  page?: number;
  pageSize?: number;
}

export interface TrialBalanceEntry {
  ledgerAccountId: string;
  ledgerAccountCode: string;
  ledgerAccountName: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface TrialBalanceResult {
  entries: TrialBalanceEntry[];
  totalDebit: number;
  totalCredit: number;
}

export class TransactionService {
  async listTransactions(
    tenantId: string,
    filters: ListTransactionsFilters = {}
  ): Promise<PaginatedResult<Transaction & { totalDebit: number; totalCredit: number }>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
    };

    if (filters.clientCompanyId) {
      where.clientCompanyId = filters.clientCompanyId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.date.lte = filters.dateTo;
      }
    }

    if (filters.referenceNo) {
      where.referenceNo = { contains: filters.referenceNo, mode: "insensitive" };
    }

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          lines: true,
        },
        orderBy: { date: "desc" },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      data: data.map((item) => {
        const totalDebit = item.lines.reduce((sum, line) => sum + Number(line.debitAmount), 0);
        const totalCredit = item.lines.reduce((sum, line) => sum + Number(line.creditAmount), 0);
        return {
          id: item.id,
          tenantId: item.tenantId,
          clientCompanyId: item.clientCompanyId,
          date: item.date,
          referenceNo: item.referenceNo,
          description: item.description,
          source: item.source as any,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          totalDebit,
          totalCredit,
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getTransactionById(tenantId: string, id: string): Promise<Transaction & { lines: TransactionLine[] }> {
    const transaction = await prisma.transaction.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: {
            ledgerAccount: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundError("Mali hareket bulunamadı.");
    }

    return {
      id: transaction.id,
      tenantId: transaction.tenantId,
      clientCompanyId: transaction.clientCompanyId,
      date: transaction.date,
      referenceNo: transaction.referenceNo,
      description: transaction.description,
      source: transaction.source as any,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      lines: transaction.lines.map((line) => ({
        id: line.id,
        tenantId: line.tenantId,
        transactionId: line.transactionId,
        ledgerAccountId: line.ledgerAccountId,
        debitAmount: Number(line.debitAmount),
        creditAmount: Number(line.creditAmount),
        description: line.description,
        createdAt: line.createdAt,
        updatedAt: line.updatedAt,
      })),
    } as any;
  }

  async createTransaction(tenantId: string, input: CreateTransactionInput): Promise<Transaction> {
    // Validate client company if provided
    if (input.clientCompanyId) {
      const client = await prisma.clientCompany.findFirst({
        where: { id: input.clientCompanyId, tenantId },
      });

      if (!client) {
        throw new NotFoundError("Müşteri şirketi bulunamadı.");
      }
    }

    // Validate ledger accounts belong to tenant
    const ledgerAccountIds = input.lines.map((line) => line.ledgerAccountId);
    const ledgerAccounts = await prisma.ledgerAccount.findMany({
      where: {
        id: { in: ledgerAccountIds },
        tenantId,
      },
    });

    if (ledgerAccounts.length !== ledgerAccountIds.length) {
      throw new ValidationError("Bazı hesap kodları geçersiz veya bu kiracıya ait değil.");
    }

    // Validate debit == credit
    const totalDebit = input.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = input.lines.reduce((sum, line) => sum + line.creditAmount, 0);
    const tolerance = 0.01;

    if (Math.abs(totalDebit - totalCredit) > tolerance) {
      throw new ValidationError(
        `Toplam borç (${totalDebit}) ile toplam alacak (${totalCredit}) eşit olmalıdır.`
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        tenantId,
        clientCompanyId: input.clientCompanyId ?? null,
        date: input.date,
        referenceNo: input.referenceNo ?? null,
        description: input.description ?? null,
        source: input.source || "manual",
        lines: {
          create: input.lines.map((line) => ({
            tenantId,
            ledgerAccountId: line.ledgerAccountId,
            debitAmount: line.debitAmount,
            creditAmount: line.creditAmount,
            description: line.description ?? null,
          })),
        },
      },
    });

    return {
      id: transaction.id,
      tenantId: transaction.tenantId,
      clientCompanyId: transaction.clientCompanyId,
      date: transaction.date,
      referenceNo: transaction.referenceNo,
      description: transaction.description,
      source: transaction.source as any,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  async updateTransaction(
    tenantId: string,
    id: string,
    input: UpdateTransactionInput
  ): Promise<Transaction> {
    const existing = await prisma.transaction.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError("Mali hareket bulunamadı.");
    }

    // Validate client company if provided
    if (input.clientCompanyId) {
      const client = await prisma.clientCompany.findFirst({
        where: { id: input.clientCompanyId, tenantId },
      });

      if (!client) {
        throw new NotFoundError("Müşteri şirketi bulunamadı.");
      }
    }

    // If updating lines, validate
    if (input.lines) {
      const ledgerAccountIds = input.lines.map((line) => line.ledgerAccountId);
      const ledgerAccounts = await prisma.ledgerAccount.findMany({
        where: {
          id: { in: ledgerAccountIds },
          tenantId,
        },
      });

      if (ledgerAccounts.length !== ledgerAccountIds.length) {
        throw new ValidationError("Bazı hesap kodları geçersiz veya bu kiracıya ait değil.");
      }

      const totalDebit = input.lines.reduce((sum, line) => sum + line.debitAmount, 0);
      const totalCredit = input.lines.reduce((sum, line) => sum + line.creditAmount, 0);
      const tolerance = 0.01;

      if (Math.abs(totalDebit - totalCredit) > tolerance) {
        throw new ValidationError(
          `Toplam borç (${totalDebit}) ile toplam alacak (${totalCredit}) eşit olmalıdır.`
        );
      }
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // Delete existing lines if new lines provided
      if (input.lines) {
        await tx.transactionLine.deleteMany({
          where: { transactionId: id },
        });
      }

      // Update transaction
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          clientCompanyId: input.clientCompanyId,
          date: input.date,
          referenceNo: input.referenceNo,
          description: input.description,
          ...(input.lines && {
            lines: {
              create: input.lines.map((line) => ({
                tenantId,
                ledgerAccountId: line.ledgerAccountId,
                debitAmount: line.debitAmount,
                creditAmount: line.creditAmount,
                description: line.description ?? null,
              })),
            },
          }),
        },
      });

      return updated;
    });

    return {
      id: transaction.id,
      tenantId: transaction.tenantId,
      clientCompanyId: transaction.clientCompanyId,
      date: transaction.date,
      referenceNo: transaction.referenceNo,
      description: transaction.description,
      source: transaction.source as any,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  async deleteTransaction(tenantId: string, id: string): Promise<void> {
    const transaction = await prisma.transaction.findFirst({
      where: { id, tenantId },
    });

    if (!transaction) {
      throw new NotFoundError("Mali hareket bulunamadı.");
    }

    await prisma.transaction.delete({
      where: { id },
    });
  }

  async getTrialBalance(
    tenantId: string,
    clientCompanyId: string | null,
    dateFrom: Date,
    dateTo: Date
  ): Promise<TrialBalanceResult> {
    const where: any = {
      tenantId,
      date: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    if (clientCompanyId) {
      where.clientCompanyId = clientCompanyId;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        lines: {
          include: {
            ledgerAccount: true,
          },
        },
      },
    });

    // Aggregate by ledger account
    const accountMap = new Map<string, TrialBalanceEntry>();

    transactions.forEach((transaction) => {
      transaction.lines.forEach((line) => {
        const accountId = line.ledgerAccountId;
        const account = line.ledgerAccount;

        if (!accountMap.has(accountId)) {
          accountMap.set(accountId, {
            ledgerAccountId: accountId,
            ledgerAccountCode: account.code,
            ledgerAccountName: account.name,
            totalDebit: 0,
            totalCredit: 0,
            balance: 0,
          });
        }

        const entry = accountMap.get(accountId)!;
        entry.totalDebit += Number(line.debitAmount);
        entry.totalCredit += Number(line.creditAmount);
        entry.balance = entry.totalDebit - entry.totalCredit;
      });
    });

    const entries = Array.from(accountMap.values()).sort((a, b) =>
      a.ledgerAccountCode.localeCompare(b.ledgerAccountCode)
    );

    const totalDebit = entries.reduce((sum, entry) => sum + entry.totalDebit, 0);
    const totalCredit = entries.reduce((sum, entry) => sum + entry.totalCredit, 0);

    return {
      entries,
      totalDebit,
      totalCredit,
    };
  }
}

export const transactionService = new TransactionService();

