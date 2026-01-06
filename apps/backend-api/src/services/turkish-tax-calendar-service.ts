/**
 * Turkish Tax Calendar Service
 *
 * Provides intelligent tax deadline management for Turkish accounting.
 * Tracks all major Turkish tax obligations and provides proactive alerts.
 *
 * Key Turkish Tax Deadlines:
 * - KDV (VAT): 26th of following month
 * - Muhtasar (Withholding): 26th of following month
 * - Geçici Vergi (Quarterly): 17th of 2nd month after quarter
 * - Kurumlar/Gelir Vergisi: April 30th (Corporate), March 31st (Individual)
 * - Ba-Bs Forms: End of following month
 * - SGK (Social Security): End of following month
 */

import { prisma } from "../lib/prisma";
import { logger } from "@repo/shared-utils";

export interface TaxDeadline {
  id: string;
  type: TaxDeadlineType;
  name: string;
  nameTr: string;
  description: string;
  dueDate: Date;
  period: string; // e.g., "2024-01" for January 2024
  status: "upcoming" | "due_soon" | "overdue" | "completed";
  daysRemaining: number;
  affectedClients: number;
  estimatedAmount?: number;
  requiredDocuments: string[];
  actionUrl?: string;
}

export type TaxDeadlineType =
  | "KDV_1" // KDV Beyannamesi (Aylık)
  | "KDV_2" // KDV Beyannamesi (3 Aylık)
  | "MUHTASAR" // Muhtasar ve Prim Hizmet Beyannamesi
  | "GECICI_VERGI" // Geçici Vergi Beyannamesi
  | "KURUMLAR_VERGISI" // Kurumlar Vergisi Beyannamesi
  | "GELIR_VERGISI" // Gelir Vergisi Beyannamesi
  | "BA_BS" // Ba-Bs Formları
  | "SGK" // SGK Bildirgeleri
  | "DAMGA_VERGISI" // Damga Vergisi Beyannamesi
  | "MTV" // Motorlu Taşıtlar Vergisi
  | "EMLAK_VERGISI"; // Emlak Vergisi

interface TaxDeadlineRule {
  type: TaxDeadlineType;
  name: string;
  nameTr: string;
  description: string;
  frequency: "monthly" | "quarterly" | "annual" | "semi-annual";
  dayOfMonth: number | ((period: Date) => number);
  monthOffset: number; // How many months after the period
  requiredDocuments: string[];
}

