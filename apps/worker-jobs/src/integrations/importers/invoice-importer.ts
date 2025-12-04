import { prisma } from "../../lib/prisma";
import type { NormalizedInvoice } from "../connectors/types";

export interface InvoiceImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ externalId: string; error: string }>;
}

export class InvoiceImporter {
  async importInvoices(
    tenantId: string,
    normalizedInvoices: NormalizedInvoice[],
    tenantIntegrationId: string
  ): Promise<InvoiceImportSummary> {
    const summary: InvoiceImportSummary = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (const normalizedInvoice of normalizedInvoices) {
      try {
        let clientCompany = await this.resolveClientCompany(
          tenantId,
          normalizedInvoice.clientCompanyTaxNumber,
          normalizedInvoice.clientCompanyName,
          normalizedInvoice.clientCompanyExternalId
        );

        if (!clientCompany) {
          clientCompany = await prisma.clientCompany.create({
            data: {
              tenantId,
              name: normalizedInvoice.clientCompanyName || "Bilinmeyen Müşteri",
              legalType: "Limited",
              taxNumber: normalizedInvoice.clientCompanyTaxNumber || `TEMP-${Date.now()}`,
              isActive: true,
            },
          });
        }

        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            tenantId,
            externalId: normalizedInvoice.externalId,
            clientCompanyId: clientCompany.id,
          },
        });

        if (existingInvoice) {
          await prisma.invoice.update({
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

          await prisma.invoiceLine.deleteMany({
            where: { invoiceId: existingInvoice.id },
          });

          await prisma.invoiceLine.createMany({
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
        } else {
          await prisma.invoice.create({
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
      } catch (error: any) {
        summary.errors.push({
          externalId: normalizedInvoice.externalId,
          error: error.message || "Bilinmeyen hata",
        });
        summary.skipped++;
      }
    }

    return summary;
  }

  private async resolveClientCompany(
    tenantId: string,
    taxNumber?: string | null,
    name?: string | null,
    externalId?: string | null
  ): Promise<{ id: string } | null> {
    if (taxNumber) {
      const byTaxNumber = await prisma.clientCompany.findUnique({
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
      const byName = await prisma.clientCompany.findFirst({
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



