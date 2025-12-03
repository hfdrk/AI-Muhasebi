import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import type {
  ClientCompanyBankAccount,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from "@repo/core-domain";

export class BankAccountService {
  async listBankAccounts(
    tenantId: string,
    clientCompanyId: string
  ): Promise<ClientCompanyBankAccount[]> {
    // Verify client company belongs to tenant
    const client = await prisma.clientCompany.findFirst({
      where: { id: clientCompanyId, tenantId },
    });

    if (!client) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    const accounts = await prisma.clientCompanyBankAccount.findMany({
      where: {
        tenantId,
        clientCompanyId,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    return accounts.map((account) => ({
      id: account.id,
      tenantId: account.tenantId,
      clientCompanyId: account.clientCompanyId,
      bankName: account.bankName,
      iban: account.iban,
      accountNumber: account.accountNumber,
      currency: account.currency,
      isPrimary: account.isPrimary,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }));
  }

  async createBankAccount(
    tenantId: string,
    clientCompanyId: string,
    input: CreateBankAccountInput
  ): Promise<ClientCompanyBankAccount> {
    // Verify client company belongs to tenant
    const client = await prisma.clientCompany.findFirst({
      where: { id: clientCompanyId, tenantId },
    });

    if (!client) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    // If this is set as primary, unset other primary accounts
    if (input.isPrimary) {
      await prisma.clientCompanyBankAccount.updateMany({
        where: {
          tenantId,
          clientCompanyId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const account = await prisma.clientCompanyBankAccount.create({
      data: {
        tenantId,
        clientCompanyId,
        bankName: input.bankName,
        iban: input.iban,
        accountNumber: input.accountNumber ?? null,
        currency: input.currency || "TRY",
        isPrimary: input.isPrimary || false,
      },
    });

    return {
      id: account.id,
      tenantId: account.tenantId,
      clientCompanyId: account.clientCompanyId,
      bankName: account.bankName,
      iban: account.iban,
      accountNumber: account.accountNumber,
      currency: account.currency,
      isPrimary: account.isPrimary,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  async updateBankAccount(
    tenantId: string,
    clientCompanyId: string,
    accountId: string,
    input: UpdateBankAccountInput
  ): Promise<ClientCompanyBankAccount> {
    const account = await prisma.clientCompanyBankAccount.findFirst({
      where: {
        id: accountId,
        tenantId,
        clientCompanyId,
      },
    });

    if (!account) {
      throw new NotFoundError("Banka hesabı bulunamadı.");
    }

    // If setting as primary, unset other primary accounts
    if (input.isPrimary && !account.isPrimary) {
      await prisma.clientCompanyBankAccount.updateMany({
        where: {
          tenantId,
          clientCompanyId,
          isPrimary: true,
          id: { not: accountId },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const updated = await prisma.clientCompanyBankAccount.update({
      where: { id: accountId },
      data: {
        bankName: input.bankName,
        iban: input.iban,
        accountNumber: input.accountNumber ?? undefined,
        currency: input.currency,
        isPrimary: input.isPrimary,
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      clientCompanyId: updated.clientCompanyId,
      bankName: updated.bankName,
      iban: updated.iban,
      accountNumber: updated.accountNumber,
      currency: updated.currency,
      isPrimary: updated.isPrimary,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteBankAccount(
    tenantId: string,
    clientCompanyId: string,
    accountId: string
  ): Promise<void> {
    const account = await prisma.clientCompanyBankAccount.findFirst({
      where: {
        id: accountId,
        tenantId,
        clientCompanyId,
      },
    });

    if (!account) {
      throw new NotFoundError("Banka hesabı bulunamadı.");
    }

    await prisma.clientCompanyBankAccount.delete({
      where: { id: accountId },
    });
  }
}

export const bankAccountService = new BankAccountService();