const TAX_DEADLINE_RULES: TaxDeadlineRule[] = [
  {
    type: "KDV_1",
    name: "VAT Declaration (Monthly)",
    nameTr: "KDV Beyannamesi (Aylık)",
    description: "Aylık KDV beyannamesi verilmesi",
    frequency: "monthly",
    dayOfMonth: 26,
    monthOffset: 1,
    requiredDocuments: ["Satış Faturaları", "Alış Faturaları", "KDV İndirimi Belgeleri"],
  },
  {
    type: "MUHTASAR",
    name: "Withholding Tax Declaration",
    nameTr: "Muhtasar ve Prim Hizmet Beyannamesi",
    description: "Muhtasar ve prim hizmet beyannamesi verilmesi",
    frequency: "monthly",
    dayOfMonth: 26,
    monthOffset: 1,
    requiredDocuments: ["Maaş Bordroları", "Serbest Meslek Makbuzları", "Kira Ödemeleri"],
  },
  {
    type: "GECICI_VERGI",
    name: "Provisional Tax Declaration",
    nameTr: "Geçici Vergi Beyannamesi",
    description: "Üç aylık geçici vergi beyannamesi",
    frequency: "quarterly",
    dayOfMonth: 17,
    monthOffset: 2, // 2nd month after quarter end
    requiredDocuments: ["Gelir Tablosu", "Bilanço", "Amortisman Tablosu"],
  },
  {
    type: "KURUMLAR_VERGISI",
    name: "Corporate Tax Declaration",
    nameTr: "Kurumlar Vergisi Beyannamesi",
    description: "Yıllık kurumlar vergisi beyannamesi",
    frequency: "annual",
    dayOfMonth: 30,
    monthOffset: 4, // April 30th for previous year
    requiredDocuments: ["Bilanço", "Gelir Tablosu", "Kar Dağıtım Tablosu", "Ek Mali Tablolar"],
  },
  {
    type: "GELIR_VERGISI",
    name: "Income Tax Declaration",
    nameTr: "Gelir Vergisi Beyannamesi",
    description: "Yıllık gelir vergisi beyannamesi",
    frequency: "annual",
    dayOfMonth: 31,
    monthOffset: 3, // March 31st for previous year
    requiredDocuments: ["Gelir Belgeleri", "Gider Belgeleri", "Sigorta Poliçeleri"],
  },
  {
    type: "BA_BS",
    name: "Ba-Bs Forms",
    nameTr: "Ba-Bs Formları",
    description: "Mal ve hizmet alım/satım bildirimleri",
    frequency: "monthly",
    dayOfMonth: (period: Date) => {
      // Last day of following month
      const nextMonth = new Date(period.getFullYear(), period.getMonth() + 2, 0);
      return nextMonth.getDate();
    },
    monthOffset: 1,
    requiredDocuments: ["5.000 TL Üzeri Alış Faturaları", "5.000 TL Üzeri Satış Faturaları"],
  },
  {
    type: "SGK",
    name: "Social Security Declarations",
    nameTr: "SGK Bildirgeleri",
    description: "Aylık prim ve hizmet belgeleri",
    frequency: "monthly",
    dayOfMonth: (period: Date) => {
      // Last day of following month
      const nextMonth = new Date(period.getFullYear(), period.getMonth() + 2, 0);
      return nextMonth.getDate();
    },
    monthOffset: 1,
    requiredDocuments: ["İşe Giriş/Çıkış Bildirgeleri", "Maaş Bordroları"],
  },
  {
    type: "DAMGA_VERGISI",
    name: "Stamp Duty Declaration",
    nameTr: "Damga Vergisi Beyannamesi",
    description: "Damga vergisi beyannamesi",
    frequency: "monthly",
    dayOfMonth: 26,
    monthOffset: 1,
    requiredDocuments: ["Damga Vergisine Tabi Belgeler", "Sözleşmeler"],
  },
  {
    type: "MTV",
    name: "Motor Vehicle Tax",
    nameTr: "Motorlu Taşıtlar Vergisi",
    description: "Motorlu taşıtlar vergisi ödemesi",
    frequency: "semi-annual",
    dayOfMonth: 31,
    monthOffset: 1, // January and July
    requiredDocuments: ["Araç Ruhsatları"],
  },
  {
    type: "EMLAK_VERGISI",
    name: "Property Tax",
    nameTr: "Emlak Vergisi",
    description: "Emlak vergisi ödemesi",
    frequency: "semi-annual",
    dayOfMonth: 31,
    monthOffset: 5, // May and November
    requiredDocuments: ["Tapu Belgeleri", "Emlak Beyannameleri"],
  },
];

export class TurkishTaxCalendarService {
  /**
   * Get all upcoming tax deadlines for a tenant
   */
  async getUpcomingDeadlines(
    tenantId: string,
    options: {
      daysAhead?: number;
      types?: TaxDeadlineType[];
      clientCompanyId?: string;
    } = {}
  ): Promise<TaxDeadline[]> {
    const { daysAhead = 30, types, clientCompanyId } = options;
    const now = new Date();
    const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const deadlines: TaxDeadline[] = [];

    // Generate deadlines for each rule
    for (const rule of TAX_DEADLINE_RULES) {
      if (types && !types.includes(rule.type)) {
        continue;
      }

      const ruleDeadlines = this.generateDeadlinesForRule(rule, now, endDate);

      for (const deadline of ruleDeadlines) {
        // Get affected clients count
        const affectedClients = await this.getAffectedClientsCount(
          tenantId,
          rule.type,
          deadline.period,
          clientCompanyId
        );

        // Calculate estimated amount if possible
        const estimatedAmount = await this.estimateTaxAmount(
          tenantId,
          rule.type,
          deadline.period,
          clientCompanyId
        );

        deadlines.push({
          ...deadline,
          affectedClients,
          estimatedAmount,
        });
      }
    }

    // Sort by due date
    deadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return deadlines;
  }

  /**
   * Get critical deadlines (due within 7 days or overdue)
   */
  async getCriticalDeadlines(tenantId: string): Promise<TaxDeadline[]> {
    const deadlines = await this.getUpcomingDeadlines(tenantId, { daysAhead: 7 });
    return deadlines.filter(d => d.status === "due_soon" || d.status === "overdue");
  }

