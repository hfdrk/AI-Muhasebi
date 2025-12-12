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
import { riskAlertService } from "./risk-alert-service";
import { counterpartyAnalysisService } from "./counterparty-analysis-service";

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
        metadata: item.metadata || {},
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

    // Check for invoice-level duplicates after creation
    if (invoice.externalId) {
      try {
        const duplicates = await this.checkInvoiceLevelDuplicates(tenantId, invoice.id);
        if (duplicates.length > 0) {
          await riskAlertService.createAlert({
            tenantId,
            clientCompanyId: invoice.clientCompanyId,
            documentId: null,
            type: "INVOICE_DUPLICATE",
            title: "Yinelenen Fatura Tespit Edildi",
            message: `Fatura numarası ${invoice.externalId} ile aynı numara, tutar ve tarihe sahip ${duplicates.length} fatura daha bulundu.`,
            severity: "high",
            status: "open",
          });
        }
      } catch (error) {
        // Don't fail invoice creation if duplicate check fails
        console.error("[InvoiceService] Error checking for duplicates:", error);
      }
    }

    // Check for unusual counterparty
    if (invoice.counterpartyName) {
      try {
        await counterpartyAnalysisService.checkAndAlertUnusualCounterparty(
          tenantId,
          invoice.clientCompanyId,
          invoice.counterpartyName,
          invoice.counterpartyTaxNumber,
          Number(invoice.totalAmount),
          invoice.issueDate,
          invoice.id
        );
      } catch (error) {
        // Don't fail invoice creation if counterparty check fails
        console.error("[InvoiceService] Error checking for unusual counterparty:", error);
      }
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

    // Check for invoice-level duplicates after update
    if (invoice.externalId) {
      try {
        const duplicates = await this.checkInvoiceLevelDuplicates(tenantId, invoice.id);
        if (duplicates.length > 0) {
          await riskAlertService.createAlert({
            tenantId,
            clientCompanyId: invoice.clientCompanyId,
            documentId: null,
            type: "INVOICE_DUPLICATE",
            title: "Yinelenen Fatura Tespit Edildi",
            message: `Fatura numarası ${invoice.externalId} ile aynı numara, tutar ve tarihe sahip ${duplicates.length} fatura daha bulundu.`,
            severity: "high",
            status: "open",
          });
        }
      } catch (error) {
        // Don't fail invoice update if duplicate check fails
        console.error("[InvoiceService] Error checking for duplicates:", error);
      }
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

  /**
   * Check for invoice-level duplicates
   * Detects invoices with the same invoice number + amount + date combination
   */
  async checkInvoiceLevelDuplicates(
    tenantId: string,
    invoiceId: string
  ): Promise<Array<{ invoiceId: string; invoiceNumber: string; issueDate: Date; totalAmount: number }>> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice || !invoice.externalId) {
      return [];
    }

    // Find invoices with same externalId (invoice number), amount, and date
    // Allow small tolerance for amount (0.01) due to rounding differences
    const duplicates = await prisma.invoice.findMany({
      where: {
        tenantId,
        id: { not: invoiceId },
        externalId: invoice.externalId,
        issueDate: invoice.issueDate,
        totalAmount: {
          gte: invoice.totalAmount - 0.01,
          lte: invoice.totalAmount + 0.01,
        },
      },
      select: {
        id: true,
        externalId: true,
        issueDate: true,
        totalAmount: true,
      },
    });

    return duplicates.map((dup) => ({
      invoiceId: dup.id,
      invoiceNumber: dup.externalId,
      issueDate: dup.issueDate,
      totalAmount: Number(dup.totalAmount),
    }));
  }

  /**
   * Check for similar invoices (fuzzy matching)
   * Detects invoices with similar invoice numbers, amounts, and dates
   */
  async checkSimilarInvoices(
    tenantId: string,
    invoiceId: string,
    similarityThreshold: number = 0.8
  ): Promise<Array<{ invoiceId: string; invoiceNumber: string; similarity: number }>> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice || !invoice.externalId) {
      return [];
    }

    // Get all invoices for the tenant
    const allInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        id: { not: invoiceId },
      },
      select: {
        id: true,
        externalId: true,
        totalAmount: true,
        issueDate: true,
      },
    });

    const similar: Array<{ invoiceId: string; invoiceNumber: string; similarity: number }> = [];

    for (const otherInvoice of allInvoices) {
      if (!otherInvoice.externalId) continue;

      // Calculate similarity score
      let similarity = 0;
      let factors = 0;

      // Invoice number similarity (simple string similarity)
      if (invoice.externalId && otherInvoice.externalId) {
        const similarityScore = this.calculateStringSimilarity(
          invoice.externalId,
          otherInvoice.externalId
        );
        similarity += similarityScore * 0.5; // 50% weight
        factors += 0.5;
      }

      // Amount similarity (within 10% = high similarity)
      const amountDiff = Math.abs(Number(invoice.totalAmount) - Number(otherInvoice.totalAmount));
      const amountSimilarity = Math.max(0, 1 - amountDiff / Number(invoice.totalAmount) / 0.1);
      similarity += amountSimilarity * 0.3; // 30% weight
      factors += 0.3;

      // Date similarity (same month = high similarity)
      const dateDiff = Math.abs(
        invoice.issueDate.getTime() - otherInvoice.issueDate.getTime()
      );
      const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
      const dateSimilarity = daysDiff <= 30 ? 1 - daysDiff / 30 : 0;
      similarity += dateSimilarity * 0.2; // 20% weight
      factors += 0.2;

      const finalSimilarity = factors > 0 ? similarity / factors : 0;

      if (finalSimilarity >= similarityThreshold) {
        similar.push({
          invoiceId: otherInvoice.id,
          invoiceNumber: otherInvoice.externalId,
          similarity: finalSimilarity,
        });
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate simple string similarity (Levenshtein distance based)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export const invoiceService = new InvoiceService();

