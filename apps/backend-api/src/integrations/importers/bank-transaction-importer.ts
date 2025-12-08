import { prisma } from "../../lib/prisma";
import type { NormalizedBankTransaction } from "../connectors/types";

export interface BankTransactionImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ externalId: string; error: string }>;
}

export class BankTransactionImporter {
  async importTransactions(
    tenantId: string,
    normalizedTransactions: NormalizedBankTransaction[],
    tenantIntegrationId: string
  ): Promise<BankTransactionImportSummary> {
    const summary: BankTransactionImportSummary = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (const normalizedTransaction of normalizedTransactions) {
      try {
        // Resolve or create ClientCompanyBankAccount
        const bankAccount = await this.resolveOrCreateBankAccount(
          tenantId,
          normalizedTransaction.accountIdentifier
        );

        // Find or create ledger account for bank account
        const ledgerAccount = await this.findOrCreateBankLedgerAccount(
          tenantId,
          bankAccount.id,
          bankAccount.bankName,
          bankAccount.iban
        );

        // Check if transaction already exists by externalId
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            tenantId,
            externalId: normalizedTransaction.externalId,
            clientCompanyId: bankAccount.clientCompanyId,
          },
        });

        if (existingTransaction) {
          // Update existing transaction
          await prisma.transaction.update({
            where: { id: existingTransaction.id },
            data: {
              date: normalizedTransaction.bookingDate,
              description: normalizedTransaction.description,
              source: "integration",
            },
          });

          // Update transaction line
          const existingLine = await prisma.transactionLine.findFirst({
            where: { transactionId: existingTransaction.id },
          });

          if (existingLine) {
            const { debitAmount, creditAmount } = this.calculateDebitCredit(normalizedTransaction.amount);

            await prisma.transactionLine.update({
              where: { id: existingLine.id },
              data: {
                ledgerAccountId: ledgerAccount.id,
                debitAmount,
                creditAmount,
                description: normalizedTransaction.description,
              },
            });
          }

          summary.updated++;
        } else {
          // Create new transaction
          const { debitAmount, creditAmount } = this.calculateDebitCredit(normalizedTransaction.amount);

          await prisma.transaction.create({
            data: {
              tenantId,
              clientCompanyId: bankAccount.clientCompanyId,
              externalId: normalizedTransaction.externalId,
              date: normalizedTransaction.bookingDate,
              description: normalizedTransaction.description,
              source: "integration",
              lines: {
                create: [
                  {
                    tenantId,
                    ledgerAccountId: ledgerAccount.id,
                    debitAmount,
                    creditAmount,
                    description: normalizedTransaction.description,
                  },
                ],
              },
            },
          });

          summary.created++;
        }
      } catch (error: any) {
        summary.errors.push({
          externalId: normalizedTransaction.externalId,
          error: error.message || "Bilinmeyen hata",
        });
        summary.skipped++;
      }
    }

    return summary;
  }

  private async resolveOrCreateBankAccount(
    tenantId: string,
    accountIdentifier: string
  ): Promise<{ id: string; clientCompanyId: string; bankName: string; iban: string }> {
    // Try to find existing bank account by IBAN
    const existing = await prisma.clientCompanyBankAccount.findFirst({
      where: {
        tenantId,
        iban: accountIdentifier,
      },
      include: {
        clientCompany: true,
      },
    });

    if (existing) {
      return {
        id: existing.id,
        clientCompanyId: existing.clientCompanyId,
        bankName: existing.bankName,
        iban: existing.iban,
      };
    }

    // If not found, we need to create a bank account
    // For now, we'll try to find a default client company or create a generic one
    // In a real scenario, this should be configurable per integration
    let defaultClientCompany = await prisma.clientCompany.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (!defaultClientCompany) {
      // Create a default client company for bank transactions
      defaultClientCompany = await prisma.clientCompany.create({
        data: {
          tenantId,
          name: "Banka İşlemleri",
          legalType: "Limited",
          taxNumber: `BANK-${Date.now()}`,
          isActive: true,
        },
      });
    }

    // Extract bank name from IBAN (simplified - in real scenario, use IBAN lookup)
    const bankName = this.extractBankNameFromIBAN(accountIdentifier);

    const bankAccount = await prisma.clientCompanyBankAccount.create({
      data: {
        tenantId,
        clientCompanyId: defaultClientCompany.id,
        bankName,
        iban: accountIdentifier,
        currency: "TRY",
        isPrimary: false,
      },
    });

    return {
      id: bankAccount.id,
      clientCompanyId: bankAccount.clientCompanyId,
      bankName: bankAccount.bankName,
      iban: bankAccount.iban,
    };
  }

  private async findOrCreateBankLedgerAccount(
    tenantId: string,
    bankAccountId: string,
    bankName: string,
    iban: string
  ): Promise<{ id: string }> {
    // Try to find existing ledger account by a naming pattern
    // For simplicity, we'll use a code like "102.01.001" for bank accounts
    const accountCode = `102.01.${bankAccountId.substring(0, 3)}`;

    let ledgerAccount = await prisma.ledgerAccount.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: accountCode,
        },
      },
    });

    if (!ledgerAccount) {
      // Create new ledger account for this bank account
      ledgerAccount = await prisma.ledgerAccount.create({
        data: {
          tenantId,
          code: accountCode,
          name: `${bankName} - ${iban.substring(iban.length - 4)}`,
          type: "asset",
          isActive: true,
        },
      });
    }

    return { id: ledgerAccount.id };
  }

  private calculateDebitCredit(amount: number): { debitAmount: number; creditAmount: number } {
    // Positive amount = credit (money coming in)
    // Negative amount = debit (money going out)
    if (amount >= 0) {
      return { debitAmount: 0, creditAmount: amount };
    } else {
      return { debitAmount: Math.abs(amount), creditAmount: 0 };
    }
  }

  private extractBankNameFromIBAN(iban: string): string {
    // Simplified bank name extraction
    // In a real scenario, use IBAN lookup service
    if (iban.startsWith("TR")) {
      return "Türkiye Bankası";
    }
    return "Bilinmeyen Banka";
  }
}




