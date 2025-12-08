"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceImporter = void 0;
const prisma_1 = require("../../lib/prisma");
class InvoiceImporter {
    async importInvoices(tenantId, normalizedInvoices, tenantIntegrationId) {
        const summary = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
        };
        // Get integration to check if it has a preferred clientCompanyId
        const integration = await prisma_1.prisma.tenantIntegration.findUnique({
            where: { id: tenantIntegrationId },
            select: { clientCompanyId: true },
        });
        const preferredClientCompanyId = integration?.clientCompanyId;
        for (const normalizedInvoice of normalizedInvoices) {
            try {
                let clientCompany = await this.resolveClientCompany(tenantId, normalizedInvoice.clientCompanyTaxNumber, normalizedInvoice.clientCompanyName, normalizedInvoice.clientCompanyExternalId);
                if (!clientCompany) {
                    // If integration has a preferred clientCompanyId, use it as fallback
                    if (preferredClientCompanyId) {
                        const preferredCompany = await prisma_1.prisma.clientCompany.findFirst({
                            where: {
                                id: preferredClientCompanyId,
                                tenantId,
                            },
                            select: { id: true },
                        });
                        if (preferredCompany) {
                            clientCompany = preferredCompany;
                        }
                    }
                    // If still no client company, create a new one
                    if (!clientCompany) {
                        clientCompany = await prisma_1.prisma.clientCompany.create({
                            data: {
                                tenantId,
                                name: normalizedInvoice.clientCompanyName || "Bilinmeyen Müşteri",
                                legalType: "Limited",
                                taxNumber: normalizedInvoice.clientCompanyTaxNumber || `TEMP-${Date.now()}`,
                                isActive: true,
                            },
                        });
                    }
                }
                const existingInvoice = await prisma_1.prisma.invoice.findFirst({
                    where: {
                        tenantId,
                        externalId: normalizedInvoice.externalId,
                        clientCompanyId: clientCompany.id,
                    },
                });
                if (existingInvoice) {
                    await prisma_1.prisma.invoice.update({
                        where: { id: existingInvoice.id },
                        data: {
                            type: normalizedInvoice.type || "SATIŞ",
                            issueDate: normalizedInvoice.issueDate,
                            dueDate: normalizedInvoice.dueDate,
                            totalAmount: normalizedInvoice.totalAmount,
                            currency: normalizedInvoice.currency,
                            taxAmount: normalizedInvoice.taxAmount,
                            netAmount: normalizedInvoice.netAmount ?? null,
                            counterpartyName: normalizedInvoice.counterpartyName ?? null,
                            counterpartyTaxNumber: normalizedInvoice.counterpartyTaxNumber ?? null,
                            status: normalizedInvoice.status || "taslak",
                            source: "integration",
                        },
                    });
                    await prisma_1.prisma.invoiceLine.deleteMany({
                        where: { invoiceId: existingInvoice.id },
                    });
                    await prisma_1.prisma.invoiceLine.createMany({
                        data: normalizedInvoice.lines.map((line) => ({
                            tenantId,
                            invoiceId: existingInvoice.id,
                            lineNumber: line.lineNumber,
                            description: line.description,
                            quantity: line.quantity,
                            unitPrice: line.unitPrice,
                            lineTotal: line.lineTotal,
                            vatRate: line.vatRate,
                            vatAmount: line.vatAmount,
                        })),
                    });
                    summary.updated++;
                }
                else {
                    await prisma_1.prisma.invoice.create({
                        data: {
                            tenantId,
                            clientCompanyId: clientCompany.id,
                            externalId: normalizedInvoice.externalId,
                            type: normalizedInvoice.type || "SATIŞ",
                            issueDate: normalizedInvoice.issueDate,
                            dueDate: normalizedInvoice.dueDate,
                            totalAmount: normalizedInvoice.totalAmount,
                            currency: normalizedInvoice.currency,
                            taxAmount: normalizedInvoice.taxAmount,
                            netAmount: normalizedInvoice.netAmount ?? null,
                            counterpartyName: normalizedInvoice.counterpartyName ?? null,
                            counterpartyTaxNumber: normalizedInvoice.counterpartyTaxNumber ?? null,
                            status: normalizedInvoice.status || "taslak",
                            source: "integration",
                            lines: {
                                create: normalizedInvoice.lines.map((line) => ({
                                    tenantId,
                                    lineNumber: line.lineNumber,
                                    description: line.description,
                                    quantity: line.quantity,
                                    unitPrice: line.unitPrice,
                                    lineTotal: line.lineTotal,
                                    vatRate: line.vatRate,
                                    vatAmount: line.vatAmount,
                                })),
                            },
                        },
                    });
                    summary.created++;
                }
            }
            catch (error) {
                summary.errors.push({
                    externalId: normalizedInvoice.externalId,
                    error: error.message || "Bilinmeyen hata",
                });
                summary.skipped++;
            }
        }
        return summary;
    }
    async resolveClientCompany(tenantId, taxNumber, name, externalId) {
        if (taxNumber) {
            const byTaxNumber = await prisma_1.prisma.clientCompany.findUnique({
                where: {
                    tenantId_taxNumber: {
                        tenantId,
                        taxNumber,
                    },
                },
                select: { id: true },
            });
            if (byTaxNumber) {
                return byTaxNumber;
            }
        }
        if (name) {
            const byName = await prisma_1.prisma.clientCompany.findFirst({
                where: {
                    tenantId,
                    name: {
                        equals: name,
                        mode: "insensitive",
                    },
                },
                select: { id: true },
            });
            if (byName) {
                return byName;
            }
        }
        return null;
    }
}
exports.InvoiceImporter = InvoiceImporter;
//# sourceMappingURL=invoice-importer.js.map