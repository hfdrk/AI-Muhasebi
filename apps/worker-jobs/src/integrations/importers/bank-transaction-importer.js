"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankTransactionImporter = void 0;
const prisma_1 = require("../../lib/prisma");
class BankTransactionImporter {
    async importTransactions(tenantId, normalizedTransactions, tenantIntegrationId) {
        const summary = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
        };
        for (const normalizedTransaction of normalizedTransactions) {
            try {
                const bankAccount = await this.resolveOrCreateBankAccount(tenantId, normalizedTransaction.accountIdentifier);
                const ledgerAccount = await this.findOrCreateBankLedgerAccount(tenantId, bankAccount.id, bankAccount.bankName, bankAccount.iban);
                const existingTransaction = await prisma_1.prisma.transaction.findFirst({
                    where: {
                        tenantId,
                        externalId: normalizedTransaction.externalId,
                        clientCompanyId: bankAccount.clientCompanyId,
                    },
                });
                if (existingTransaction) {
                    await prisma_1.prisma.transaction.update({
                        where: { id: existingTransaction.id },
                        data: {
                            date: normalizedTransaction.bookingDate,
                            description: normalizedTransaction.description,
                            source: "integration",
                        },
                    });
                    const existingLine = await prisma_1.prisma.transactionLine.findFirst({
                        where: { transactionId: existingTransaction.id },
                    });
                    if (existingLine) {
                        const { debitAmount, creditAmount } = this.calculateDebitCredit(normalizedTransaction.amount);
                        await prisma_1.prisma.transactionLine.update({
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
                }
                else {
                    const { debitAmount, creditAmount } = this.calculateDebitCredit(normalizedTransaction.amount);
                    await prisma_1.prisma.transaction.create({
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
            }
            catch (error) {
                summary.errors.push({
                    externalId: normalizedTransaction.externalId,
                    error: error.message || "Bilinmeyen hata",
                });
                summary.skipped++;
            }
        }
        return summary;
    }
    async resolveOrCreateBankAccount(tenantId, accountIdentifier) {
        const existing = await prisma_1.prisma.clientCompanyBankAccount.findFirst({
            where: {
                tenantId,
                iban: accountIdentifier,
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
        let defaultClientCompany = await prisma_1.prisma.clientCompany.findFirst({
            where: { tenantId, isActive: true },
            orderBy: { createdAt: "asc" },
        });
        if (!defaultClientCompany) {
            defaultClientCompany = await prisma_1.prisma.clientCompany.create({
                data: {
                    tenantId,
                    name: "Banka İşlemleri",
                    legalType: "Limited",
                    taxNumber: `BANK-${Date.now()}`,
                    isActive: true,
                },
            });
        }
        const bankName = this.extractBankNameFromIBAN(accountIdentifier);
        const bankAccount = await prisma_1.prisma.clientCompanyBankAccount.create({
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
    async findOrCreateBankLedgerAccount(tenantId, bankAccountId, bankName, iban) {
        const accountCode = `102.01.${bankAccountId.substring(0, 3)}`;
        let ledgerAccount = await prisma_1.prisma.ledgerAccount.findUnique({
            where: {
                tenantId_code: {
                    tenantId,
                    code: accountCode,
                },
            },
        });
        if (!ledgerAccount) {
            ledgerAccount = await prisma_1.prisma.ledgerAccount.create({
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
    calculateDebitCredit(amount) {
        if (amount >= 0) {
            return { debitAmount: 0, creditAmount: amount };
        }
        else {
            return { debitAmount: Math.abs(amount), creditAmount: 0 };
        }
    }
    extractBankNameFromIBAN(iban) {
        if (iban.startsWith("TR")) {
            return "Türkiye Bankası";
        }
        return "Bilinmeyen Banka";
    }
}
exports.BankTransactionImporter = BankTransactionImporter;
//# sourceMappingURL=bank-transaction-importer.js.map