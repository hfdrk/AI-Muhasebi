import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import type {
  Invoice,
  InvoiceLine,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceStatus,
} from "@repo/core-domain";
import type { PaginatedResult } from "./client-company-service";

export interface ListInvoicesFilters {
  clientCompanyId?: string;
  issueDateFrom?: Date;
  issueDateTo?: Date;
  type?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

const LOCKED_STATUSES: InvoiceStatus[] = ["iptal", "muhasebeleştirilmiş"];

export class InvoiceService {
  async listInvoices(
    tenantId: string,
    filters: ListInvoicesFilters = {}
  ): Promise<PaginatedResult<Invoice>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
    };

    if (filters.clientCompanyId) {
      where.clientCompanyId = filters.clientCompanyId;
    }

    if (filters.issueDateFrom || filters.issueDateTo) {
      where.issueDate = {};
      if (filters.issueDateFrom) {
        where.issueDate.gte = filters.issueDateFrom;
      }
      if (filters.issueDateTo) {
        where.issueDate.lte = filters.issueDateTo;
      }
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          clientCompany: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { clientCompany: { name: "asc" } },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        tenantId: item.tenantId,
        clientCompanyId: item.clientCompanyId,
        clientCompanyName: item.clientCompany?.name || null,
        externalId: item.externalId,
        type: item.type as any,
        issueDate: item.issueDate,
        dueDate: item.dueDate,
        totalAmount: Number(item.totalAmount),
        currency: item.currency,
        taxAmount: Number(item.taxAmount),
        netAmount: item.netAmount ? Number(item.netAmount) : null,
        counterpartyName: item.counterpartyName,
        counterpartyTaxNumber: item.counterpartyTaxNumber,
        status: item.status as any,
        source: item.source as any,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getInvoiceById(tenantId: string, id: string): Promise<Invoice & { lines: InvoiceLine[] }> {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          orderBy: { lineNumber: "asc" },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError("Fatura bulunamadı.");
    }

    return {
      id: invoice.id,
      tenantId: invoice.tenantId,
      clientCompanyId: invoice.clientCompanyId,
      externalId: invoice.externalId,
      type: invoice.type as any,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency,
      taxAmount: Number(invoice.taxAmount),
      netAmount: invoice.netAmount ? Number(invoice.netAmount) : null,
      counterpartyName: invoice.counterpartyName,
      counterpartyTaxNumber: invoice.counterpartyTaxNumber,
      status: invoice.status as any,
      source: invoice.source as any,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      lines: invoice.lines.map((line) => ({
        id: line.id,
        tenantId: line.tenantId,
        invoiceId: line.invoiceId,
        lineNumber: line.lineNumber,
        description: line.description,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        lineTotal: Number(line.lineTotal),
        vatRate: Number(line.vatRate),
        vatAmount: Number(line.vatAmount),
        createdAt: line.createdAt,
        updatedAt: line.updatedAt,
      })),
    } as any;
  }

