import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";

export class RecurringInvoiceService {
  /**
   * List recurring invoices with pagination and filters
   */
  async list(
    tenantId: string,
    params: {
      page?: number;
      pageSize?: number;
      clientCompanyId?: string;
      frequency?: string;
      isActive?: boolean;
    }
  ) {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const where: any = { tenantId };
    if (params.clientCompanyId) where.clientCompanyId = params.clientCompanyId;
    if (params.frequency) where.frequency = params.frequency;
    if (params.isActive !== undefined) where.isActive = params.isActive;

    const [items, total] = await Promise.all([
      prisma.recurringInvoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nextRunDate: "asc" },
        include: { clientCompany: { select: { id: true, name: true } } },
      }),
      prisma.recurringInvoice.count({ where }),
    ]);

    return {
      data: items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Get single recurring invoice
   */
  async getById(tenantId: string, id: string) {
    const item = await prisma.recurringInvoice.findFirst({
      where: { id, tenantId },
      include: { clientCompany: { select: { id: true, name: true, taxNumber: true } } },
    });
    if (!item) throw new NotFoundError("Tekrarlayan fatura bulunamadı.");
    return item;
  }

  /**
   * Create a new recurring invoice template
   */
  async create(
    tenantId: string,
    data: {
      clientCompanyId: string;
      templateName: string;
      type: string;
      frequency: string;
      dayOfMonth?: number;
      startDate: string;
      endDate?: string;
      totalAmount: number;
      currency?: string;
      taxAmount: number;
      counterpartyName?: string;
      counterpartyTaxNo?: string;
      lineItems: any[];
      autoSend?: boolean;
      notes?: string;
    }
  ) {
    // Validate client company
    const company = await prisma.clientCompany.findFirst({
      where: { id: data.clientCompanyId, tenantId },
    });
    if (!company) throw new ValidationError("Müşteri şirket bulunamadı.");

    const startDate = new Date(data.startDate);
    const nextRunDate = this.calculateNextRunDate(data.frequency, startDate, data.dayOfMonth);

    const item = await prisma.recurringInvoice.create({
      data: {
        tenantId,
        clientCompanyId: data.clientCompanyId,
        templateName: data.templateName,
        type: data.type,
        frequency: data.frequency,
        dayOfMonth: data.dayOfMonth,
        startDate,
        endDate: data.endDate ? new Date(data.endDate) : null,
        nextRunDate,
        totalAmount: data.totalAmount,
        currency: data.currency || "TRY",
        taxAmount: data.taxAmount,
        counterpartyName: data.counterpartyName || company.name,
        counterpartyTaxNo: data.counterpartyTaxNo || company.taxNumber,
        lineItems: data.lineItems as any,
        autoSend: data.autoSend || false,
        notes: data.notes,
      },
      include: { clientCompany: { select: { id: true, name: true } } },
    });

    logger.info(`Recurring invoice created: ${item.id} for tenant ${tenantId}`);
    return item;
  }

  /**
   * Update recurring invoice
   */
  async update(tenantId: string, id: string, data: Record<string, any>) {
    const existing = await prisma.recurringInvoice.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Tekrarlayan fatura bulunamadı.");

    const updateData: any = {};
    if (data.templateName !== undefined) updateData.templateName = data.templateName;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.taxAmount !== undefined) updateData.taxAmount = data.taxAmount;
    if (data.counterpartyName !== undefined) updateData.counterpartyName = data.counterpartyName;
    if (data.counterpartyTaxNo !== undefined) updateData.counterpartyTaxNo = data.counterpartyTaxNo;
    if (data.lineItems !== undefined) updateData.lineItems = data.lineItems;
    if (data.autoSend !== undefined) updateData.autoSend = data.autoSend;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Recalculate next run date if frequency changed
    if (data.frequency || data.startDate) {
      const freq = data.frequency || existing.frequency;
      const from = data.startDate ? new Date(data.startDate) : existing.startDate;
      const dom = data.dayOfMonth !== undefined ? data.dayOfMonth : existing.dayOfMonth;
      updateData.nextRunDate = this.calculateNextRunDate(freq, from, dom ?? undefined);
    }

    return prisma.recurringInvoice.update({
      where: { id },
      data: updateData,
      include: { clientCompany: { select: { id: true, name: true } } },
    });
  }

  /**
   * Soft delete
   */
  async delete(tenantId: string, id: string) {
    const existing = await prisma.recurringInvoice.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Tekrarlayan fatura bulunamadı.");
    await prisma.recurringInvoice.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * Toggle active status
   */
  async toggleActive(tenantId: string, id: string) {
    const existing = await prisma.recurringInvoice.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Tekrarlayan fatura bulunamadı.");
    return prisma.recurringInvoice.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
  }

  /**
   * Generate invoices from due recurring templates
   */
  async generateDueInvoices(tenantId?: string) {
    const now = new Date();
    const where: any = { isActive: true, nextRunDate: { lte: now } };
    if (tenantId) where.tenantId = tenantId;

    const dueTemplates = await prisma.recurringInvoice.findMany({
      where,
      include: { clientCompany: { select: { id: true, name: true, taxNumber: true } } },
    });

    let generated = 0;
    const errors: string[] = [];

    for (const template of dueTemplates) {
      try {
        // Check end date
        if (template.endDate && template.endDate < now) {
          await prisma.recurringInvoice.update({
            where: { id: template.id },
            data: { isActive: false },
          });
          continue;
        }

        const lineItems = (template.lineItems as any[]) || [];

        // Create invoice
        const invoice = await prisma.invoice.create({
          data: {
            tenantId: template.tenantId,
            clientCompanyId: template.clientCompanyId,
            type: template.type,
            issueDate: now,
            dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 days
            totalAmount: template.totalAmount,
            currency: template.currency,
            taxAmount: template.taxAmount,
            netAmount: Number(template.totalAmount) - Number(template.taxAmount),
            counterpartyName: template.counterpartyName,
            counterpartyTaxNumber: template.counterpartyTaxNo,
            status: "kesildi",
            source: "recurring",
            metadata: { recurringInvoiceId: template.id } as any,
          },
        });

        // Create invoice lines
        if (lineItems.length > 0) {
          await prisma.invoiceLine.createMany({
            data: lineItems.map((line: any, idx: number) => ({
              tenantId: template.tenantId,
              invoiceId: invoice.id,
              lineNumber: idx + 1,
              description: line.description || "",
              quantity: line.quantity || 1,
              unitPrice: line.unitPrice || 0,
              lineTotal: line.lineTotal || 0,
              vatRate: line.vatRate || 0,
              vatAmount: line.vatAmount || 0,
            })),
          });
        }

        // Update template
        const nextRunDate = this.calculateNextRunDate(
          template.frequency,
          now,
          template.dayOfMonth ?? undefined
        );

        await prisma.recurringInvoice.update({
          where: { id: template.id },
          data: {
            lastRunDate: now,
            nextRunDate,
            generatedCount: { increment: 1 },
          },
        });

        generated++;
        logger.info(`Generated invoice ${invoice.id} from recurring template ${template.id}`);
      } catch (error) {
        const msg = `Şablon ${template.id} için fatura oluşturulamadı: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(msg);
        logger.error(msg);
      }
    }

    return { generated, errors, total: dueTemplates.length };
  }

  /**
   * Dashboard stats
   */
  async getDashboardStats(tenantId: string) {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [activeCount, totalGenerated, upcomingThisWeek] = await Promise.all([
      prisma.recurringInvoice.count({ where: { tenantId, isActive: true } }),
      prisma.recurringInvoice.aggregate({
        where: { tenantId },
        _sum: { generatedCount: true },
      }),
      prisma.recurringInvoice.count({
        where: { tenantId, isActive: true, nextRunDate: { lte: nextWeek } },
      }),
    ]);

    return {
      activeTemplates: activeCount,
      totalGenerated: totalGenerated._sum.generatedCount || 0,
      upcomingThisWeek,
    };
  }

  /**
   * Calculate next run date based on frequency
   */
  private calculateNextRunDate(frequency: string, fromDate: Date, dayOfMonth?: number): Date {
    const next = new Date(fromDate);

    switch (frequency) {
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        if (dayOfMonth) {
          const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
          next.setDate(Math.min(dayOfMonth, maxDay));
        }
        break;
      case "quarterly":
        next.setMonth(next.getMonth() + 3);
        if (dayOfMonth) {
          const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
          next.setDate(Math.min(dayOfMonth, maxDay));
        }
        break;
      case "yearly":
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }

    return next;
  }
}

export const recurringInvoiceService = new RecurringInvoiceService();
