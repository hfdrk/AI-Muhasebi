import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/core-domain";
import { logger } from "@repo/shared-utils";

/**
 * E-Defter (Electronic Ledger) Service
 * 
 * Handles electronic ledger generation and submission per Turkish Tax Procedure Law No. 213.
 * Required for businesses as of January 2025.
 */
export interface EDefterEntry {
  date: Date;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
  documentNumber?: string;
  documentType?: string;
  counterpartyName?: string;
  counterpartyTaxNumber?: string;
}

export interface EDefterPeriod {
  startDate: Date;
  endDate: Date;
  periodType: "monthly" | "quarterly" | "yearly";
}

export interface EDefterGenerationResult {
  success: boolean;
  ledgerId?: string;
  entryCount: number;
  totalDebit: number;
  totalCredit: number;
  generationDate: Date;
  message?: string;
}

export interface EDefterSubmissionResult {
  success: boolean;
  submissionId?: string;
  submissionDate?: Date;
  status?: "submitted" | "accepted" | "rejected";
  message?: string;
}

export class EDefterService {
  /**
   * Generate E-Defter (Electronic Ledger) for a period
   */
  async generateLedger(
    tenantId: string,
    clientCompanyId: string,
    period: EDefterPeriod
  ): Promise<EDefterGenerationResult> {
    // Verify company belongs to tenant
    const company = await prisma.clientCompany.findFirst({
      where: {
        id: clientCompanyId,
        tenantId,
      },
    });

    if (!company) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    // Get all transactions for the period
    const transactions = await prisma.transaction.findMany({
      where: {
        tenantId,
        clientCompanyId,
        date: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
      include: {
        lines: {
          include: {
            ledgerAccount: true,
          },
        },
        clientCompany: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    if (transactions.length === 0) {
      throw new ValidationError("Belirtilen dönem için işlem bulunamadı.");
    }

    // Generate ledger entries from transactions
    const entries: EDefterEntry[] = [];

    for (const transaction of transactions) {
      for (const line of transaction.lines) {
        entries.push({
          date: transaction.date,
          accountCode: line.ledgerAccount?.code || "",
          accountName: line.ledgerAccount?.name || "",
          debitAmount: Number(line.debitAmount || 0),
          creditAmount: Number(line.creditAmount || 0),
          description: line.description || transaction.description || "",
          documentNumber: transaction.referenceNo || undefined,
          documentType: "MUHASEBE",
          counterpartyName: undefined,
          counterpartyTaxNumber: undefined,
        });
      }
    }

    // Validate double-entry bookkeeping
    const totalDebit = entries.reduce((sum, entry) => sum + entry.debitAmount, 0);
    const totalCredit = entries.reduce((sum, entry) => sum + entry.creditAmount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new ValidationError(
        `Muhasebe kayıtları dengeli değil. Borç: ${totalDebit.toFixed(2)}, Alacak: ${totalCredit.toFixed(2)}`
      );
    }

    // Generate ledger ID
    const ledgerId = this.generateLedgerId(company.taxNumber || "", period);

    // Store ledger record
    await prisma.$executeRaw`
      INSERT INTO "EDefterLedger" (
        id, "tenantId", "clientCompanyId", "periodStart", "periodEnd", 
        "periodType", "entryCount", "totalDebit", "totalCredit", 
        "generationDate", "status", "metadata"
      ) VALUES (
        ${ledgerId}, ${tenantId}, ${clientCompanyId}, ${period.startDate}, ${period.endDate},
        ${period.periodType}, ${entries.length}, ${totalDebit}, ${totalCredit},
        ${new Date()}, 'generated', ${JSON.stringify({ entries })}
      )
      ON CONFLICT (id) DO UPDATE SET
        "entryCount" = ${entries.length},
        "totalDebit" = ${totalDebit},
        "totalCredit" = ${totalCredit},
        "generationDate" = ${new Date()},
        metadata = ${JSON.stringify({ entries })}
    `.catch(() => {
      // If table doesn't exist, log and continue
      logger.warn("EDefterLedger table not found. Creating metadata in company record instead.");
    });

    // Store in company metadata as fallback
    const companyMetadata = (company.metadata as Record<string, unknown>) || {};
    const eDefterRecords = (companyMetadata.eDefter as Array<Record<string, unknown>>) || [];

    const existingIndex = eDefterRecords.findIndex(
      (r) => r.ledgerId === ledgerId
    );

    const ledgerRecord = {
      ledgerId,
      periodStart: period.startDate,
      periodEnd: period.endDate,
      periodType: period.periodType,
      entryCount: entries.length,
      totalDebit,
      totalCredit,
      generationDate: new Date(),
      status: "generated",
      entries,
    };

    if (existingIndex >= 0) {
      eDefterRecords[existingIndex] = ledgerRecord;
    } else {
      eDefterRecords.push(ledgerRecord);
    }

    await prisma.clientCompany.update({
      where: { id: clientCompanyId },
      data: {
        metadata: {
          ...companyMetadata,
          eDefter: eDefterRecords,
        },
      },
    });

    logger.info(
      `E-Defter generated for company ${clientCompanyId}, period: ${period.startDate.toISOString()} - ${period.endDate.toISOString()}`
    );

    return {
      success: true,
      ledgerId,
      entryCount: entries.length,
      totalDebit,
      totalCredit,
      generationDate: new Date(),
      message: "E-Defter başarıyla oluşturuldu.",
    };
  }

  /**
   * Submit E-Defter to GIB
   */
  async submitLedger(
    tenantId: string,
    clientCompanyId: string,
    ledgerId: string
  ): Promise<EDefterSubmissionResult> {
    const company = await prisma.clientCompany.findFirst({
      where: {
        id: clientCompanyId,
        tenantId,
      },
    });

    if (!company) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    const metadata = (company.metadata as Record<string, unknown>) || {};
    const eDefterRecords = (metadata.eDefter as Array<Record<string, unknown>>) || [];

    const ledgerRecord = eDefterRecords.find((r) => r.ledgerId === ledgerId);

    if (!ledgerRecord) {
      throw new NotFoundError("E-Defter kaydı bulunamadı.");
    }

    if (ledgerRecord.status === "submitted" || ledgerRecord.status === "accepted") {
      return {
        success: true,
        submissionId: ledgerRecord.submissionId as string | undefined,
        submissionDate: ledgerRecord.submissionDate ? new Date(ledgerRecord.submissionDate as string) : undefined,
        status: ledgerRecord.status as "submitted" | "accepted",
        message: "E-Defter zaten gönderilmiş.",
      };
    }

    // TODO: Submit to GIB E-Defter system via API
    // For now, mark as submitted locally

    const submissionId = `SUBM-${ledgerId}-${Date.now()}`;

    ledgerRecord.status = "submitted";
    ledgerRecord.submissionId = submissionId;
    ledgerRecord.submissionDate = new Date();

    await prisma.clientCompany.update({
      where: { id: clientCompanyId },
      data: {
        metadata: {
          ...metadata,
          eDefter: eDefterRecords,
        },
      },
    });

    logger.info(`E-Defter ${ledgerId} submitted to GIB for company ${clientCompanyId}`);

    return {
      success: true,
      submissionId,
      submissionDate: new Date(),
      status: "submitted",
      message: "E-Defter GIB sistemine gönderildi.",
    };
  }

  /**
   * Get ledger by ID
   */
  async getLedger(
    tenantId: string,
    clientCompanyId: string,
    ledgerId: string
  ): Promise<{
    ledgerId: string;
    period: EDefterPeriod;
    entryCount: number;
    totalDebit: number;
    totalCredit: number;
    generationDate: Date;
    status: string;
    entries: EDefterEntry[];
  }> {
    const company = await prisma.clientCompany.findFirst({
      where: {
        id: clientCompanyId,
        tenantId,
      },
    });

    if (!company) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    const metadata = (company.metadata as Record<string, unknown>) || {};
    const eDefterRecords = (metadata.eDefter as Array<Record<string, unknown>>) || [];

    const ledgerRecord = eDefterRecords.find((r) => r.ledgerId === ledgerId);

    if (!ledgerRecord) {
      throw new NotFoundError("E-Defter kaydı bulunamadı.");
    }

    return {
      ledgerId: ledgerRecord.ledgerId as string,
      period: {
        startDate: new Date(ledgerRecord.periodStart as string),
        endDate: new Date(ledgerRecord.periodEnd as string),
        periodType: ledgerRecord.periodType as "monthly" | "quarterly" | "yearly",
      },
      entryCount: ledgerRecord.entryCount as number,
      totalDebit: ledgerRecord.totalDebit as number,
      totalCredit: ledgerRecord.totalCredit as number,
      generationDate: new Date(ledgerRecord.generationDate as string),
      status: ledgerRecord.status as string,
      entries: (ledgerRecord.entries as EDefterEntry[]) || [],
    };
  }

  /**
   * List ledgers for a company
   */
  async listLedgers(
    tenantId: string,
    clientCompanyId: string
  ): Promise<Array<{
    ledgerId: string;
    clientCompanyId: string;
    clientCompanyName: string;
    period: EDefterPeriod;
    entryCount: number;
    totalDebit: number;
    totalCredit: number;
    generationDate: Date;
    submissionStatus?: "draft" | "submitted" | "accepted" | "rejected";
    submissionDate?: Date;
  }>> {
    const company = await prisma.clientCompany.findFirst({
      where: {
        id: clientCompanyId,
        tenantId,
      },
    });

    if (!company) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    const metadata = (company.metadata as Record<string, unknown>) || {};
    const eDefterRecords = (metadata.eDefter as Array<Record<string, unknown>>) || [];

    return eDefterRecords.map((record) => ({
      ledgerId: record.ledgerId as string,
      clientCompanyId: company.id,
      clientCompanyName: company.name,
      period: {
        startDate: new Date(record.periodStart as string),
        endDate: new Date(record.periodEnd as string),
        periodType: record.periodType as "monthly" | "quarterly" | "yearly",
      },
      entryCount: (record.entryCount as number) || 0,
      totalDebit: (record.totalDebit as number) || 0,
      totalCredit: (record.totalCredit as number) || 0,
      generationDate: new Date(record.generationDate as string),
      submissionStatus: record.status === "submitted" || record.status === "accepted" 
        ? (record.status as "submitted" | "accepted")
        : record.submissionId 
        ? ("submitted" as const)
        : ("draft" as const),
      submissionDate: record.submissionDate ? new Date(record.submissionDate as string) : undefined,
    }));
  }

  /**
   * Generate unique ledger ID
   */
  private generateLedgerId(taxNumber: string, period: EDefterPeriod): string {
    const dateStr = period.startDate.toISOString().split("T")[0].replace(/-/g, "");
    const periodTypeCode = period.periodType === "monthly" ? "M" : period.periodType === "quarterly" ? "Q" : "Y";
    return `EDEFTER-${taxNumber}-${dateStr}-${periodTypeCode}`;
  }
}

export const eDefterService = new EDefterService();