  async createInvoice(tenantId: string, input: CreateInvoiceInput): Promise<Invoice> {
    // Verify client company belongs to tenant
    const client = await prisma.clientCompany.findFirst({
      where: { id: input.clientCompanyId, tenantId },
    });

    if (!client) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    // Validate line totals match header total (with tolerance)
    const lineTotalSum = input.lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const tolerance = 0.01; // Allow small rounding differences
    if (Math.abs(lineTotalSum - input.totalAmount) > tolerance) {
      throw new ValidationError(
        `Fatura satırları toplamı (${lineTotalSum}) ile fatura toplamı (${input.totalAmount}) eşleşmiyor.`
      );
    }

    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        clientCompanyId: input.clientCompanyId,
        externalId: input.externalId ?? null,
        type: input.type,
        issueDate: input.issueDate,
        dueDate: input.dueDate ?? null,
        totalAmount: input.totalAmount,
        currency: input.currency || "TRY",
        taxAmount: input.taxAmount,
        netAmount: input.netAmount ?? null,
        counterpartyName: input.counterpartyName ?? null,
        counterpartyTaxNumber: input.counterpartyTaxNumber ?? null,
        status: input.status || "taslak",
        source: input.source || "manual",
        lines: {
          create: input.lines.map((line) => ({
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

    return {
      id: invoice.id,
      tenantId: invoice.tenantId,
      clientCompanyId: invoice.clientCompanyId,
      externalId: invoice.externalId,
      type: invoice.type as any,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency,
      taxAmount: Number(invoice.taxAmount),
      netAmount: invoice.netAmount ? Number(invoice.netAmount) : null,
      counterpartyName: invoice.counterpartyName,
      counterpartyTaxNumber: invoice.counterpartyTaxNumber,
      status: invoice.status as any,
      source: invoice.source as any,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  async updateInvoice(
    tenantId: string,
    id: string,
    input: UpdateInvoiceInput
  ): Promise<Invoice> {
    const existing = await prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError("Fatura bulunamadı.");
    }

    // Prevent editing if status is locked
    if (LOCKED_STATUSES.includes(existing.status as InvoiceStatus)) {
      throw new ValidationError("Bu fatura durumu nedeniyle düzenlenemez.");
    }

    // If updating lines, validate totals
    if (input.lines && input.totalAmount !== undefined) {
      const lineTotalSum = input.lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const tolerance = 0.01;
      if (Math.abs(lineTotalSum - input.totalAmount) > tolerance) {
        throw new ValidationError(
          `Fatura satırları toplamı (${lineTotalSum}) ile fatura toplamı (${input.totalAmount}) eşleşmiyor.`
        );
      }
    }

    // Update invoice and lines in transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // Delete existing lines if new lines provided
      if (input.lines) {
        await tx.invoiceLine.deleteMany({
          where: { invoiceId: id },
        });
      }

      // Update invoice
      const updated = await tx.invoice.update({
        where: { id },
        data: {
          externalId: input.externalId,
          type: input.type,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          totalAmount: input.totalAmount,
          currency: input.currency,
          taxAmount: input.taxAmount,
          netAmount: input.netAmount,
          counterpartyName: input.counterpartyName,
          counterpartyTaxNumber: input.counterpartyTaxNumber,
          status: input.status,
          ...(input.lines && {
            lines: {
              create: input.lines.map((line) => ({
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
          }),
        },
      });

      return updated;
    });

    return {
      id: invoice.id,
      tenantId: invoice.tenantId,
      clientCompanyId: invoice.clientCompanyId,
      externalId: invoice.externalId,
      type: invoice.type as any,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency,
      taxAmount: Number(invoice.taxAmount),
      netAmount: invoice.netAmount ? Number(invoice.netAmount) : null,
      counterpartyName: invoice.counterpartyName,
      counterpartyTaxNumber: invoice.counterpartyTaxNumber,
      status: invoice.status as any,
      source: invoice.source as any,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  async updateInvoiceStatus(
    tenantId: string,
    id: string,
    status: InvoiceStatus
  ): Promise<Invoice> {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new NotFoundError("Fatura bulunamadı.");
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      clientCompanyId: updated.clientCompanyId,
      externalId: updated.externalId,
      type: updated.type as any,
      issueDate: updated.issueDate,
      dueDate: updated.dueDate,
      totalAmount: Number(updated.totalAmount),
      currency: updated.currency,
      taxAmount: Number(updated.taxAmount),
      netAmount: updated.netAmount ? Number(updated.netAmount) : null,
      counterpartyName: updated.counterpartyName,
      counterpartyTaxNumber: updated.counterpartyTaxNumber,
      status: updated.status as any,
      source: updated.source as any,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteInvoice(tenantId: string, id: string): Promise<void> {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new NotFoundError("Fatura bulunamadı.");
    }

    // Only allow deletion if not locked
    if (LOCKED_STATUSES.includes(invoice.status as InvoiceStatus)) {
      throw new ValidationError("Bu fatura durumu nedeniyle silinemez.");
    }

    await prisma.invoice.delete({
      where: { id },
    });
  }
}

export const invoiceService = new InvoiceService();

