import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import type {
  LedgerAccount,
  CreateLedgerAccountInput,
  UpdateLedgerAccountInput,
} from "@repo/core-domain";

export class LedgerAccountService {
  async listLedgerAccounts(tenantId: string): Promise<LedgerAccount[]> {
    const accounts = await prisma.ledgerAccount.findMany({
      where: { tenantId },
      orderBy: { code: "asc" },
    });

    return accounts.map((account) => ({
      id: account.id,
      tenantId: account.tenantId,
      code: account.code,
      name: account.name,
      type: account.type as any,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }));
  }

  async getLedgerAccountById(tenantId: string, id: string): Promise<LedgerAccount> {
    const account = await prisma.ledgerAccount.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      throw new NotFoundError("Hesap bulunamadı.");
    }

    return {
      id: account.id,
      tenantId: account.tenantId,
      code: account.code,
      name: account.name,
      type: account.type as any,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  async createLedgerAccount(
    tenantId: string,
    input: CreateLedgerAccountInput
  ): Promise<LedgerAccount> {
    // Check if code already exists for this tenant
    const existing = await prisma.ledgerAccount.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: input.code,
        },
      },
    });

    if (existing) {
      throw new ValidationError("Bu hesap kodu zaten kullanılıyor.");
    }

    const account = await prisma.ledgerAccount.create({
      data: {
        tenantId,
        code: input.code,
        name: input.name,
        type: input.type,
        isActive: input.isActive ?? true,
      },
    });

    return {
      id: account.id,
      tenantId: account.tenantId,
      code: account.code,
      name: account.name,
      type: account.type as any,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  async updateLedgerAccount(
    tenantId: string,
    id: string,
    input: UpdateLedgerAccountInput
  ): Promise<LedgerAccount> {
    const existing = await prisma.ledgerAccount.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError("Hesap bulunamadı.");
    }

    // If updating code, check uniqueness
    if (input.code && input.code !== existing.code) {
      const codeExists = await prisma.ledgerAccount.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: input.code,
          },
        },
      });

      if (codeExists) {
        throw new ValidationError("Bu hesap kodu zaten kullanılıyor.");
      }
    }

    const account = await prisma.ledgerAccount.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        type: input.type,
        isActive: input.isActive,
      },
    });

    return {
      id: account.id,
      tenantId: account.tenantId,
      code: account.code,
      name: account.name,
      type: account.type as any,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}

export const ledgerAccountService = new LedgerAccountService();

