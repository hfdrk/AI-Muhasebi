import { prisma } from "../lib/prisma";
import { logger } from "@repo/shared-utils";
import { Decimal } from "@prisma/client/runtime/library";

interface MasakScanResult {
  clientCompanyId: string;
  suspiciousIndicators: SuspiciousIndicator[];
  riskScore: number;
  summary: string;
}

interface SuspiciousIndicator {
  type: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  relatedTransactions: string[];
  amount?: number;
}

interface MasakReportCreateInput {
  clientCompanyId: string;
  reportType: string;
  suspicionType: string;
  suspicionDetails: string;
  transactionIds?: string[];
  invoiceIds?: string[];
  totalAmount: number;
  currency?: string;
  counterpartyName?: string;
  counterpartyTaxNo?: string;
  riskScore?: number;
  riskIndicators?: any[];
  notes?: string;
}

interface ListReportsParams {
  status?: string;
  clientCompanyId?: string;
  reportType?: string;
  page?: number;
  pageSize?: number;
}

export interface MasakThresholdAlert {
  type: "CASH_THRESHOLD_EXCEEDED" | "CASH_THRESHOLD_APPROACHING" | "CUMULATIVE_THRESHOLD" | "STRUCTURED_TRANSACTION" | "RAPID_CASH_MOVEMENT";
  transactionId?: string;
  clientCompanyId: string;
  amount: number;
  threshold: number;
  description: string;
  severity: "low" | "medium" | "high";
  requiresSTR: boolean;
}

class MasakStrService {
  // MASAK cash transaction threshold (updated periodically by regulation)
  private readonly MASAK_CASH_THRESHOLD = 290000; // TL
  private readonly MASAK_APPROACH_PERCENTAGE = 0.8; // Alert at 80% of threshold