  /**
   * Get deadline summary for dashboard
   */
  async getDeadlineSummary(tenantId: string): Promise<{
    overdue: number;
    dueSoon: number; // Within 7 days
    upcoming: number; // Within 30 days
    totalEstimatedAmount: number;
    nextDeadline: TaxDeadline | null;
  }> {
    const deadlines = await this.getUpcomingDeadlines(tenantId, { daysAhead: 30 });

    const overdue = deadlines.filter(d => d.status === "overdue").length;
    const dueSoon = deadlines.filter(d => d.status === "due_soon").length;
    const upcoming = deadlines.filter(d => d.status === "upcoming").length;
    const totalEstimatedAmount = deadlines.reduce(
      (sum, d) => sum + (d.estimatedAmount || 0),
      0
    );
    const nextDeadline = deadlines.find(d => d.status !== "overdue") || null;

    return {
      overdue,
      dueSoon,
      upcoming,
      totalEstimatedAmount,
      nextDeadline,
    };
  }

  /**
   * Generate deadlines for a specific rule within a date range
   */
  private generateDeadlinesForRule(
    rule: TaxDeadlineRule,
    startDate: Date,
    endDate: Date
  ): Omit<TaxDeadline, "affectedClients" | "estimatedAmount">[] {
    const deadlines: Omit<TaxDeadline, "affectedClients" | "estimatedAmount">[] = [];
    const now = new Date();

    // Generate periods based on frequency
    const periods = this.getPeriodsForDateRange(rule.frequency, startDate, endDate);

    for (const period of periods) {
      const dueDate = this.calculateDueDate(rule, period);

      // Only include if due date is within range
      if (dueDate >= startDate && dueDate <= endDate) {
        const daysRemaining = Math.ceil(
          (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        let status: TaxDeadline["status"];
        if (daysRemaining < 0) {
          status = "overdue";
        } else if (daysRemaining <= 7) {
          status = "due_soon";
        } else {
          status = "upcoming";
        }

        deadlines.push({
          id: `${rule.type}_${this.formatPeriod(period)}`,
          type: rule.type,
          name: rule.name,
          nameTr: rule.nameTr,
          description: rule.description,
          dueDate,
          period: this.formatPeriod(period),
          status,
          daysRemaining,
          requiredDocuments: rule.requiredDocuments,
          actionUrl: `/vergi/${rule.type.toLowerCase()}/${this.formatPeriod(period)}`,
        });
      }
    }

    return deadlines;
  }

  /**
   * Get periods for a date range based on frequency
   */
  private getPeriodsForDateRange(
    frequency: TaxDeadlineRule["frequency"],
    startDate: Date,
    endDate: Date
  ): Date[] {
    const periods: Date[] = [];
    const current = new Date(startDate);
    current.setDate(1); // Start of month

    // Go back to include periods that might have deadlines in range
    if (frequency === "monthly") {
      current.setMonth(current.getMonth() - 2);
    } else if (frequency === "quarterly") {
      current.setMonth(current.getMonth() - 6);
    } else if (frequency === "annual" || frequency === "semi-annual") {
      current.setFullYear(current.getFullYear() - 1);
    }

    while (current <= endDate) {
      switch (frequency) {
        case "monthly":
          periods.push(new Date(current));
          current.setMonth(current.getMonth() + 1);
          break;
        case "quarterly":
          // Quarter ends: March, June, September, December
          const quarterMonth = Math.floor(current.getMonth() / 3) * 3 + 2;
          if (current.getMonth() <= quarterMonth) {
            periods.push(new Date(current.getFullYear(), quarterMonth, 1));
          }
          current.setMonth(current.getMonth() + 3);
          break;
        case "semi-annual":
          // January and July
          if (current.getMonth() === 0 || current.getMonth() === 6) {
            periods.push(new Date(current));
          }
          current.setMonth(current.getMonth() + 6);
          break;
        case "annual":
          periods.push(new Date(current.getFullYear(), 11, 31)); // December 31
          current.setFullYear(current.getFullYear() + 1);
          break;
      }
    }

    return periods;
  }

  /**
   * Calculate due date for a period based on rule
   */
  private calculateDueDate(rule: TaxDeadlineRule, period: Date): Date {
    const dueMonth = period.getMonth() + rule.monthOffset;
    const dueYear = period.getFullYear() + Math.floor(dueMonth / 12);
    const normalizedMonth = dueMonth % 12;

    const dayOfMonth =
      typeof rule.dayOfMonth === "function"
        ? rule.dayOfMonth(period)
        : rule.dayOfMonth;

    // Handle end of month cases
    const lastDayOfMonth = new Date(dueYear, normalizedMonth + 1, 0).getDate();
    const actualDay = Math.min(dayOfMonth, lastDayOfMonth);

    return new Date(dueYear, normalizedMonth, actualDay);
  }

  /**
   * Format period for display
   */
  private formatPeriod(period: Date): string {
    const year = period.getFullYear();
    const month = String(period.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  /**
   * Get count of clients affected by a deadline
   */
  private async getAffectedClientsCount(
    tenantId: string,
    type: TaxDeadlineType,
    period: string,
    clientCompanyId?: string
  ): Promise<number> {
    try {
      const where: any = {
        tenantId,
        isActive: true,
      };

      if (clientCompanyId) {
        where.id = clientCompanyId;
      }

      // Different rules for different tax types
      switch (type) {
        case "KURUMLAR_VERGISI":
          where.legalType = { in: ["Limited", "Anonim"] };
          break;
        case "GELIR_VERGISI":
          where.legalType = "Sahis";
          break;
        // Other types apply to all companies
      }

      const count = await prisma.clientCompany.count({ where });
      return count;
    } catch (error) {
      logger.error("Failed to get affected clients count", { tenantId }, { error, type, period });
      return 0;
    }
  }

  /**
   * Estimate tax amount for a period
   */
  private async estimateTaxAmount(
    tenantId: string,
    type: TaxDeadlineType,
    period: string,
    clientCompanyId?: string
  ): Promise<number | undefined> {
    try {
      const [year, month] = period.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const where: any = {
        tenantId,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (clientCompanyId) {
        where.clientCompanyId = clientCompanyId;
      }

      switch (type) {
        case "KDV_1":
        case "KDV_2": {
          // Sum of VAT from invoices
          const result = await prisma.invoice.aggregate({
            where,
            _sum: {
              taxAmount: true,
            },
          });
          return Number(result._sum.taxAmount) || 0;
        }

        case "MUHTASAR": {
          // This would need transaction data for withholding calculations
          // Returning undefined for now - needs more complex calculation
          return undefined;
        }

        case "GECICI_VERGI":
        case "KURUMLAR_VERGISI":
        case "GELIR_VERGISI": {
          // These need P&L calculations - complex
          return undefined;
        }

        default:
          return undefined;
      }
    } catch (error) {
      logger.error("Failed to estimate tax amount", { tenantId }, { error, type, period });
      return undefined;
    }
  }

  /**
   * Mark a deadline as completed
   */
  async markDeadlineCompleted(
    tenantId: string,
    deadlineId: string,
    metadata: {
      completedBy: string;
      filingReference?: string;
      actualAmount?: number;
      notes?: string;
    }
  ): Promise<void> {
    // Store completion in audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: metadata.completedBy,
        action: "TAX_DEADLINE_COMPLETED",
        resourceType: "TAX_CALENDAR",
        resourceId: deadlineId,
        metadata: {
          filingReference: metadata.filingReference,
          actualAmount: metadata.actualAmount,
          notes: metadata.notes,
          completedAt: new Date().toISOString(),
        },
      },
    });

    logger.info("Tax deadline marked as completed", { tenantId }, {
      deadlineId,
      completedBy: metadata.completedBy,
    });
  }

  /**
   * Get deadline completion history
   */
  async getCompletionHistory(
    tenantId: string,
    options: {
      type?: TaxDeadlineType;
      year?: number;
      clientCompanyId?: string;
    } = {}
  ): Promise<Array<{
    deadlineId: string;
    completedAt: Date;
    completedBy: string;
    filingReference?: string;
    actualAmount?: number;
  }>> {
    const where: any = {
      tenantId,
      action: "TAX_DEADLINE_COMPLETED",
      resourceType: "TAX_CALENDAR",
    };

    if (options.type) {
      where.resourceId = { startsWith: options.type };
    }

    if (options.year) {
      where.resourceId = { contains: String(options.year) };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return logs.map((log) => ({
      deadlineId: log.resourceId || "",
      completedAt: log.createdAt,
      completedBy: log.userId,
      filingReference: (log.metadata as any)?.filingReference,
      actualAmount: (log.metadata as any)?.actualAmount,
    }));
  }
}

export const turkishTaxCalendarService = new TurkishTaxCalendarService();
