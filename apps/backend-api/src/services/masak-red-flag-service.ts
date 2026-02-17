import { prisma } from "../lib/prisma";

/**
 * MASAK Red Flag Checklist for Mali Müşavirs
 * Based on MASAK's published guidance for obliged parties (yükümlüler)
 * under Law 5549 and related regulations
 */

export interface RedFlagCheckResult {
  code: string;
  category: string;
  description: string;
  triggered: boolean;
  severity: "low" | "medium" | "high" | "critical";
  evidence: string[];
  regulatoryReference: string;
  requiresSTR: boolean; // Whether this flag alone warrants a Suspicious Transaction Report
}

export interface MasakRedFlagReport {
  tenantId: string;
  clientCompanyId: string;
  companyName: string;
  assessmentDate: Date;
  overallRiskLevel: "low" | "medium" | "high" | "critical";
  totalFlags: number;
  triggeredFlags: number;
  strRequired: boolean;
  results: RedFlagCheckResult[];
  recommendations: string[];
}

export class MasakRedFlagService {
  /**
   * Run full MASAK red flag assessment for a client company
   */
  async assessClientCompany(
    tenantId: string,
    clientCompanyId: string
  ): Promise<MasakRedFlagReport> {
    const company = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });

    if (!company || company.tenantId !== tenantId) {
      throw new Error("Müşteri şirketi bulunamadı");
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Fetch all relevant data
    const [invoices, transactions, documents, riskScores] = await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId, clientCompanyId, issueDate: { gte: twelveMonthsAgo } },
        orderBy: { issueDate: "desc" },
      }),
      prisma.transaction.findMany({
        where: { tenantId, clientCompanyId, date: { gte: twelveMonthsAgo } },
        include: { lines: true },
        orderBy: { date: "desc" },
      }),
      prisma.document.findMany({
        where: { tenantId, clientCompanyId, isDeleted: false, createdAt: { gte: twelveMonthsAgo } },
      }),
      prisma.documentRiskScore.findMany({
        where: {
          tenantId,
          document: { clientCompanyId, isDeleted: false },
          generatedAt: { gte: twelveMonthsAgo },
        },
      }),
    ]);

    const results: RedFlagCheckResult[] = [];

    // ==========================================
    // CATEGORY 1: CASH TRANSACTION RED FLAGS
    // ==========================================

    // RF-001: Large cash transactions near MASAK threshold
    const MASAK_THRESHOLD = 290000;
    const largeTransactions = transactions.filter((txn) => {
      const amount = txn.lines.reduce(
        (sum, line) => sum + Number(line.debitAmount) + Number(line.creditAmount), 0
      );
      return amount >= MASAK_THRESHOLD * 0.8;
    });

    results.push({
      code: "RF-001",
      category: "Nakit İşlemler",
      description: "MASAK eşiğine yakın veya üzerinde nakit işlemler",
      triggered: largeTransactions.length > 0,
      severity: largeTransactions.length > 0 ? "critical" : "low",
      evidence: largeTransactions.length > 0
        ? [`${largeTransactions.length} adet büyük işlem tespit edildi`]
        : [],
      regulatoryReference: "5549 sayılı Kanun, Md. 4 - Şüpheli İşlem Bildirimi",
      requiresSTR: largeTransactions.some((txn) => {
        const amount = txn.lines.reduce(
          (sum, line) => sum + Number(line.debitAmount) + Number(line.creditAmount), 0
        );
        return amount >= MASAK_THRESHOLD;
      }),
    });

    // RF-002: Structuring (smurfing) - multiple transactions just below threshold
    const belowThreshold = transactions.filter((txn) => {
      const amount = txn.lines.reduce(
        (sum, line) => sum + Number(line.debitAmount) + Number(line.creditAmount), 0
      );
      return amount >= MASAK_THRESHOLD * 0.5 && amount < MASAK_THRESHOLD;
    });

    results.push({
      code: "RF-002",
      category: "Nakit İşlemler",
      description: "Yapılandırılmış işlem şüphesi (eşik altı parçalama)",
      triggered: belowThreshold.length >= 3,
      severity: belowThreshold.length >= 5 ? "critical" : belowThreshold.length >= 3 ? "high" : "low",
      evidence: belowThreshold.length >= 3
        ? [`${belowThreshold.length} adet eşik altı işlem (${MASAK_THRESHOLD * 0.5}-${MASAK_THRESHOLD} TL arası)`]
        : [],
      regulatoryReference: "MASAK Genel Tebliği Sıra No: 5, Md. 27",
      requiresSTR: belowThreshold.length >= 5,
    });

    // ==========================================
    // CATEGORY 2: COUNTERPARTY RED FLAGS
    // ==========================================

    // RF-003: Transactions with new/unknown counterparties
    const uniqueCounterparties = new Set(
      invoices.map((inv) => inv.counterpartyName).filter(Boolean)
    );
    const recentCounterparties = invoices
      .filter((inv) => {
        const daysAgo = (Date.now() - inv.issueDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 90 && inv.counterpartyName;
      })
      .map((inv) => inv.counterpartyName);

    const newCounterparties = new Set(recentCounterparties);
    const historicalCounterparties = new Set(
      invoices
        .filter((inv) => {
          const daysAgo = (Date.now() - inv.issueDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo > 90 && inv.counterpartyName;
        })
        .map((inv) => inv.counterpartyName)
    );

    const trulyNewCount = [...newCounterparties].filter(
      (cp) => cp && !historicalCounterparties.has(cp)
    ).length;

    results.push({
      code: "RF-003",
      category: "Karşı Taraf",
      description: "Son 90 günde yeni karşı taraflarla işlem artışı",
      triggered: trulyNewCount >= 5,
      severity: trulyNewCount >= 10 ? "high" : trulyNewCount >= 5 ? "medium" : "low",
      evidence: trulyNewCount >= 5
        ? [`${trulyNewCount} yeni karşı taraf son 90 günde eklenmiş`]
        : [],
      regulatoryReference: "MASAK Rehberi - Müşteri Tanıma (KYC) Yükümlülüğü",
      requiresSTR: false,
    });

    // RF-004: High concentration to single counterparty
    const counterpartyAmounts = new Map<string, number>();
    invoices.forEach((inv) => {
      if (inv.counterpartyName) {
        counterpartyAmounts.set(
          inv.counterpartyName,
          (counterpartyAmounts.get(inv.counterpartyName) || 0) + Number(inv.totalAmount || 0)
        );
      }
    });

    const totalInvoiceAmount = invoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount || 0), 0
    );
    let maxConcentration = 0;
    let dominantCounterparty = "";
    for (const [cp, amount] of counterpartyAmounts.entries()) {
      const ratio = totalInvoiceAmount > 0 ? amount / totalInvoiceAmount : 0;
      if (ratio > maxConcentration) {
        maxConcentration = ratio;
        dominantCounterparty = cp;
      }
    }

    results.push({
      code: "RF-004",
      category: "Karşı Taraf",
      description: "Tek karşı tarafa aşırı yoğunlaşma",
      triggered: maxConcentration > 0.6,
      severity: maxConcentration > 0.8 ? "high" : maxConcentration > 0.6 ? "medium" : "low",
      evidence: maxConcentration > 0.6
        ? [`"${dominantCounterparty}": toplam cironun ${(maxConcentration * 100).toFixed(1)}%'i`]
        : [],
      regulatoryReference: "VUK Md. 134 - Vergi İncelemesi",
      requiresSTR: false,
    });

    // ==========================================
    // CATEGORY 3: INVOICE RED FLAGS
    // ==========================================

    // RF-005: Duplicate or very similar invoices
    const invoiceGroups = new Map<string, number>();
    invoices.forEach((inv) => {
      const key = `${inv.counterpartyName}-${inv.totalAmount}`;
      invoiceGroups.set(key, (invoiceGroups.get(key) || 0) + 1);
    });
    const duplicateCount = [...invoiceGroups.values()].filter((c) => c > 1).length;

    results.push({
      code: "RF-005",
      category: "Fatura",
      description: "Tekrar eden veya çok benzer faturalar (naylon fatura şüphesi)",
      triggered: duplicateCount >= 3,
      severity: duplicateCount >= 5 ? "critical" : duplicateCount >= 3 ? "high" : "low",
      evidence: duplicateCount >= 3
        ? [`${duplicateCount} adet tekrar eden fatura grubu tespit edildi`]
        : [],
      regulatoryReference: "VUK Md. 359 - Sahte veya Muhteviyatı İtibariyle Yanıltıcı Belge",
      requiresSTR: duplicateCount >= 5,
    });

    // RF-006: Round number invoices (common in fictitious invoicing)
    const roundInvoices = invoices.filter((inv) => {
      const amount = Number(inv.totalAmount || 0);
      return amount >= 1000 && amount % 1000 === 0;
    });
    const roundRatio = invoices.length > 0 ? roundInvoices.length / invoices.length : 0;

    results.push({
      code: "RF-006",
      category: "Fatura",
      description: "Yüksek oranda yuvarlak tutarlı faturalar",
      triggered: roundRatio > 0.3,
      severity: roundRatio > 0.5 ? "high" : roundRatio > 0.3 ? "medium" : "low",
      evidence: roundRatio > 0.3
        ? [`${roundInvoices.length}/${invoices.length} fatura yuvarlak tutarlı (${(roundRatio * 100).toFixed(1)}%)`]
        : [],
      regulatoryReference: "GIB Risk Analiz Kriterleri",
      requiresSTR: false,
    });

    // RF-007: Invoice number sequence gaps
    const sortedInvoiceNumbers = invoices
      .filter((inv) => inv.externalId)
      .map((inv) => {
        const match = (inv.externalId || "").match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);

    let gapCount = 0;
    for (let i = 1; i < sortedInvoiceNumbers.length; i++) {
      if (sortedInvoiceNumbers[i] - sortedInvoiceNumbers[i - 1] > 10) {
        gapCount++;
      }
    }

    results.push({
      code: "RF-007",
      category: "Fatura",
      description: "Fatura numarası sırasında büyük boşluklar",
      triggered: gapCount >= 3,
      severity: gapCount >= 5 ? "high" : gapCount >= 3 ? "medium" : "low",
      evidence: gapCount >= 3
        ? [`${gapCount} adet büyük numara boşluğu tespit edildi`]
        : [],
      regulatoryReference: "VUK Md. 231 - Fatura Düzenleme",
      requiresSTR: false,
    });

    // ==========================================
    // CATEGORY 4: FINANCIAL RATIO RED FLAGS
    // ==========================================

    // RF-008: Unusual expense-to-revenue ratio
    const salesAmount = invoices
      .filter((inv) => inv.type === "SALES" || inv.type === "sales")
      .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const purchaseAmount = invoices
      .filter((inv) => inv.type === "PURCHASE" || inv.type === "purchase")
      .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const expenseRatio = salesAmount > 0 ? purchaseAmount / salesAmount : 0;

    results.push({
      code: "RF-008",
      category: "Mali Oran",
      description: "Anormal gider/gelir oranı (sektör ortalamasından sapma)",
      triggered: expenseRatio > 0.95 || (salesAmount > 0 && expenseRatio < 0.1),
      severity: expenseRatio > 0.98 ? "critical" : expenseRatio > 0.95 ? "high" : "low",
      evidence: expenseRatio > 0.95
        ? [`Gider/gelir oranı: ${(expenseRatio * 100).toFixed(1)}% - Çok yüksek gider beyanı`]
        : salesAmount > 0 && expenseRatio < 0.1
          ? [`Gider/gelir oranı: ${(expenseRatio * 100).toFixed(1)}% - Anormal derecede düşük gider`]
          : [],
      regulatoryReference: "VUK Md. 134, GIB Sektörel Analiz Kriterleri",
      requiresSTR: expenseRatio > 0.98,
    });

    // ==========================================
    // CATEGORY 5: DOCUMENT & RISK SCORE FLAGS
    // ==========================================

    // RF-009: High number of high-risk documents
    const highRiskDocs = riskScores.filter((rs) => rs.severity === "high");

    results.push({
      code: "RF-009",
      category: "Belge Riski",
      description: "Yüksek riskli belge sayısı fazla",
      triggered: highRiskDocs.length >= 5,
      severity: highRiskDocs.length >= 10 ? "critical" : highRiskDocs.length >= 5 ? "high" : "low",
      evidence: highRiskDocs.length >= 5
        ? [`${highRiskDocs.length} adet yüksek riskli belge (son 12 ay)`]
        : [],
      regulatoryReference: "MASAK Rehberi - Şüpheli İşlem Göstergeleri",
      requiresSTR: highRiskDocs.length >= 10,
    });

    // RF-010: Rapid company activity changes
    const firstHalfTxns = transactions.filter((txn) => {
      const monthsAgo = (Date.now() - txn.date.getTime()) / (30 * 24 * 60 * 60 * 1000);
      return monthsAgo >= 6;
    }).length;
    const secondHalfTxns = transactions.filter((txn) => {
      const monthsAgo = (Date.now() - txn.date.getTime()) / (30 * 24 * 60 * 60 * 1000);
      return monthsAgo < 6;
    }).length;
    const activityChange = firstHalfTxns > 0
      ? (secondHalfTxns - firstHalfTxns) / firstHalfTxns
      : secondHalfTxns > 10 ? 1 : 0;

    results.push({
      code: "RF-010",
      category: "Faaliyet Değişikliği",
      description: "Ani faaliyet hacmi değişikliği (artış veya azalış)",
      triggered: Math.abs(activityChange) > 1,
      severity: Math.abs(activityChange) > 2 ? "high" : Math.abs(activityChange) > 1 ? "medium" : "low",
      evidence: Math.abs(activityChange) > 1
        ? [`İşlem hacmi ${activityChange > 0 ? "artışı" : "azalışı"}: ${(Math.abs(activityChange) * 100).toFixed(0)}% (6 aylık karşılaştırma)`]
        : [],
      regulatoryReference: "MASAK Rehberi - İşlem Hacmi Değişiklikleri",
      requiresSTR: false,
    });

    // RF-011: Missing or incomplete documentation
    const missingDocs = documents.filter(
      (doc) => doc.status === "PENDING" || doc.status === "FAILED"
    );

    results.push({
      code: "RF-011",
      category: "Belge Eksikliği",
      description: "Eksik veya tamamlanmamış belgeler",
      triggered: missingDocs.length >= 5,
      severity: missingDocs.length >= 10 ? "high" : missingDocs.length >= 5 ? "medium" : "low",
      evidence: missingDocs.length >= 5
        ? [`${missingDocs.length} adet eksik/hatalı belge`]
        : [],
      regulatoryReference: "VUK Md. 227 - Belge Düzeni",
      requiresSTR: false,
    });

    // RF-012: Weekend/holiday transaction pattern
    const weekendTxns = transactions.filter((txn) => {
      const day = txn.date.getDay();
      return day === 0 || day === 6;
    });
    const weekendRatio = transactions.length > 0
      ? weekendTxns.length / transactions.length
      : 0;

    results.push({
      code: "RF-012",
      category: "Zamanlama",
      description: "Hafta sonu/tatil günlerinde yüksek işlem oranı",
      triggered: weekendRatio > 0.2,
      severity: weekendRatio > 0.4 ? "high" : weekendRatio > 0.2 ? "medium" : "low",
      evidence: weekendRatio > 0.2
        ? [`Hafta sonu işlem oranı: ${(weekendRatio * 100).toFixed(1)}%`]
        : [],
      regulatoryReference: "GIB Risk Analiz Kriterleri",
      requiresSTR: false,
    });

    // Calculate overall risk
    const triggeredResults = results.filter((r) => r.triggered);
    const criticalCount = triggeredResults.filter((r) => r.severity === "critical").length;
    const highCount = triggeredResults.filter((r) => r.severity === "high").length;
    const strRequired = triggeredResults.some((r) => r.requiresSTR);

    const overallRiskLevel: "low" | "medium" | "high" | "critical" =
      criticalCount > 0 || strRequired ? "critical" :
      highCount >= 3 ? "high" :
      highCount >= 1 || triggeredResults.length >= 4 ? "medium" :
      "low";

    // Generate recommendations
    const recommendations: string[] = [];
    if (strRequired) {
      recommendations.push("ACIL: MASAK'a Şüpheli İşlem Bildirimi (SİB) yapılmalıdır. 10 iş günü içinde bildirim zorunludur.");
    }
    if (criticalCount > 0) {
      recommendations.push("KRİTİK: Kritik seviyede kırmızı bayraklar tespit edildi. Detaylı inceleme yapılmalıdır.");
    }
    if (highCount >= 2) {
      recommendations.push("YÜKSEK RİSK: Birden fazla yüksek riskli gösterge mevcut. Müşteri ile görüşme yapılmalıdır.");
    }
    for (const result of triggeredResults) {
      if (result.severity === "critical" || result.severity === "high") {
        recommendations.push(`${result.code}: ${result.description} - ${result.evidence.join(", ")}`);
      }
    }
    if (overallRiskLevel === "low") {
      recommendations.push("Genel risk seviyesi düşük. Rutin takip yeterlidir.");
    }

    return {
      tenantId,
      clientCompanyId,
      companyName: company.name,
      assessmentDate: new Date(),
      overallRiskLevel,
      totalFlags: results.length,
      triggeredFlags: triggeredResults.length,
      strRequired,
      results,
      recommendations,
    };
  }
}

export const masakRedFlagService = new MasakRedFlagService();