  /**
   * Get MASAK dashboard statistics
   */
  async getDashboardStats(tenantId: string) {
    const [
      totalReports,
      pendingReports,
      submittedReports,
      draftReports,
      recentReports,
      upcomingDeadlines,
    ] = await Promise.all([
      prisma.masakReport.count({ where: { tenantId } }),
      prisma.masakReport.count({ where: { tenantId, status: "pending_review" } }),
      prisma.masakReport.count({ where: { tenantId, status: "submitted" } }),
      prisma.masakReport.count({ where: { tenantId, status: "draft" } }),
      prisma.masakReport.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { clientCompany: { select: { name: true } } },
      }),
      prisma.masakReport.findMany({
        where: {
          tenantId,
          status: { in: ["draft", "pending_review"] },
          deadline: { not: null, gte: new Date() },
        },
        orderBy: { deadline: "asc" },
        take: 5,
        include: { clientCompany: { select: { name: true } } },
      }),
    ]);

    // Suspicion type breakdown
    const suspicionBreakdown = await prisma.masakReport.groupBy({
      by: ["suspicionType"],
      where: { tenantId },
      _count: true,
    });

    return {
      totalReports,
      pendingReports,
      submittedReports,
      draftReports,
      recentReports: recentReports.map((r) => ({
        id: r.id,
        clientCompanyName: r.clientCompany.name,
        reportType: r.reportType,
        suspicionType: r.suspicionType,
        status: r.status,
        totalAmount: r.totalAmount,
        riskScore: r.riskScore,
        deadline: r.deadline,
        createdAt: r.createdAt,
      })),
      upcomingDeadlines: upcomingDeadlines.map((r) => ({
        id: r.id,
        clientCompanyName: r.clientCompany.name,
        suspicionType: r.suspicionType,
        deadline: r.deadline,
        status: r.status,
      })),
      suspicionBreakdown: suspicionBreakdown.map((s) => ({
        type: s.suspicionType,
        count: s._count,
      })),
    };
  }

  /**
   * Scan a company for suspicious activity patterns
   */
  async scanForSuspiciousActivity(tenantId: string, clientCompanyId: string): Promise<MasakScanResult> {
    const indicators: SuspiciousIndicator[] = [];
    let totalRiskScore = 0;

    // Get company's recent transactions (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await prisma.transaction.findMany({
      where: {
        tenantId,
        clientCompanyId,
        date: { gte: sixMonthsAgo },
      },
      include: { lines: true },
      orderBy: { date: "desc" },
    });

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientCompanyId,
        issueDate: { gte: sixMonthsAgo },
      },
      orderBy: { issueDate: "desc" },
    });

    // Compute net amount per transaction from its lines
    const txnsWithAmount = transactions.map((t) => {
      const netAmount = t.lines.reduce(
        (sum, l) => sum + Number(l.debitAmount) - Number(l.creditAmount),
        0
      );
      return { ...t, netAmount };
    });

    // Check 1: High value transactions (>500,000 TRY single transaction)
    const highValueTxns = txnsWithAmount.filter(
      (t) => Math.abs(t.netAmount) >= 500000
    );
    if (highValueTxns.length > 0) {
      indicators.push({
        type: "high_value_transaction",
        description: `${highValueTxns.length} adet yüksek tutarlı işlem tespit edildi (≥500.000 TRY)`,
        severity: highValueTxns.some((t) => Math.abs(t.netAmount) >= 2000000) ? "critical" : "high",
        relatedTransactions: highValueTxns.map((t) => t.id),
        amount: highValueTxns.reduce((sum, t) => sum + Math.abs(t.netAmount), 0),
      });
      totalRiskScore += 25;
    }

    // Check 2: Structuring (many transactions just below reporting threshold)
    const structuringTxns = txnsWithAmount.filter(
      (t) => Math.abs(t.netAmount) >= 45000 && Math.abs(t.netAmount) < 50000
    );
    if (structuringTxns.length >= 3) {
      indicators.push({
        type: "structuring",
        description: `${structuringTxns.length} adet parçalama şüphesi olan işlem (45.000-50.000 TRY aralığı)`,
        severity: structuringTxns.length >= 5 ? "critical" : "high",
        relatedTransactions: structuringTxns.map((t) => t.id),
        amount: structuringTxns.reduce((sum, t) => sum + Math.abs(t.netAmount), 0),
      });
      totalRiskScore += 30;
    }

    // Check 3: Rapid successive transactions (same day, same counterparty)
    const txnsByDate: Record<string, typeof txnsWithAmount> = {};
    for (const t of txnsWithAmount) {
      const key = `${t.date.toISOString().split("T")[0]}_${t.description || ""}`;
      if (!txnsByDate[key]) txnsByDate[key] = [];
      txnsByDate[key].push(t);
    }
    const rapidGroups = Object.entries(txnsByDate).filter(([, txns]) => txns.length >= 3);
    if (rapidGroups.length > 0) {
      const allRapidTxns = rapidGroups.flatMap(([, txns]) => txns);
      indicators.push({
        type: "rapid_transactions",
        description: `${rapidGroups.length} günde ardışık çoklu işlem tespit edildi`,
        severity: "medium",
        relatedTransactions: allRapidTxns.map((t) => t.id),
      });
      totalRiskScore += 15;
    }

    // Check 4: Round number transactions (potential cash transactions)
    const roundTxns = txnsWithAmount.filter((t) => {
      const amount = Math.abs(t.netAmount);
      return amount >= 10000 && amount % 1000 === 0;
    });
    if (roundTxns.length >= 5) {
      indicators.push({
        type: "round_numbers",
        description: `${roundTxns.length} adet yuvarlak tutarlı işlem (potansiyel nakit işlem)`,
        severity: "low",
        relatedTransactions: roundTxns.map((t) => t.id),
      });
      totalRiskScore += 10;
    }

    // Check 5: Revenue vs expense mismatch (unusual patterns)
    const totalRevenue = txnsWithAmount
      .filter((t) => t.netAmount > 0)
      .reduce((sum, t) => sum + t.netAmount, 0);
    const totalExpense = txnsWithAmount
      .filter((t) => t.netAmount < 0)
      .reduce((sum, t) => sum + Math.abs(t.netAmount), 0);

    if (totalRevenue > 0 && totalExpense > 0) {
      const ratio = totalExpense / totalRevenue;
      if (ratio > 0.95 || ratio < 0.05) {
        indicators.push({
          type: "revenue_expense_mismatch",
          description: `Gelir/gider oranı anormal (${(ratio * 100).toFixed(1)}%)`,
          severity: "medium",
          relatedTransactions: [],
          amount: Math.abs(totalRevenue - totalExpense),
        });
        totalRiskScore += 20;
      }
    }

    const riskScore = Math.min(totalRiskScore, 100);

    return {
      clientCompanyId,
      suspiciousIndicators: indicators,
      riskScore,
      summary:
        indicators.length === 0
          ? "Şüpheli işlem tespit edilmedi."
          : `${indicators.length} adet şüpheli aktivite göstergesi tespit edildi. Risk skoru: ${riskScore}/100`,
    };
  }

  /**
   * List MASAK reports with filtering and pagination
   */
  async listReports(tenantId: string, params: ListReportsParams) {
    const { status, clientCompanyId, reportType, page = 1, pageSize = 20 } = params;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (clientCompanyId) where.clientCompanyId = clientCompanyId;
    if (reportType) where.reportType = reportType;

    const [reports, total] = await Promise.all([
      prisma.masakReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          clientCompany: { select: { name: true, taxNumber: true } },
          createdBy: { select: { fullName: true, email: true } },
          reviewedBy: { select: { fullName: true, email: true } },
        },
      }),
      prisma.masakReport.count({ where }),
    ]);

    return {
      reports,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get a single MASAK report
   */
  async getReport(tenantId: string, reportId: string) {
    const report = await prisma.masakReport.findFirst({
      where: { id: reportId, tenantId },
      include: {
        clientCompany: { select: { name: true, taxNumber: true } },
        createdBy: { select: { fullName: true, email: true } },
        reviewedBy: { select: { fullName: true, email: true } },
      },
    });
    if (!report) throw new Error("MASAK raporu bulunamadı");
    return report;
  }

  /**
   * Create a new MASAK report
   */
  async createReport(tenantId: string, userId: string, input: MasakReportCreateInput) {
    // Calculate deadline: 10 business days from now
    const deadline = this.calculateDeadline(new Date(), 10);

    const report = await prisma.masakReport.create({
      data: {
        tenantId,
        clientCompanyId: input.clientCompanyId,
        reportType: input.reportType || "STR",
        suspicionType: input.suspicionType,
        suspicionDetails: input.suspicionDetails,
        transactionIds: input.transactionIds || [],
        invoiceIds: input.invoiceIds || [],
        totalAmount: new Decimal(input.totalAmount),
        currency: input.currency || "TRY",
        counterpartyName: input.counterpartyName,
        counterpartyTaxNo: input.counterpartyTaxNo,
        riskScore: input.riskScore != null ? new Decimal(input.riskScore) : null,
        riskIndicators: input.riskIndicators || [],
        detectedAt: new Date(),
        deadline,
        notes: input.notes,
        createdByUserId: userId,
      },
      include: {
        clientCompany: { select: { name: true } },
      },
    });

    logger.info("MASAK report created", undefined, { reportId: report.id, tenantId });
    return report;
  }

  /**
   * Update MASAK report status
   */
  async updateReportStatus(
    tenantId: string,
    reportId: string,
    userId: string,
    status: string,
    notes?: string
  ) {
    const report = await prisma.masakReport.findFirst({
      where: { id: reportId, tenantId },
    });
    if (!report) throw new Error("MASAK raporu bulunamadı");

    const updateData: any = {
      status,
      reviewedByUserId: userId,
    };

    if (status === "submitted") {
      updateData.reportedAt = new Date();
    }
    if (notes) {
      updateData.notes = notes;
    }

    return prisma.masakReport.update({
      where: { id: reportId },
      data: updateData,
      include: {
        clientCompany: { select: { name: true } },
      },
    });
  }

  /**
   * Check for approaching MASAK report deadlines and send notification emails
   */
  async checkAndNotifyDeadlines(tenantId: string): Promise<{ notified: number }> {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const approachingDeadlines = await prisma.masakReport.findMany({
      where: {
        tenantId,
        status: { in: ["draft", "pending_review"] },
        deadline: {
          not: null,
          lte: threeDaysFromNow,
          gte: new Date(),
        },
      },
      include: {
        clientCompany: { select: { name: true } },
        createdBy: { select: { fullName: true, email: true } },
      },
    });

    if (approachingDeadlines.length === 0) {
      return { notified: 0 };
    }

    // Get tenant users with masak:manage permission to notify
    const tenantUsers = await prisma.userTenantMembership.findMany({
      where: {
        tenantId,
        status: "active",
        role: { in: ["TenantOwner", "Accountant", "Staff"] },
      },
      include: {
        user: { select: { email: true, fullName: true } },
      },
    });

    const recipientEmails = tenantUsers
      .map((tu) => tu.user.email)
      .filter((e): e is string => !!e);

    if (recipientEmails.length === 0) {
      logger.warn("No recipients found for MASAK deadline notifications", { tenantId });
      return { notified: 0 };
    }

    const { emailService } = await import("./email-service");

    for (const report of approachingDeadlines) {
      const daysLeft = Math.ceil(
        ((report.deadline as Date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      try {
        await emailService.sendNotificationEmail(
          recipientEmails,
          "masak_deadline",
          `MASAK Bildirim Son Tarihi Yaklaşıyor (${daysLeft} gün)`,
          [
            `${report.clientCompany.name} için MASAK şüpheli işlem bildiriminin son teslim tarihine ${daysLeft} gün kaldı.`,
            ``,
            `Rapor Detayları:`,
            `- Şirket: ${report.clientCompany.name}`,
            `- Şüphe Türü: ${report.suspicionType}`,
            `- Durum: ${report.status}`,
            `- Son Tarih: ${(report.deadline as Date).toLocaleDateString("tr-TR")}`,
          ].join("\n"),
          undefined,
          tenantId
        );
      } catch (error) {
        logger.error("Failed to send MASAK deadline notification", { tenantId }, {
          reportId: report.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("MASAK deadline notifications sent", { tenantId }, {
      count: approachingDeadlines.length,
    });

    return { notified: approachingDeadlines.length };
  }

  /**
   * Monitor transactions for MASAK reporting thresholds
   */
  async monitorTransactionThresholds(
    tenantId: string,
    clientCompanyId: string
  ): Promise<MasakThresholdAlert[]> {
    const alerts: MasakThresholdAlert[] = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get recent transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        tenantId,
        clientCompanyId,
        date: { gte: thirtyDaysAgo },
      },
      include: { lines: true },
      orderBy: { date: "desc" },
    });

    // Check individual transaction amounts
    for (const txn of transactions) {
      const amount = txn.lines.reduce(
        (sum, line) => sum + Number(line.debitAmount) + Number(line.creditAmount),
        0
      );

      if (amount >= this.MASAK_CASH_THRESHOLD) {
        alerts.push({
          type: "CASH_THRESHOLD_EXCEEDED",
          transactionId: txn.id,
          clientCompanyId,
          amount,
          threshold: this.MASAK_CASH_THRESHOLD,
          description: `İşlem tutarı MASAK nakit işlem eşiğini aştı: ${amount.toLocaleString("tr-TR")} TL (Eşik: ${this.MASAK_CASH_THRESHOLD.toLocaleString("tr-TR")} TL)`,
          severity: "high",
          requiresSTR: true,
        });
      } else if (amount >= this.MASAK_CASH_THRESHOLD * this.MASAK_APPROACH_PERCENTAGE) {
        alerts.push({
          type: "CASH_THRESHOLD_APPROACHING",
          transactionId: txn.id,
          clientCompanyId,
          amount,
          threshold: this.MASAK_CASH_THRESHOLD,
          description: `İşlem tutarı MASAK eşiğine yaklaşıyor: ${amount.toLocaleString("tr-TR")} TL (Eşik: ${this.MASAK_CASH_THRESHOLD.toLocaleString("tr-TR")} TL)`,
          severity: "medium",
          requiresSTR: false,
        });
      }
    }

    // Cumulative threshold: Check if multiple transactions to same party exceed threshold within 30 days
    const counterpartyTotals = new Map<string, { total: number; count: number; txnIds: string[] }>();
    for (const txn of transactions) {
      const amount = txn.lines.reduce(
        (sum, line) => sum + Number(line.debitAmount) + Number(line.creditAmount),
        0
      );
      const key = txn.description || "unknown";
      const existing = counterpartyTotals.get(key) || { total: 0, count: 0, txnIds: [] };
      existing.total += amount;
      existing.count++;
      existing.txnIds.push(txn.id);
      counterpartyTotals.set(key, existing);
    }

    for (const [counterparty, data] of counterpartyTotals.entries()) {
      if (data.total >= this.MASAK_CASH_THRESHOLD && data.count > 1) {
        alerts.push({
          type: "CUMULATIVE_THRESHOLD",
          clientCompanyId,
          amount: data.total,
          threshold: this.MASAK_CASH_THRESHOLD,
          description: `"${counterparty}" ile kümülatif işlem toplamı MASAK eşiğini aştı: ${data.total.toLocaleString("tr-TR")} TL (${data.count} işlem, 30 gün)`,
          severity: "high",
          requiresSTR: true,
        });
      }
    }

    // Structuring detection: Multiple transactions just below threshold (smurfing/yapılandırma)
    const justBelowThreshold = transactions.filter((txn) => {
      const amount = txn.lines.reduce(
        (sum, line) => sum + Number(line.debitAmount) + Number(line.creditAmount),
        0
      );
      return amount >= this.MASAK_CASH_THRESHOLD * 0.6 && amount < this.MASAK_CASH_THRESHOLD;
    });

    if (justBelowThreshold.length >= 3) {
      const totalStructured = justBelowThreshold.reduce((sum, txn) => {
        return sum + txn.lines.reduce(
          (lineSum, line) => lineSum + Number(line.debitAmount) + Number(line.creditAmount),
          0
        );
      }, 0);

      alerts.push({
        type: "STRUCTURED_TRANSACTION",
        clientCompanyId,
        amount: totalStructured,
        threshold: this.MASAK_CASH_THRESHOLD,
        description: `Yapılandırılmış işlem şüphesi: ${justBelowThreshold.length} adet eşik altı işlem tespit edildi (Toplam: ${totalStructured.toLocaleString("tr-TR")} TL). Bu, MASAK eşiğinden kaçınma girişimi olabilir.`,
        severity: "high",
        requiresSTR: true,
      });
    }

    // Rapid cash movement: Large amounts moving in short time periods
    const sortedByDate = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
    for (let i = 0; i < sortedByDate.length - 2; i++) {
      const window = sortedByDate.slice(i, i + 3);
      const firstDate = window[0].date;
      const lastDate = window[window.length - 1].date;
      const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff <= 3) {
        const windowTotal = window.reduce((sum, txn) => {
          return sum + txn.lines.reduce(
            (lineSum, line) => lineSum + Number(line.debitAmount) + Number(line.creditAmount),
            0
          );
        }, 0);

        if (windowTotal >= this.MASAK_CASH_THRESHOLD * 1.5) {
          alerts.push({
            type: "RAPID_CASH_MOVEMENT",
            clientCompanyId,
            amount: windowTotal,
            threshold: this.MASAK_CASH_THRESHOLD * 1.5,
            description: `Hızlı nakit hareketi tespit edildi: ${daysDiff.toFixed(1)} gün içinde ${windowTotal.toLocaleString("tr-TR")} TL`,
            severity: "high",
            requiresSTR: true,
          });
          break; // Only report once per analysis
        }
      }
    }

    // Create risk alerts for high severity items
    const { riskAlertService } = await import("./risk-alert-service");
    for (const alert of alerts.filter(a => a.severity === "high")) {
      await riskAlertService.createAlert({
        tenantId,
        clientCompanyId,
        documentId: null,
        type: "MASAK_THRESHOLD",
        title: alert.type === "STRUCTURED_TRANSACTION"
          ? "MASAK Yapılandırılmış İşlem Şüphesi"
          : alert.type === "CUMULATIVE_THRESHOLD"
            ? "MASAK Kümülatif Eşik Aşımı"
            : alert.type === "RAPID_CASH_MOVEMENT"
              ? "Hızlı Nakit Hareketi"
              : "MASAK Nakit İşlem Eşik Aşımı",
        message: alert.description,
        severity: alert.severity,
        status: "open",
      });
    }

    return alerts;
  }

  /**
   * Calculate business day deadline
   */
  private calculateDeadline(startDate: Date, businessDays: number): Date {
    const date = new Date(startDate);
    let daysAdded = 0;
    while (daysAdded < businessDays) {
      date.setDate(date.getDate() + 1);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }
    return date;
  }
}

export const masakStrService = new MasakStrService();
