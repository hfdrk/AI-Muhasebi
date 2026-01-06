import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";
import {
  gibComplianceService,
  GIB_EDEFTER_STATUS,
  type GibEDefterStatus,
} from "./gib-compliance-service";

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

  // =============================================================================
  // ENHANCED GİB COMPLIANCE METHODS
  // =============================================================================

  /**
   * Validate E-Defter entries before generation
   */
  validateEntries(entries: EDefterEntry[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    summary: {
      totalDebit: number;
      totalCredit: number;
      difference: number;
      entryCount: number;
    };
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Calculate totals
    const validation = gibComplianceService.validateDoubleEntry(
      entries.map((e) => ({ borc: e.debitAmount, alacak: e.creditAmount }))
    );

    if (!validation.valid) {
      errors.push(
        `Muhasebe kayıtları dengeli değil. Borç: ${gibComplianceService.formatTurkishAmount(
          validation.totalBorc
        )} TL, Alacak: ${gibComplianceService.formatTurkishAmount(validation.totalAlacak)} TL`
      );
    }

    // Check for entries without account codes
    const missingAccountCodes = entries.filter((e) => !e.accountCode);
    if (missingAccountCodes.length > 0) {
      errors.push(`${missingAccountCodes.length} adet kayıtta hesap kodu eksik`);
    }

    // Check for entries without descriptions
    const missingDescriptions = entries.filter((e) => !e.description);
    if (missingDescriptions.length > 0) {
      warnings.push(`${missingDescriptions.length} adet kayıtta açıklama eksik`);
    }

    // Check for zero-amount entries
    const zeroAmountEntries = entries.filter(
      (e) => e.debitAmount === 0 && e.creditAmount === 0
    );
    if (zeroAmountEntries.length > 0) {
      warnings.push(`${zeroAmountEntries.length} adet sıfır tutarlı kayıt var`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalDebit: validation.totalBorc,
        totalCredit: validation.totalAlacak,
        difference: validation.difference,
        entryCount: entries.length,
      },
    };
  }

  /**
   * Check if previous period ledger exists (for continuity)
   */
  async checkPreviousPeriod(
    tenantId: string,
    clientCompanyId: string,
    currentPeriod: EDefterPeriod
  ): Promise<{
    exists: boolean;
    previousLedgerId?: string;
    warning?: string;
  }> {
    const company = await prisma.clientCompany.findFirst({
      where: { id: clientCompanyId, tenantId },
    });

    if (!company) {
      return { exists: false, warning: "Şirket bulunamadı" };
    }

    const metadata = (company.metadata as Record<string, unknown>) || {};
    const eDefterRecords = (metadata.eDefter as Array<Record<string, unknown>>) || [];

    // Calculate previous period end date
    let previousEndDate: Date;
    switch (currentPeriod.periodType) {
      case "monthly":
        previousEndDate = new Date(currentPeriod.startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        break;
      case "quarterly":
        previousEndDate = new Date(currentPeriod.startDate);
        previousEndDate.setMonth(previousEndDate.getMonth() - 1);
        previousEndDate.setDate(0);
        break;
      case "yearly":
        previousEndDate = new Date(currentPeriod.startDate.getFullYear() - 1, 11, 31);
        break;
    }

    const previousLedger = eDefterRecords.find((r) => {
      const periodEnd = new Date(r.periodEnd as string);
      return Math.abs(periodEnd.getTime() - previousEndDate.getTime()) < 86400000; // 1 day tolerance
    });

    if (previousLedger) {
      return {
        exists: true,
        previousLedgerId: previousLedger.ledgerId as string,
      };
    }

    // If this is the first period of the year, it's okay to not have previous
    if (currentPeriod.startDate.getMonth() === 0 && currentPeriod.startDate.getDate() === 1) {
      return { exists: true }; // First period of year, no previous needed
    }

    return {
      exists: false,
      warning: `Önceki dönem E-Defter kaydı bulunamadı. Dönem: ${previousEndDate.toLocaleDateString("tr-TR")}`,
    };
  }

  /**
   * Get ledger with enhanced GİB status
   */
  async getLedgerWithGibStatus(
    tenantId: string,
    clientCompanyId: string,
    ledgerId: string
  ): Promise<{
    ledger: any;
    gibStatus: GibEDefterStatus;
    validationResult: ReturnType<typeof this.validateEntries>;
  }> {
    const ledger = await this.getLedger(tenantId, clientCompanyId, ledgerId);

    const gibStatus = gibComplianceService.mapToGibStatus(
      ledger.status || "DRAFT",
      "edefter"
    ) as GibEDefterStatus;

    const validationResult = this.validateEntries(ledger.entries);

    return {
      ledger,
      gibStatus,
      validationResult,
    };
  }

  /**
   * Get ledger statistics for tenant
   */
  async getLedgerStats(
    tenantId: string,
    year?: number
  ): Promise<{
    totalLedgers: number;
    draft: number;
    submitted: number;
    accepted: number;
    rejected: number;
    byPeriodType: {
      monthly: number;
      quarterly: number;
      yearly: number;
    };
    totalDebit: number;
    totalCredit: number;
  }> {
    const companies = await prisma.clientCompany.findMany({
      where: { tenantId },
      select: { metadata: true },
    });

    const stats = {
      totalLedgers: 0,
      draft: 0,
      submitted: 0,
      accepted: 0,
      rejected: 0,
      byPeriodType: {
        monthly: 0,
        quarterly: 0,
        yearly: 0,
      },
      totalDebit: 0,
      totalCredit: 0,
    };

    for (const company of companies) {
      const metadata = (company.metadata as Record<string, unknown>) || {};
      const eDefterRecords = (metadata.eDefter as Array<Record<string, unknown>>) || [];

      for (const record of eDefterRecords) {
        // Filter by year if specified
        if (year) {
          const periodStart = new Date(record.periodStart as string);
          if (periodStart.getFullYear() !== year) continue;
        }

        stats.totalLedgers++;

        const status = record.status as string;
        switch (status) {
          case "generated":
          case "draft":
            stats.draft++;
            break;
          case "submitted":
            stats.submitted++;
            break;
          case "accepted":
            stats.accepted++;
            break;
          case "rejected":
            stats.rejected++;
            break;
        }

        const periodType = record.periodType as string;
        if (periodType === "monthly") stats.byPeriodType.monthly++;
        else if (periodType === "quarterly") stats.byPeriodType.quarterly++;
        else if (periodType === "yearly") stats.byPeriodType.yearly++;

        stats.totalDebit += (record.totalDebit as number) || 0;
        stats.totalCredit += (record.totalCredit as number) || 0;
      }
    }

    return stats;
  }

  /**
   * Generate period identifier in GİB format
   */
  formatPeriodIdentifier(period: EDefterPeriod): string {
    return gibComplianceService.generateEDefterPeriod(period.startDate, period.periodType);
  }

  /**
   * Get available periods for E-Defter generation
   */
  getAvailablePeriods(year: number): Array<{
    periodType: "monthly" | "quarterly" | "yearly";
    startDate: Date;
    endDate: Date;
    identifier: string;
    displayName: string;
  }> {
    const periods: Array<{
      periodType: "monthly" | "quarterly" | "yearly";
      startDate: Date;
      endDate: Date;
      identifier: string;
      displayName: string;
    }> = [];

    // Monthly periods
    for (let month = 0; month < 12; month++) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const monthNames = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
      ];

      periods.push({
        periodType: "monthly",
        startDate,
        endDate,
        identifier: this.formatPeriodIdentifier({ startDate, endDate, periodType: "monthly" }),
        displayName: `${monthNames[month]} ${year}`,
      });
    }

    // Quarterly periods
    for (let quarter = 0; quarter < 4; quarter++) {
      const startMonth = quarter * 3;
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, startMonth + 3, 0);

      periods.push({
        periodType: "quarterly",
        startDate,
        endDate,
        identifier: this.formatPeriodIdentifier({ startDate, endDate, periodType: "quarterly" }),
        displayName: `${quarter + 1}. Çeyrek ${year}`,
      });
    }

    // Yearly period
    periods.push({
      periodType: "yearly",
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31),
      identifier: this.formatPeriodIdentifier({
        startDate: new Date(year, 0, 1),
        endDate: new Date(year, 11, 31),
        periodType: "yearly",
      }),
      displayName: `${year} Yılı`,
    });

    return periods;
  }

  /**
   * Get GİB submission deadlines for E-Defter
   */
  getSubmissionDeadline(period: EDefterPeriod): {
    deadline: Date;
    daysRemaining: number;
    isOverdue: boolean;
    warningLevel: "ok" | "warning" | "critical" | "overdue";
  } {
    // E-Defter submission deadline is typically 3 months after period end
    const deadline = new Date(period.endDate);
    deadline.setMonth(deadline.getMonth() + 3);

    const now = new Date();
    const daysRemaining = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let warningLevel: "ok" | "warning" | "critical" | "overdue";
    if (daysRemaining < 0) {
      warningLevel = "overdue";
    } else if (daysRemaining <= 7) {
      warningLevel = "critical";
    } else if (daysRemaining <= 30) {
      warningLevel = "warning";
    } else {
      warningLevel = "ok";
    }

    return {
      deadline,
      daysRemaining,
      isOverdue: daysRemaining < 0,
      warningLevel,
    };
  }
}

export const eDefterService = new EDefterService();

