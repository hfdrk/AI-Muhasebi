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

    // Get integration to check if it has a preferred clientCompanyId
    const integration = await prisma.tenantIntegration.findUnique({
      where: { id: tenantIntegrationId },
      select: { clientCompanyId: true },
    });

    const preferredClientCompanyId = integration?.clientCompanyId;

    for (const normalizedInvoice of normalizedInvoices) {
      try {
        // Resolve or create ClientCompany
        let clientCompany = await this.resolveClientCompany(
          tenantId,
          normalizedInvoice.clientCompanyTaxNumber,
          normalizedInvoice.clientCompanyName,
          normalizedInvoice.clientCompanyExternalId
        );

        if (!clientCompany) {
          // If integration has a preferred clientCompanyId, use it as fallback
          if (preferredClientCompanyId) {
            const preferredCompany = await prisma.clientCompany.findFirst({
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
            clientCompany = await prisma.clientCompany.create({
              data: {
                tenantId,
                name: normalizedInvoice.clientCompanyName || "Bilinmeyen Müşteri",
                legalType: "Limited", // Default, can be updated later
                taxNumber: normalizedInvoice.clientCompanyTaxNumber || `TEMP-${Date.now()}`,
                isActive: true,
              },
            });
          }
        }

        // Check if invoice already exists by externalId
        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            tenantId,
            externalId: normalizedInvoice.externalId,
            clientCompanyId: clientCompany.id,
          },
        });

        if (existingInvoice) {
          // Update existing invoice
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

          // Update invoice lines
          await prisma.invoiceLine.deleteMany({
            where: { invoiceId: existingInvoice.id },
          });

          await prisma.invoiceLine.createMany({
            data: normalizedInvoice.lines.map((line, idx) => ({
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
          // Create new invoice
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
    // Try to match by tax number first
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

    // Try to match by name (case-insensitive)
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

    // Matching is done by tax number first, then by name
    return null;
  }
}



