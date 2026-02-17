import { prisma } from "../lib/prisma";
import { logger } from "@repo/shared-utils";
import { Decimal } from "@prisma/client/runtime/library";

interface GenerateFormParams {
  clientCompanyId: string;
  formType: "BA" | "BS";
  period: string; // YYYY-MM
}

interface ListFormsParams {
  clientCompanyId?: string;
  formType?: string;
  period?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

class BaBsFormService {
  /**
   * Get Ba-Bs dashboard statistics
   */
  async getDashboardStats(tenantId: string) {
    const [totalForms, draftForms, submittedForms, mismatchedForms, recentForms] =
      await Promise.all([
        prisma.baBsForm.count({ where: { tenantId } }),
        prisma.baBsForm.count({ where: { tenantId, status: "draft" } }),
        prisma.baBsForm.count({ where: { tenantId, status: "submitted" } }),
        prisma.baBsForm.count({ where: { tenantId, crossCheckStatus: "mismatched" } }),
        prisma.baBsForm.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { clientCompany: { select: { name: true } } },
        }),
      ]);

    return {
      totalForms,
      draftForms,
      submittedForms,
      mismatchedForms,
      recentForms: recentForms.map((f) => ({
        id: f.id,
        clientCompanyName: f.clientCompany.name,
        formType: f.formType,
        period: f.period,
        status: f.status,
        totalAmount: f.totalAmount,
        lineCount: f.lineCount,
        crossCheckStatus: f.crossCheckStatus,
        createdAt: f.createdAt,
      })),
    };
  }

  /**
   * Generate a Ba or Bs form from invoice data
   */
  async generateForm(tenantId: string, userId: string, params: GenerateFormParams) {
    const { clientCompanyId, formType, period } = params;

    // Check for existing form
    const existing = await prisma.baBsForm.findUnique({
      where: {
        tenantId_clientCompanyId_formType_period: {
          tenantId,
          clientCompanyId,
          formType,
          period,
        },
      },
    });

    if (existing) {
      throw new Error(`${period} dönemi için ${formType} formu zaten mevcut (ID: ${existing.id})`);
    }

    // Parse period to date range
    const [year, month] = period.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get relevant invoices for the period
    // BA = purchases (alışlar), BS = sales (satışlar)
    const invoiceType = formType === "BA" ? ["ALIŞ"] : ["SATIŞ"];

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientCompanyId,
        type: { in: invoiceType },
        issueDate: { gte: startDate, lte: endDate },
      },
    });

    // Group by counterparty tax number
    const counterpartyMap = new Map<
      string,
      { name: string; taxNumber: string; country: string; totalAmount: number; docCount: number }
    >();

    for (const inv of invoices) {
      const taxNo = inv.counterpartyTaxNumber || "UNKNOWN";
      if (!counterpartyMap.has(taxNo)) {
        counterpartyMap.set(taxNo, {
          name: inv.counterpartyName || "Bilinmeyen",
          taxNumber: taxNo,
          country: "TR",
          totalAmount: 0,
          docCount: 0,
        });
      }
      const entry = counterpartyMap.get(taxNo)!;
      entry.totalAmount += Number(inv.totalAmount);
      entry.docCount++;
    }

    // Filter: Ba-Bs only includes counterparties with total >= 5,000 TRY
    const qualifyingEntries = Array.from(counterpartyMap.values()).filter(
      (e) => e.totalAmount >= 5000
    );

    const totalAmount = qualifyingEntries.reduce((sum, e) => sum + e.totalAmount, 0);

    // Create form and lines in a transaction
    const form = await prisma.$transaction(async (tx) => {
      const createdForm = await tx.baBsForm.create({
        data: {
          tenantId,
          clientCompanyId,
          formType,
          period,
          status: "generated",
          totalAmount: new Decimal(totalAmount),
          lineCount: qualifyingEntries.length,
          crossCheckStatus: "pending",
          crossCheckErrors: [],
          generatedByUserId: userId,
        },
      });

      if (qualifyingEntries.length > 0) {
        await tx.baBsFormLine.createMany({
          data: qualifyingEntries.map((entry) => ({
            formId: createdForm.id,
            counterpartyName: entry.name,
            counterpartyTaxNumber: entry.taxNumber,
            counterpartyCountry: entry.country,
            documentCount: entry.docCount,
            totalAmount: new Decimal(entry.totalAmount),
          })),
        });
      }

      return createdForm;
    });

    logger.info("Ba-Bs form generated", undefined, {
      formId: form.id,
      formType,
      period,
      lineCount: qualifyingEntries.length,
    });

    return this.getForm(tenantId, form.id);
  }

  /**
   * List Ba-Bs forms
   */
  async listForms(tenantId: string, params: ListFormsParams) {
    const { clientCompanyId, formType, period, status, page = 1, pageSize = 20 } = params;
    const where: any = { tenantId };
    if (clientCompanyId) where.clientCompanyId = clientCompanyId;
    if (formType) where.formType = formType;
    if (period) where.period = period;
    if (status) where.status = status;

    const [forms, total] = await Promise.all([
      prisma.baBsForm.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          clientCompany: { select: { name: true } },
          _count: { select: { lines: true } },
        },
      }),
      prisma.baBsForm.count({ where }),
    ]);

    return {
      forms,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Get a single form with lines
   */
  async getForm(tenantId: string, formId: string) {
    const form = await prisma.baBsForm.findFirst({
      where: { id: formId, tenantId },
      include: {
        clientCompany: { select: { name: true, taxNumber: true } },
        lines: { orderBy: { totalAmount: "desc" } },
        generatedBy: { select: { fullName: true, email: true } },
      },
    });
    if (!form) throw new Error("Ba-Bs formu bulunamadı");
    return form;
  }

  /**
   * Update form status
   */
  async updateFormStatus(tenantId: string, formId: string, status: string, notes?: string) {
    const form = await prisma.baBsForm.findFirst({ where: { id: formId, tenantId } });
    if (!form) throw new Error("Ba-Bs formu bulunamadı");

    const updateData: any = { status };
    if (status === "submitted") {
      updateData.submittedAt = new Date();
    }
    if (notes) {
      updateData.notes = notes;
    }

    return prisma.baBsForm.update({
      where: { id: formId },
      data: updateData,
      include: { clientCompany: { select: { name: true } } },
    });
  }

  /**
   * Cross-check Ba vs Bs forms between companies
   */
  async crossCheck(tenantId: string, formId: string) {
    const form = await prisma.baBsForm.findFirst({
      where: { id: formId, tenantId },
      include: { lines: true },
    });
    if (!form) throw new Error("Ba-Bs formu bulunamadı");

    const errors: any[] = [];
    const oppositeType = form.formType === "BA" ? "BS" : "BA";

    // For each line, check if the counterparty has a matching opposite form
    for (const line of form.lines) {
      // Look for the counterparty's opposite form in the same period
      const matchingLine = await prisma.baBsFormLine.findFirst({
        where: {
          counterpartyTaxNumber: line.counterpartyTaxNumber,
          form: {
            tenantId,
            formType: oppositeType,
            period: form.period,
          },
        },
      });

      if (matchingLine) {
        const diff = Math.abs(Number(line.totalAmount) - Number(matchingLine.totalAmount));
        if (diff > 100) {
          // Allow 100 TRY tolerance
          errors.push({
            lineId: line.id,
            counterpartyName: line.counterpartyName,
            counterpartyTaxNumber: line.counterpartyTaxNumber,
            ourAmount: Number(line.totalAmount),
            theirAmount: Number(matchingLine.totalAmount),
            difference: diff,
            message: `Tutar uyumsuzluğu: ${diff.toFixed(2)} TRY fark`,
          });

          await prisma.baBsFormLine.update({
            where: { id: line.id },
            data: { crossCheckMatch: false },
          });
        } else {
          await prisma.baBsFormLine.update({
            where: { id: line.id },
            data: { crossCheckMatch: true },
          });
        }
      }
    }

    const crossCheckStatus = errors.length > 0 ? "mismatched" : "matched";

    await prisma.baBsForm.update({
      where: { id: formId },
      data: {
        crossCheckStatus,
        crossCheckErrors: errors,
      },
    });

    return { formId, crossCheckStatus, errors, checkedLines: form.lines.length };
  }
}

export const babsFormService = new BaBsFormService();
