import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";

// Valid status transitions for çek/senet
const STATUS_TRANSITIONS: Record<string, string[]> = {
  portfoyde: ["tahsile_verildi", "ciro_edildi", "iade_edildi"],
  tahsile_verildi: ["tahsil_edildi", "karsiligi_yok", "iade_edildi"],
  tahsil_edildi: [],
  karsiligi_yok: ["portfoyde"],
  iade_edildi: ["portfoyde"],
  ciro_edildi: [],
};

export class CheckNoteService {
  /**
   * List check/notes with pagination and filters
   */
  async list(
    tenantId: string,
    params: {
      page?: number;
      pageSize?: number;
      type?: string;
      direction?: string;
      status?: string;
      clientCompanyId?: string;
      dueDateStart?: string;
      dueDateEnd?: string;
    }
  ) {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const where: any = { tenantId };
    if (params.type) where.type = params.type;
    if (params.direction) where.direction = params.direction;
    if (params.status) where.status = params.status;
    if (params.clientCompanyId) where.clientCompanyId = params.clientCompanyId;
    if (params.dueDateStart || params.dueDateEnd) {
      where.dueDate = {};
      if (params.dueDateStart) where.dueDate.gte = new Date(params.dueDateStart);
      if (params.dueDateEnd) where.dueDate.lte = new Date(params.dueDateEnd);
    }

    const [items, total] = await Promise.all([
      prisma.checkNote.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { dueDate: "asc" },
        include: { clientCompany: { select: { id: true, name: true } } },
      }),
      prisma.checkNote.count({ where }),
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
    const item = await prisma.checkNote.findFirst({
      where: { id, tenantId },
      include: { clientCompany: { select: { id: true, name: true, taxNumber: true } } },
    });
    if (!item) throw new NotFoundError("Çek/senet bulunamadı.");
    return item;
  }

  /**
   * Create check/note
   */
  async create(
    tenantId: string,
    data: {
      clientCompanyId?: string;
      type: string;
      direction: string;
      documentNumber: string;
      issuer?: string;
      bankName?: string;
      branchName?: string;
      amount: number;
      currency?: string;
      issueDate: string;
      dueDate: string;
      notes?: string;
    }
  ) {
    if (data.clientCompanyId) {
      const company = await prisma.clientCompany.findFirst({
        where: { id: data.clientCompanyId, tenantId },
      });
      if (!company) throw new ValidationError("Müşteri şirket bulunamadı.");
    }

    const item = await prisma.checkNote.create({
      data: {
        tenantId,
        clientCompanyId: data.clientCompanyId,
        type: data.type,
        direction: data.direction,
        documentNumber: data.documentNumber,
        issuer: data.issuer,
        bankName: data.bankName,
        branchName: data.branchName,
        amount: data.amount,
        currency: data.currency || "TRY",
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        status: "portfoyde",
        notes: data.notes,
      },
      include: { clientCompany: { select: { id: true, name: true } } },
    });

    logger.info(`Check/note created: ${item.id} (${data.type}) for tenant ${tenantId}`);
    return item;
  }

