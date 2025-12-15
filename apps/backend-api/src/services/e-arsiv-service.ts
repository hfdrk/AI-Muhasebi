import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/core-domain";
import { logger } from "@repo/shared-utils";

/**
 * E-Arşiv (Electronic Archive) Service
 * 
 * Handles electronic archiving of invoices per Turkish tax law requirements.
 * E-Arşiv invoices are archived invoices that don't require recipient acceptance.
 */
export interface EArsivInvoice {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: Date;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  currency: string;
  supplierVKN: string;
  customerName?: string | null;
  customerTaxNumber?: string | null;
  customerEmail?: string | null;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    vatRate: number;
    vatAmount: number;
  }>;
}

export interface EArsivArchiveResult {
  success: boolean;
  archiveId?: string;
  archiveDate?: Date;
  message?: string;
}

export interface EArsivSearchFilters {
  startDate?: Date;
  endDate?: Date;
  invoiceNumber?: string;
  customerName?: string;
  minAmount?: number;
  maxAmount?: number;
}

export class EArsivService {
  /**
   * Archive invoice to E-Arşiv system
   */
  async archiveInvoice(
    tenantId: string,
    invoiceId: string
  ): Promise<EArsivArchiveResult> {
    // Verify invoice belongs to tenant
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        lines: true,
        clientCompany: true,
      },
    });

    if (!invoice) {
      throw new NotFoundError("Fatura bulunamadı.");
    }

    // Check if already archived
    const metadata = (invoice.metadata as Record<string, unknown>) || {};
    const eArsivData = metadata.eArsiv as Record<string, unknown> | undefined;

    if (eArsivData && eArsivData.archiveId) {
      return {
        success: true,
        archiveId: eArsivData.archiveId as string,
        archiveDate: eArsivData.archiveDate ? new Date(eArsivData.archiveDate as string) : new Date(),
        message: "Fatura zaten arşivlenmiş.",
      };
    }

    // Prepare invoice data for E-Arşiv
    const eArsivInvoice: EArsivInvoice = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id}`,
      issueDate: invoice.issueDate,
      totalAmount: Number(invoice.totalAmount),
      taxAmount: Number(invoice.taxAmount || 0),
      netAmount: Number(invoice.netAmount || invoice.totalAmount - (invoice.taxAmount || 0)),
      currency: invoice.currency || "TRY",
      supplierVKN: invoice.clientCompany?.taxNumber || "",
      customerName: invoice.counterparty?.name || null,
      customerTaxNumber: invoice.counterparty?.taxNumber || null,
      customerEmail: invoice.counterparty?.email || null,
      lines: invoice.lines.map((line) => ({
        description: line.description || "",
        quantity: Number(line.quantity || 1),
        unitPrice: Number(line.unitPrice || 0),
        lineTotal: Number(line.lineTotal || 0),
        vatRate: Number(line.vatRate || 0),
        vatAmount: Number(line.vatAmount || 0),
      })),
    };

    // Generate E-Arşiv format (similar to E-Fatura but for archiving)
    const archiveId = this.generateArchiveId(eArsivInvoice);

    // Store archive record
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        metadata: {
          ...metadata,
          eArsiv: {
            archiveId,
            archiveDate: new Date(),
            status: "archived",
          },
        },
      },
    });

    // TODO: Submit to GIB E-Arşiv system via API
    // For now, we store locally and mark as archived

    logger.info(`Invoice ${invoiceId} archived to E-Arşiv with ID: ${archiveId}`);

    return {
      success: true,
      archiveId,
      archiveDate: new Date(),
      message: "Fatura E-Arşiv sistemine arşivlendi.",
    };
  }

  /**
   * Search archived invoices
   */
  async searchArchivedInvoices(
    tenantId: string,
    filters: EArsivSearchFilters
  ): Promise<Array<{
    invoiceId: string;
    invoiceNumber: string;
    issueDate: Date;
    totalAmount: number;
    customerName?: string | null;
    archiveId: string;
    archiveDate: Date;
  }>> {
    const where: any = {
      tenantId,
      metadata: {
        path: ["eArsiv", "archiveId"],
        not: null,
      },
    };

    if (filters.startDate || filters.endDate) {
      where.issueDate = {};
      if (filters.startDate) {
        where.issueDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.issueDate.lte = filters.endDate;
      }
    }

    if (filters.invoiceNumber) {
      where.invoiceNumber = {
        contains: filters.invoiceNumber,
        mode: "insensitive",
      };
    }

    if (filters.minAmount || filters.maxAmount) {
      where.totalAmount = {};
      if (filters.minAmount) {
        where.totalAmount.gte = filters.minAmount;
      }
      if (filters.maxAmount) {
        where.totalAmount.lte = filters.maxAmount;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        clientCompany: true,
        lines: true,
      },
      orderBy: {
        issueDate: "desc",
      },
    });

    return invoices.map((invoice) => {
      const metadata = (invoice.metadata as Record<string, unknown>) || {};
      const eArsivData = metadata.eArsiv as Record<string, unknown> | undefined;

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id}`,
        issueDate: invoice.issueDate,
        totalAmount: Number(invoice.totalAmount),
        customerName: invoice.counterparty?.name || null,
        archiveId: (eArsivData?.archiveId as string) || "",
        archiveDate: eArsivData?.archiveDate ? new Date(eArsivData.archiveDate as string) : invoice.issueDate,
      };
    });
  }

  /**
   * Get archived invoice details
   */
  async getArchivedInvoice(
    tenantId: string,
    invoiceId: string
  ): Promise<{
    invoiceId: string;
    invoiceNumber: string;
    archiveId: string;
    archiveDate: Date;
    invoiceData: EArsivInvoice;
  }> {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        lines: true,
        clientCompany: true,
      },
    });

    if (!invoice) {
      throw new NotFoundError("Fatura bulunamadı.");
    }

    const metadata = (invoice.metadata as Record<string, unknown>) || {};
    const eArsivData = metadata.eArsiv as Record<string, unknown> | undefined;

    if (!eArsivData || !eArsivData.archiveId) {
      throw new ValidationError("Fatura E-Arşiv sistemine arşivlenmemiş.");
    }

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id}`,
      archiveId: eArsivData.archiveId as string,
      archiveDate: eArsivData.archiveDate ? new Date(eArsivData.archiveDate as string) : invoice.issueDate,
      invoiceData: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id}`,
        issueDate: invoice.issueDate,
        totalAmount: Number(invoice.totalAmount),
        taxAmount: Number(invoice.taxAmount || 0),
        netAmount: Number(invoice.netAmount || invoice.totalAmount - (invoice.taxAmount || 0)),
        currency: invoice.currency || "TRY",
        supplierVKN: invoice.clientCompany?.taxNumber || "",
        customerName: invoice.counterparty?.name || null,
        customerTaxNumber: invoice.counterparty?.taxNumber || null,
        customerEmail: invoice.counterparty?.email || null,
        lines: invoice.lines.map((line) => ({
          description: line.description || "",
          quantity: Number(line.quantity || 1),
          unitPrice: Number(line.unitPrice || 0),
          lineTotal: Number(line.lineTotal || 0),
          vatRate: Number(line.vatRate || 0),
          vatAmount: Number(line.vatAmount || 0),
        })),
      },
    };
  }

  /**
   * Automatically archive invoices older than retention period
   */
  async autoArchiveOldInvoices(tenantId: string, retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const invoicesToArchive = await prisma.invoice.findMany({
      where: {
        tenantId,
        issueDate: {
          lte: cutoffDate,
        },
        metadata: {
          path: ["eArsiv", "archiveId"],
          equals: null,
        },
      },
    });

    let archivedCount = 0;

    for (const invoice of invoicesToArchive) {
      try {
        await this.archiveInvoice(tenantId, invoice.id);
        archivedCount++;
      } catch (error) {
        logger.error(`Failed to auto-archive invoice ${invoice.id}:`, error);
      }
    }

    return archivedCount;
  }

  /**
   * Generate unique archive ID
   */
  private generateArchiveId(invoice: EArsivInvoice): string {
    // Format: EARSIV-{VKN}-{YYYYMMDD}-{UUID}
    const dateStr = invoice.issueDate.toISOString().split("T")[0].replace(/-/g, "");
    const uuid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return `EARSIV-${invoice.supplierVKN}-${dateStr}-${uuid}`;
  }
}

export const eArsivService = new EArsivService();

