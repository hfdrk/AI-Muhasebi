import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";

export class PaymentReminderService {
  /**
   * List reminders with filters
   */
  async list(
    tenantId: string,
    params: {
      page?: number;
      pageSize?: number;
      type?: string;
      isPaid?: boolean;
      upcoming?: boolean;
      overdue?: boolean;
    }
  ) {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const now = new Date();
    const where: any = { tenantId };
    if (params.type) where.type = params.type;
    if (params.isPaid !== undefined) where.isPaid = params.isPaid;
    if (params.upcoming) {
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.dueDate = { gte: now, lte: nextWeek };
      where.isPaid = false;
    }
    if (params.overdue) {
      where.dueDate = { lt: now };
      where.isPaid = false;
    }

    const [items, total] = await Promise.all([
      prisma.paymentReminder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { dueDate: "asc" },
        include: {
          clientCompany: { select: { id: true, name: true } },
          invoice: { select: { id: true, externalId: true, totalAmount: true } },
        },
      }),
      prisma.paymentReminder.count({ where }),
    ]);

    return {
      data: items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Get by ID
   */
  async getById(tenantId: string, id: string) {
    const item = await prisma.paymentReminder.findFirst({
      where: { id, tenantId },
      include: {
        clientCompany: { select: { id: true, name: true } },
        invoice: { select: { id: true, externalId: true, totalAmount: true, dueDate: true } },
      },
    });
    if (!item) throw new NotFoundError("Hatırlatma bulunamadı.");
    return item;
  }

  /**
   * Create reminder
   */
  async create(
    tenantId: string,
    data: {
      clientCompanyId?: string;
      invoiceId?: string;
      checkNoteId?: string;
      type: string;
      dueDate: string;
      amount: number;
      currency?: string;
      description: string;
      reminderDaysBefore?: number;
    }
  ) {
    return prisma.paymentReminder.create({
      data: {
        tenantId,
        clientCompanyId: data.clientCompanyId,
        invoiceId: data.invoiceId,
        checkNoteId: data.checkNoteId,
        type: data.type,
        dueDate: new Date(data.dueDate),
        amount: data.amount,
        currency: data.currency || "TRY",
        description: data.description,
        reminderDaysBefore: data.reminderDaysBefore || 3,
      },
      include: {
        clientCompany: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Update reminder
   */
  async update(tenantId: string, id: string, data: Record<string, any>) {
    const existing = await prisma.paymentReminder.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Hatırlatma bulunamadı.");

    const updateData: any = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.reminderDaysBefore !== undefined) updateData.reminderDaysBefore = data.reminderDaysBefore;

    return prisma.paymentReminder.update({ where: { id }, data: updateData });
  }

  /**
   * Delete
   */
  async delete(tenantId: string, id: string) {
    const existing = await prisma.paymentReminder.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Hatırlatma bulunamadı.");
    await prisma.paymentReminder.delete({ where: { id } });
  }

  /**
   * Mark as paid
   */
  async markAsPaid(tenantId: string, id: string) {
    const existing = await prisma.paymentReminder.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Hatırlatma bulunamadı.");
    if (existing.isPaid) throw new ValidationError("Bu hatırlatma zaten ödendi olarak işaretli.");

    return prisma.paymentReminder.update({
      where: { id },
      data: { isPaid: true, paidAt: new Date() },
    });
  }

  /**
   * Auto-sync reminders from unpaid invoices and checks
   */
  async syncReminders(tenantId: string) {
    let created = 0;
    let updated = 0;

    // Sync from unpaid invoices
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ["kesildi", "taslak"] },
        dueDate: { not: null },
      },
      select: { id: true, type: true, totalAmount: true, dueDate: true, clientCompanyId: true, counterpartyName: true },
    });

    for (const inv of unpaidInvoices) {
      if (!inv.dueDate) continue;

      const existing = await prisma.paymentReminder.findFirst({
        where: { tenantId, invoiceId: inv.id },
      });

      if (existing) {
        // Update if amount or date changed
        if (Number(existing.amount) !== Number(inv.totalAmount) || existing.dueDate.getTime() !== inv.dueDate.getTime()) {
          await prisma.paymentReminder.update({
            where: { id: existing.id },
            data: { amount: inv.totalAmount, dueDate: inv.dueDate },
          });
          updated++;
        }
        continue;
      }

      const type = inv.type === "SATIŞ" ? "TAHSILAT" : "ODEME";
      await prisma.paymentReminder.create({
        data: {
          tenantId,
          clientCompanyId: inv.clientCompanyId,
          invoiceId: inv.id,
          type,
          dueDate: inv.dueDate,
          amount: inv.totalAmount,
          description: `${type === "TAHSILAT" ? "Tahsilat" : "Ödeme"}: ${inv.counterpartyName || "Fatura"} - ${inv.id.slice(-8)}`,
          reminderDaysBefore: 3,
        },
      });
      created++;
    }

    // Sync from checks/notes in portfolio
    const pendingChecks = await prisma.checkNote.findMany({
      where: {
        tenantId,
        status: { in: ["portfoyde", "tahsile_verildi"] },
      },
      select: { id: true, direction: true, amount: true, dueDate: true, clientCompanyId: true, documentNumber: true, type: true },
    });

    for (const cn of pendingChecks) {
      const existing = await prisma.paymentReminder.findFirst({
        where: { tenantId, checkNoteId: cn.id },
      });
      if (existing) continue;

      const type = cn.direction === "ALACAK"
        ? (cn.type === "CEK" ? "CEK_VADESI" : "SENET_VADESI")
        : (cn.type === "CEK" ? "CEK_VADESI" : "SENET_VADESI");

      await prisma.paymentReminder.create({
        data: {
          tenantId,
          clientCompanyId: cn.clientCompanyId,
          checkNoteId: cn.id,
          type,
          dueDate: cn.dueDate,
          amount: cn.amount,
          description: `${cn.type === "CEK" ? "Çek" : "Senet"} vadesi: ${cn.documentNumber}`,
          reminderDaysBefore: 3,
        },
      });
      created++;
    }

    logger.info(`Synced reminders for tenant ${tenantId}: ${created} created, ${updated} updated`);
    return { created, updated };
  }

  /**
   * Get upcoming reminders
   */
  async getUpcoming(tenantId: string, daysAhead: number = 7) {
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return prisma.paymentReminder.findMany({
      where: {
        tenantId,
        isPaid: false,
        dueDate: { gte: now, lte: future },
      },
      orderBy: { dueDate: "asc" },
      include: {
        clientCompany: { select: { id: true, name: true } },
        invoice: { select: { id: true, externalId: true } },
      },
    });
  }

  /**
   * Get overdue unpaid
   */
  async getOverdue(tenantId: string) {
    return prisma.paymentReminder.findMany({
      where: {
        tenantId,
        isPaid: false,
        dueDate: { lt: new Date() },
      },
      orderBy: { dueDate: "asc" },
      include: {
        clientCompany: { select: { id: true, name: true } },
        invoice: { select: { id: true, externalId: true } },
      },
    });
  }

  /**
   * Process and send reminder notifications
   */
  async processReminders(): Promise<{ sent: number; errors: string[] }> {
    const now = new Date();
    let sent = 0;
    const errors: string[] = [];

    // Find reminders that should be sent
    const reminders = await prisma.paymentReminder.findMany({
      where: {
        reminderSent: false,
        isPaid: false,
      },
      include: {
        tenant: { select: { id: true, name: true } },
        clientCompany: { select: { name: true } },
      },
    });

    for (const reminder of reminders) {
      try {
        const reminderDate = new Date(reminder.dueDate);
        reminderDate.setDate(reminderDate.getDate() - reminder.reminderDaysBefore);

        if (reminderDate > now) continue; // Not time yet

        // Create notification
        await prisma.notification.create({
          data: {
            tenantId: reminder.tenantId,
            userId: "", // Will be filled by notification dispatch
            type: "PAYMENT_REMINDER",
            title: `Ödeme Hatırlatması: ${reminder.description}`,
            message: `${new Date(reminder.dueDate).toLocaleDateString("tr-TR")} tarihinde ${Number(reminder.amount).toLocaleString("tr-TR")} ${reminder.currency} tutarında ödeme/tahsilat vadesi dolacak.`,
            meta: {
              reminderId: reminder.id,
              type: reminder.type,
              amount: Number(reminder.amount),
              dueDate: reminder.dueDate.toISOString(),
            } as any,
          },
        });

        await prisma.paymentReminder.update({
          where: { id: reminder.id },
          data: { reminderSent: true, reminderSentAt: now },
        });

        sent++;
      } catch (error) {
        const msg = `Hatırlatma ${reminder.id} gönderilemedi: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(msg);
        logger.error(msg);
      }
    }

    logger.info(`Processed reminders: ${sent} sent, ${errors.length} errors`);
    return { sent, errors };
  }

  /**
   * Dashboard stats
   */
  async getDashboardStats(tenantId: string) {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [upcomingCount, overdueCount, upcomingAmount, overdueAmount] = await Promise.all([
      prisma.paymentReminder.count({
        where: { tenantId, isPaid: false, dueDate: { gte: now, lte: nextWeek } },
      }),
      prisma.paymentReminder.count({
        where: { tenantId, isPaid: false, dueDate: { lt: now } },
      }),
      prisma.paymentReminder.aggregate({
        where: { tenantId, isPaid: false, dueDate: { gte: now, lte: nextWeek } },
        _sum: { amount: true },
      }),
      prisma.paymentReminder.aggregate({
        where: { tenantId, isPaid: false, dueDate: { lt: now } },
        _sum: { amount: true },
      }),
    ]);

    return {
      upcomingCount,
      overdueCount,
      upcomingAmount: Number(upcomingAmount._sum.amount || 0),
      overdueAmount: Number(overdueAmount._sum.amount || 0),
    };
  }
}

export const paymentReminderService = new PaymentReminderService();
