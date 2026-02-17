import { prisma } from "../lib/prisma";
import { logger } from "@repo/shared-utils";
import { Decimal } from "@prisma/client/runtime/library";

interface KurganAnalysisResult {
  clientCompanyId: string;
  signals: KurganSignalInput[];
  summary: string;
}

interface KurganSignalInput {
  signalType: string;
  severity: string;
  title: string;
  description: string;
  dataSource: string;
  affectedPeriod?: string;
  riskScore: number;
  financialImpact?: number;
  relatedInvoiceIds?: string[];
  relatedDocumentIds?: string[];
  recommendedAction?: string;
}

interface ListSignalsParams {
  clientCompanyId?: string;
  status?: string;
  severity?: string;
  signalType?: string;
  page?: number;
  pageSize?: number;
}

class KurganMonitorService {
  /**
   * Get KURGAN dashboard statistics
   */
  async getDashboardStats(tenantId: string) {
    const [
      totalSignals,
      newSignals,
      investigatingSignals,
      criticalSignals,
      recentSignals,
      signalsByType,
      signalsBySeverity,
    ] = await Promise.all([
      prisma.kurganSignal.count({ where: { tenantId } }),
      prisma.kurganSignal.count({ where: { tenantId, status: "new" } }),
      prisma.kurganSignal.count({ where: { tenantId, status: "investigating" } }),
      prisma.kurganSignal.count({ where: { tenantId, severity: "critical" } }),
      prisma.kurganSignal.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { clientCompany: { select: { name: true } } },
      }),
      prisma.kurganSignal.groupBy({
        by: ["signalType"],
        where: { tenantId },
        _count: true,
      }),
      prisma.kurganSignal.groupBy({
        by: ["severity"],
        where: { tenantId },
        _count: true,
      }),
    ]);

    return {
      totalSignals,
      newSignals,
      investigatingSignals,
      criticalSignals,
      recentSignals: recentSignals.map((s) => ({
        id: s.id,
        clientCompanyName: s.clientCompany.name,
        signalType: s.signalType,
        severity: s.severity,
        status: s.status,
        title: s.title,
        riskScore: s.riskScore,
        createdAt: s.createdAt,
      })),
      signalsByType: signalsByType.map((s) => ({
        type: s.signalType,
        count: s._count,
      })),
      signalsBySeverity: signalsBySeverity.map((s) => ({
        severity: s.severity,
        count: s._count,
      })),
    };
  }

  /**
   * Analyze a company for KURGAN risk signals
   */
  async analyzeCompany(tenantId: string, clientCompanyId: string): Promise<KurganAnalysisResult> {
    const signals: KurganSignalInput[] = [];
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Get recent data for analysis
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [invoices, transactions] = await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId, clientCompanyId, issueDate: { gte: threeMonthsAgo } },
        orderBy: { issueDate: "desc" },
      }),
      prisma.transaction.findMany({
        where: { tenantId, clientCompanyId, date: { gte: threeMonthsAgo } },
        include: { lines: true },
        orderBy: { date: "desc" },
      }),
    ]);

    // Compute net amount per transaction from its lines
    const txnsWithAmount = transactions.map((t) => {
      const netAmount = t.lines.reduce(
        (sum, l) => sum + Number(l.debitAmount) - Number(l.creditAmount),
        0
      );
      return { ...t, netAmount };
    });

    // Check 1: Fake invoice patterns - invoices without matching transactions
    const invoiceAmounts = invoices.map((inv) => ({
      id: inv.id,
      amount: Number(inv.totalAmount),
      date: inv.issueDate,
    }));

    const unmatchedInvoices = invoiceAmounts.filter((inv) => {
      const matchingTxn = txnsWithAmount.find(
        (t) => Math.abs(Math.abs(t.netAmount) - inv.amount) < 1 // within 1 TRY
      );
      return !matchingTxn && inv.amount > 50000;
    });

    if (unmatchedInvoices.length >= 2) {
      signals.push({
        signalType: "fake_invoice",
        severity: unmatchedInvoices.length >= 5 ? "critical" : "high",
        title: "Sahte fatura şüphesi",
        description: `${unmatchedInvoices.length} adet yüksek tutarlı fatura için eşleşen ödeme/tahsilat bulunamadı`,
        dataSource: "e_fatura",
        affectedPeriod: currentPeriod,
        riskScore: Math.min(unmatchedInvoices.length * 15, 95),
        financialImpact: unmatchedInvoices.reduce((sum, inv) => sum + inv.amount, 0),
        relatedInvoiceIds: unmatchedInvoices.map((inv) => inv.id),
        recommendedAction: "Faturaların gerçekliğini kontrol edin ve karşı taraf ile mutabakat yapın",
      });
    }

    // Check 2: Income mismatch - large discrepancies between income/expense patterns
    const totalIncome = txnsWithAmount.filter((t) => t.netAmount > 0).reduce((s, t) => s + t.netAmount, 0);
    const totalExpense = txnsWithAmount.filter((t) => t.netAmount < 0).reduce((s, t) => s + Math.abs(t.netAmount), 0);

    if (totalIncome > 0 && totalExpense > totalIncome * 1.5) {
      signals.push({
        signalType: "income_mismatch",
        severity: "high",
        title: "Gelir-gider uyumsuzluğu",
        description: `Giderler gelirlerin ${((totalExpense / totalIncome) * 100).toFixed(0)}%'i oranında, anormal yüksek`,
        dataSource: "bank_data",
        affectedPeriod: currentPeriod,
        riskScore: 70,
        financialImpact: totalExpense - totalIncome,
        recommendedAction: "Gider kalemlerini detaylı inceleyin, kayıt dışı gelir olasılığını araştırın",
      });
    }

    // Check 3: VAT anomaly - unusually high VAT deductions
    const vatInvoices = invoices.filter((inv) => Number(inv.taxAmount) > 0);
    const totalVat = vatInvoices.reduce((sum, inv) => sum + Number(inv.taxAmount), 0);
    const totalBase = vatInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount) - Number(inv.taxAmount), 0);

    if (totalBase > 0 && totalVat / totalBase > 0.25) {
      signals.push({
        signalType: "vat_anomaly",
        severity: "medium",
        title: "KDV anomalisi",
        description: `Ortalama KDV oranı ${((totalVat / totalBase) * 100).toFixed(1)}% - sektör ortalamasının üzerinde`,
        dataSource: "e_fatura",
        affectedPeriod: currentPeriod,
        riskScore: 55,
        financialImpact: totalVat,
        recommendedAction: "KDV indirim belgelerini kontrol edin",
      });
    }

    // Check 4: Cross-company patterns - same counterparty appearing in both income and expense
    const counterparties = new Map<string, { income: number; expense: number }>();
    for (const inv of invoices) {
      const name = inv.counterpartyName || "unknown";
      if (!counterparties.has(name)) counterparties.set(name, { income: 0, expense: 0 });
      const entry = counterparties.get(name)!;
      if (inv.type === "SATIŞ") {
        entry.income += Number(inv.totalAmount);
      } else {
        entry.expense += Number(inv.totalAmount);
      }
    }

    const circularCounterparties = Array.from(counterparties.entries()).filter(
      ([, v]) => v.income > 10000 && v.expense > 10000
    );

    if (circularCounterparties.length > 0) {
      signals.push({
        signalType: "cross_company_pattern",
        severity: "high",
        title: "Döngüsel işlem şüphesi",
        description: `${circularCounterparties.length} karşı taraf ile hem alış hem satış tespit edildi`,
        dataSource: "e_fatura",
        affectedPeriod: currentPeriod,
        riskScore: 65,
        recommendedAction: "Döngüsel faturaları detaylı inceleyin, ilişkili şirket kontrolü yapın",
      });
    }

    return {
      clientCompanyId,
      signals,
      summary:
        signals.length === 0
          ? "KURGAN analizi tamamlandı. Şüpheli sinyal tespit edilmedi."
          : `${signals.length} adet risk sinyali tespit edildi.`,
    };
  }

  /**
   * Save analysis signals to database
   */
  async saveSignals(tenantId: string, clientCompanyId: string, signals: KurganSignalInput[]) {
    const created = await prisma.kurganSignal.createMany({
      data: signals.map((s) => ({
        tenantId,
        clientCompanyId,
        signalType: s.signalType,
        severity: s.severity,
        status: "new",
        title: s.title,
        description: s.description,
        dataSource: s.dataSource,
        affectedPeriod: s.affectedPeriod,
        riskScore: new Decimal(s.riskScore),
        financialImpact: s.financialImpact != null ? new Decimal(s.financialImpact) : null,
        relatedInvoiceIds: s.relatedInvoiceIds || [],
        relatedDocumentIds: s.relatedDocumentIds || [],
        recommendedAction: s.recommendedAction,
      })),
    });

    logger.info("KURGAN signals saved", undefined, { tenantId, count: created.count });
    return created;
  }

  /**
   * List KURGAN signals with filtering
   */
  async listSignals(tenantId: string, params: ListSignalsParams) {
    const { clientCompanyId, status, severity, signalType, page = 1, pageSize = 20 } = params;
    const where: any = { tenantId };
    if (clientCompanyId) where.clientCompanyId = clientCompanyId;
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (signalType) where.signalType = signalType;

    const [signals, total] = await Promise.all([
      prisma.kurganSignal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { clientCompany: { select: { name: true } } },
      }),
      prisma.kurganSignal.count({ where }),
    ]);

    return {
      signals,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Update signal status
   */
  async updateSignalStatus(
    tenantId: string,
    signalId: string,
    userId: string,
    status: string,
    responseNotes?: string
  ) {
    const signal = await prisma.kurganSignal.findFirst({
      where: { id: signalId, tenantId },
    });
    if (!signal) throw new Error("KURGAN sinyali bulunamadı");

    return prisma.kurganSignal.update({
      where: { id: signalId },
      data: {
        status,
        responseNotes,
        respondedAt: new Date(),
        respondedByUserId: userId,
      },
      include: { clientCompany: { select: { name: true } } },
    });
  }
}

export const kurganMonitorService = new KurganMonitorService();
