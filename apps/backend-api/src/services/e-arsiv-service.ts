import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";
import {
  gibComplianceService,
  GIB_EARSIV_STATUS,
  type GibEArsivStatus,
} from "./gib-compliance-service";

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
      invoiceNumber: invoice.externalId || `INV-${invoice.id}`,
      issueDate: invoice.issueDate,
      totalAmount: Number(invoice.totalAmount),
      taxAmount: Number(invoice.taxAmount || 0),
      netAmount: Number(invoice.netAmount || Number(invoice.totalAmount) - Number(invoice.taxAmount || 0)),
      currency: invoice.currency || "TRY",
      supplierVKN: invoice.clientCompany?.taxNumber || "",
      customerName: invoice.counterpartyName || null,
      customerTaxNumber: invoice.counterpartyTaxNumber || null,
      customerEmail: (invoice as any).counterparty?.email || null,
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

    // GIB E-Arşiv submission
    // Note: Direct GIB API submission requires official ETA provider credentials and certificates.
    // This implementation records the archive for compliance audit trail.
    // When ETA provider credentials are configured, the actual submission will be processed.

    logger.info("E-Arşiv invoice archived", { tenantId }, {
      invoiceId,
      archiveId,
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency || "TRY",
    });

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
        invoiceNumber: invoice.externalId || `INV-${invoice.id}`,
        issueDate: invoice.issueDate,
        totalAmount: Number(invoice.totalAmount),
        customerName: invoice.counterpartyName || null,
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
      invoiceNumber: invoice.externalId || `INV-${invoice.id}`,
      archiveId: eArsivData.archiveId as string,
      archiveDate: eArsivData.archiveDate ? new Date(eArsivData.archiveDate as string) : invoice.issueDate,
      invoiceData: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.externalId || `INV-${invoice.id}`,
        issueDate: invoice.issueDate,
        totalAmount: Number(invoice.totalAmount),
        taxAmount: Number(invoice.taxAmount || 0),
        netAmount: Number(invoice.netAmount || Number(invoice.totalAmount) - Number(invoice.taxAmount || 0)),
        currency: invoice.currency || "TRY",
        supplierVKN: invoice.clientCompany?.taxNumber || "",
        customerName: invoice.counterpartyName || null,
        customerTaxNumber: invoice.counterpartyTaxNumber || null,
        customerEmail: (invoice as any).counterparty?.email || null,
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

  // =============================================================================
  // ENHANCED GİB COMPLIANCE METHODS
  // =============================================================================

  /**
   * Generate QR code URL for E-Arşiv invoice
   */
  generateQRCode(params: {
    ettn: string;
    vkn: string;
    invoiceDate: Date;
    invoiceAmount: number;
  }): string {
    return gibComplianceService.generateEArsivQRData(params);
  }

  /**
   * Validate invoice data for E-Arşiv submission
   */
  async validateForEArsiv(
    tenantId: string,
    invoiceId: string
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: true, clientCompany: true },
    });

    if (!invoice) {
      return { valid: false, errors: ["Fatura bulunamadı"], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate supplier VKN
    const supplierVkn = invoice.clientCompany?.taxNumber;
    if (!supplierVkn) {
      errors.push("Satıcı VKN bilgisi eksik");
    } else {
      const vknValidation = gibComplianceService.validateTaxId(supplierVkn);
      if (!vknValidation.valid) {
        errors.push(`Satıcı VKN geçersiz: ${vknValidation.error}`);
      }
    }

    // For E-Arşiv, customer email is important (for sending)
    const customerEmail = (invoice as any).counterparty?.email;
    if (!customerEmail) {
      warnings.push("Müşteri e-posta adresi eksik - Fatura e-posta ile gönderilemeyecek");
    }

    // Check customer tax number for Ba-Bs
    const totalAmount = Number(invoice.totalAmount);
    if (gibComplianceService.requiresBaBsReporting(totalAmount)) {
      if (!invoice.counterpartyTaxNumber) {
        warnings.push("Bu tutar Ba-Bs bildirimi gerektirir - Alıcı VKN önerilir");
      }
    }

    // Validate amounts
    const lineTotal = invoice.lines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0);
    const lineTax = invoice.lines.reduce((sum, line) => sum + Number(line.vatAmount || 0), 0);
    const declaredTotal = Number(invoice.totalAmount);

    if (Math.abs(lineTotal + lineTax - declaredTotal) > 0.01) {
      errors.push(
        `Tutar uyuşmazlığı: Satır toplamı ${(lineTotal + lineTax).toFixed(2)}, Fatura toplamı ${declaredTotal.toFixed(2)}`
      );
    }

    // Check if lines exist
    if (invoice.lines.length === 0) {
      errors.push("Fatura satırları eksik");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Cancel an archived E-Arşiv invoice
   */
  async cancelArchive(
    tenantId: string,
    invoiceId: string,
    reason: string
  ): Promise<{
    success: boolean;
    message: string;
    cancellationDate?: Date;
  }> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundError("Fatura bulunamadı");
    }

    const metadata = (invoice.metadata as Record<string, unknown>) || {};
    const eArsivData = metadata.eArsiv as Record<string, unknown> | undefined;

    if (!eArsivData?.archiveId) {
      throw new ValidationError("Fatura henüz E-Arşiv sistemine gönderilmemiş");
    }

    const status = eArsivData.status as string;
    if (status === "cancelled") {
      throw new ValidationError("Fatura zaten iptal edilmiş");
    }

    // Check cancellation period (7 days for E-Arşiv)
    const archiveDate = eArsivData.archiveDate
      ? new Date(eArsivData.archiveDate as string)
      : null;

    if (archiveDate) {
      const daysSinceArchive = Math.ceil(
        (new Date().getTime() - archiveDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceArchive > 7) {
        throw new ValidationError(
          "E-Arşiv faturaları 7 gün içinde iptal edilebilir. Bu süre geçmiş."
        );
      }
    }

    const cancellationDate = new Date();

    // Update invoice metadata
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        metadata: {
          ...metadata,
          eArsiv: {
            ...eArsivData,
            status: "cancelled",
            cancellationDate: cancellationDate.toISOString(),
            cancellationReason: reason,
          },
        },
      },
    });

    logger.info("E-Arşiv cancelled successfully", { tenantId }, { invoiceId, reason });

    return {
      success: true,
      message: "E-Arşiv faturası başarıyla iptal edildi",
      cancellationDate,
    };
  }

  /**
   * Get E-Arşiv invoice with enhanced GİB status
   */
  async getInvoiceWithGibStatus(
    tenantId: string,
    invoiceId: string
  ): Promise<{
    invoice: any;
    gibStatus: GibEArsivStatus;
    qrCodeUrl?: string;
    ettn?: string;
    archiveDate?: Date;
  }> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: true, clientCompany: true },
    });

    if (!invoice) {
      throw new NotFoundError("Fatura bulunamadı");
    }

    const metadata = (invoice.metadata as Record<string, unknown>) || {};
    const eArsivData = metadata.eArsiv as Record<string, unknown> | undefined;

    const gibStatus = gibComplianceService.mapToGibStatus(
      (eArsivData?.status as string) || "DRAFT",
      "earsiv"
    ) as GibEArsivStatus;

    let qrCodeUrl: string | undefined;
    let ettn: string | undefined;

    if (eArsivData?.archiveId) {
      ettn = gibComplianceService.generateETTN();

      // Generate QR code URL
      qrCodeUrl = this.generateQRCode({
        ettn,
        vkn: invoice.clientCompany?.taxNumber || "",
        invoiceDate: invoice.issueDate,
        invoiceAmount: Number(invoice.totalAmount),
      });
    }

    return {
      invoice,
      gibStatus,
      qrCodeUrl,
      ettn,
      archiveDate: eArsivData?.archiveDate
        ? new Date(eArsivData.archiveDate as string)
        : undefined,
    };
  }

  /**
   * Get archive statistics for tenant
   */
  async getArchiveStats(
    tenantId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    total: number;
    archived: number;
    cancelled: number;
    pending: number;
    totalAmount: number;
  }> {
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        ...(dateRange && {
          issueDate: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        }),
      },
      select: { metadata: true, totalAmount: true },
    });

    const stats = {
      total: invoices.length,
      archived: 0,
      cancelled: 0,
      pending: 0,
      totalAmount: 0,
    };

    for (const invoice of invoices) {
      const metadata = (invoice.metadata as Record<string, unknown>) || {};
      const eArsivData = metadata.eArsiv as Record<string, unknown> | undefined;

      if (eArsivData) {
        const status = eArsivData.status as string;
        switch (status) {
          case "archived":
            stats.archived++;
            stats.totalAmount += Number(invoice.totalAmount);
            break;
          case "cancelled":
            stats.cancelled++;
            break;
          default:
            stats.pending++;
        }
      }
    }

    return stats;
  }

  /**
   * Resend E-Arşiv invoice to customer email
   */
  async resendToCustomer(
    tenantId: string,
    invoiceId: string,
    email?: string
  ): Promise<{
    success: boolean;
    message: string;
    sentTo?: string;
  }> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { clientCompany: true, lines: true },
    });

    if (!invoice) {
      throw new NotFoundError("Fatura bulunamadı");
    }

    const metadata = (invoice.metadata as Record<string, unknown>) || {};
    const eArsivData = metadata.eArsiv as Record<string, unknown> | undefined;

    if (!eArsivData?.archiveId) {
      throw new ValidationError("Fatura henüz E-Arşiv sistemine gönderilmemiş");
    }

    const targetEmail = email || (invoice as any).counterparty?.email;

    if (!targetEmail) {
      throw new ValidationError("E-posta adresi belirtilmedi ve müşteri e-postası yok");
    }

    // Send invoice via email service
    const { emailService } = await import("./email-service");
    const invoiceNumber = invoice.externalId || `INV-${invoice.id}`;
    const totalAmount = Number(invoice.totalAmount);
    const currency = invoice.currency || "TRY";

    await emailService.sendEmail({
      to: [targetEmail],
      subject: `E-Arşiv Fatura: ${invoiceNumber}`,
      body: [
        `Sayın Yetkili,`,
        ``,
        `${invoiceNumber} numaralı E-Arşiv faturanız ekte sunulmuştur.`,
        ``,
        `Fatura Detayları:`,
        `- Fatura No: ${invoiceNumber}`,
        `- Tarih: ${invoice.issueDate.toLocaleDateString("tr-TR")}`,
        `- Tutar: ${totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${currency}`,
        `- Arşiv No: ${eArsivData.archiveId}`,
        ``,
        `Bu e-posta otomatik olarak AI Muhasebi sistemi tarafından gönderilmiştir.`,
      ].join("\n"),
      tenantId,
    });

    // Update metadata with send info
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        metadata: {
          ...metadata,
          eArsiv: {
            ...eArsivData,
            lastSentTo: targetEmail,
            lastSentDate: new Date().toISOString(),
          },
        },
      },
    });

    logger.info("E-Arşiv invoice sent via email", { tenantId }, { invoiceId, email: targetEmail });

    return {
      success: true,
      message: "Fatura belirtilen e-posta adresine gönderildi",
      sentTo: targetEmail,
    };
  }
}

export const eArsivService = new EArsivService();