  /**
   * Update check/note
   */
  async update(tenantId: string, id: string, data: Record<string, any>) {
    const existing = await prisma.checkNote.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Çek/senet bulunamadı.");

    const updateData: any = {};
    if (data.documentNumber !== undefined) updateData.documentNumber = data.documentNumber;
    if (data.issuer !== undefined) updateData.issuer = data.issuer;
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.branchName !== undefined) updateData.branchName = data.branchName;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.issueDate !== undefined) updateData.issueDate = new Date(data.issueDate);
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.notes !== undefined) updateData.notes = data.notes;

    return prisma.checkNote.update({
      where: { id },
      data: updateData,
      include: { clientCompany: { select: { id: true, name: true } } },
    });
  }

  /**
   * Delete check/note
   */
  async delete(tenantId: string, id: string) {
    const existing = await prisma.checkNote.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Çek/senet bulunamadı.");
    await prisma.checkNote.delete({ where: { id } });
  }

  /**
   * Update status with validation
   */
  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: string,
    metadata?: { endorsedTo?: string; collectedDate?: string; bouncedDate?: string }
  ) {
    const existing = await prisma.checkNote.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Çek/senet bulunamadı.");

    const allowedTransitions = STATUS_TRANSITIONS[existing.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new ValidationError(
        `'${existing.status}' durumundan '${newStatus}' durumuna geçiş yapılamaz. İzin verilen: ${allowedTransitions.join(", ") || "yok"}`
      );
    }

    const updateData: any = { status: newStatus };

    if (newStatus === "tahsil_edildi") {
      updateData.collectedDate = metadata?.collectedDate ? new Date(metadata.collectedDate) : new Date();
    }
    if (newStatus === "karsiligi_yok") {
      updateData.bouncedDate = metadata?.bouncedDate ? new Date(metadata.bouncedDate) : new Date();
    }
    if (newStatus === "ciro_edildi" && metadata?.endorsedTo) {
      updateData.endorsedTo = metadata.endorsedTo;
      updateData.endorsedDate = new Date();
    }

    const updated = await prisma.checkNote.update({
      where: { id },
      data: updateData,
      include: { clientCompany: { select: { id: true, name: true } } },
    });

    logger.info(`Check/note ${id} status changed: ${existing.status} -> ${newStatus}`);
    return updated;
  }

  /**
   * Endorse check to someone
   */
  async endorse(tenantId: string, id: string, endorsedTo: string) {
    return this.updateStatus(tenantId, id, "ciro_edildi", { endorsedTo });
  }

  /**
   * Dashboard stats
   */
  async getDashboardStats(tenantId: string) {
    const now = new Date();

    const [
      totalInPortfolio,
      totalCollected,
      totalBounced,
      receivableSum,
      payableSum,
      overdueCount,
    ] = await Promise.all([
      prisma.checkNote.count({ where: { tenantId, status: "portfoyde" } }),
      prisma.checkNote.count({ where: { tenantId, status: "tahsil_edildi" } }),
      prisma.checkNote.count({ where: { tenantId, status: "karsiligi_yok" } }),
      prisma.checkNote.aggregate({
        where: { tenantId, direction: "ALACAK", status: { in: ["portfoyde", "tahsile_verildi"] } },
        _sum: { amount: true },
      }),
      prisma.checkNote.aggregate({
        where: { tenantId, direction: "BORC", status: { in: ["portfoyde", "tahsile_verildi"] } },
        _sum: { amount: true },
      }),
      prisma.checkNote.count({
        where: { tenantId, dueDate: { lt: now }, status: { in: ["portfoyde", "tahsile_verildi"] } },
      }),
    ]);

    return {
      inPortfolio: totalInPortfolio,
      collected: totalCollected,
      bounced: totalBounced,
      overdueCount,
      totalReceivable: Number(receivableSum._sum.amount || 0),
      totalPayable: Number(payableSum._sum.amount || 0),
    };
  }

  /**
   * Get upcoming due items
   */
  async getUpcomingDue(tenantId: string, daysAhead: number = 7) {
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return prisma.checkNote.findMany({
      where: {
        tenantId,
        dueDate: { gte: now, lte: future },
        status: { in: ["portfoyde", "tahsile_verildi"] },
      },
      orderBy: { dueDate: "asc" },
      include: { clientCompany: { select: { id: true, name: true } } },
    });
  }

  /**
   * Get overdue items
   */
  async getOverdue(tenantId: string) {
    return prisma.checkNote.findMany({
      where: {
        tenantId,
        dueDate: { lt: new Date() },
        status: { in: ["portfoyde", "tahsile_verildi"] },
      },
      orderBy: { dueDate: "asc" },
      include: { clientCompany: { select: { id: true, name: true } } },
    });
  }
}

export const checkNoteService = new CheckNoteService();
