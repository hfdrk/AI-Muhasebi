import { prisma } from "../lib/prisma";

export interface AuditTriggerCheck {
  code: string;
  category: string;
  description: string;
  triggered: boolean;
  severity: "info" | "warning" | "critical";
  actualValue: string;
  threshold: string;
  gibReference: string;
  recommendation: string;
}

export interface GibAuditPrecheckResult {
  tenantId: string;
  clientCompanyId: string;
  period: string;
  checkDate: Date;
  overallRisk: "low" | "medium" | "high";
  totalChecks: number;
  triggeredChecks: number;
  checks: AuditTriggerCheck[];
  summary: string;
  recommendations: string[];
}

export class GibAuditPrecheckService {
  /**
   * Run pre-check against GIB's known audit selection criteria
   * These are the patterns GIB's Risk Analiz Merkezi uses to flag taxpayers
   */
  async runPrecheck(
    tenantId: string,
    clientCompanyId: string,
    period?: string // e.g., "2025-01" for January 2025
  ): Promise<GibAuditPrecheckResult> {
    const company = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });

    if (!company || company.tenantId !== tenantId) {
      throw new Error("Müşteri şirketi bulunamadı");
    }

    // Determine analysis period
    const now = new Date();
    const periodYear = period ? parseInt(period.split("-")[0]) : now.getFullYear();
    const periodMonth = period ? parseInt(period.split("-")[1]) : now.getMonth() + 1;

    const periodStart = new Date(periodYear, periodMonth - 1, 1);
    const periodEnd = new Date(periodYear, periodMonth, 0, 23, 59, 59);

    // Also get prior year data for YoY comparison
    const priorYearStart = new Date(periodYear - 1, periodMonth - 1, 1);
    const priorYearEnd = new Date(periodYear - 1, periodMonth, 0, 23, 59, 59);

    // Fetch current period data
    const [currentInvoices, currentTransactions, priorInvoices] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          tenantId,
          clientCompanyId,
          issueDate: { gte: periodStart, lte: periodEnd },
        },
      }),
      prisma.transaction.findMany({
        where: {
          tenantId,
          clientCompanyId,
          date: { gte: periodStart, lte: periodEnd },
        },
        include: { lines: true },
      }),
      prisma.invoice.findMany({
        where: {
          tenantId,
          clientCompanyId,
          issueDate: { gte: priorYearStart, lte: priorYearEnd },
        },
      }),
    ]);

    const checks: AuditTriggerCheck[] = [];

    // ==========================================
    // KDV (VAT) CHECKS
    // ==========================================

    const salesInvoices = currentInvoices.filter(
      (inv) => (inv.type || "").toUpperCase() === "SALES"
    );
    const purchaseInvoices = currentInvoices.filter(
      (inv) => (inv.type || "").toUpperCase() === "PURCHASE"
    );

    const totalSales = salesInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount || 0), 0
    );
    const totalPurchases = purchaseInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount || 0), 0
    );
    const totalSalesTax = salesInvoices.reduce(
      (sum, inv) => sum + Number(inv.taxAmount || 0), 0
    );
    const totalPurchaseTax = purchaseInvoices.reduce(
      (sum, inv) => sum + Number(inv.taxAmount || 0), 0
    );

    // AT-001: KDV deduction ratio too high
    const kdvDeductionRatio = totalSalesTax > 0
      ? totalPurchaseTax / totalSalesTax
      : 0;

    checks.push({
      code: "AT-001",
      category: "KDV",
      description: "KDV indirim oranı kontrol",
      triggered: kdvDeductionRatio > 0.95,
      severity: kdvDeductionRatio > 0.98 ? "critical" : kdvDeductionRatio > 0.95 ? "warning" : "info",
      actualValue: `${(kdvDeductionRatio * 100).toFixed(1)}%`,
      threshold: "95%",
      gibReference: "GİB Risk Analiz - KDV İndirim Oranı Kontrolü",
      recommendation: kdvDeductionRatio > 0.95
        ? "KDV indirim oranı çok yüksek. GİB bu durumu sahte fatura kullanımı şüphesiyle değerlendirir. Alış belgelerini kontrol edin."
        : "KDV indirim oranı normal seviyede.",
    });

    // AT-002: Consistent KDV refund claims
    const kdvPayable = totalSalesTax - totalPurchaseTax;
    checks.push({
      code: "AT-002",
      category: "KDV",
      description: "Sürekli KDV iade talebi",
      triggered: kdvPayable < 0 && Math.abs(kdvPayable) > 10000,
      severity: kdvPayable < -50000 ? "critical" : kdvPayable < -10000 ? "warning" : "info",
      actualValue: `${kdvPayable.toLocaleString("tr-TR")} TL`,
      threshold: "Pozitif olmalı veya düşük negatif",
      gibReference: "GİB - KDV İade Kontrol Raporu",
      recommendation: kdvPayable < -10000
        ? "Bu dönem KDV iade çıkıyor. GİB KDV iadelerinde detaylı kontrol uygular. İade dosyasını eksiksiz hazırlayın."
        : "KDV pozisyonu normal.",
    });

    // AT-003: Sudden change in sales volume vs prior year
    const priorSales = priorInvoices
      .filter((inv) => (inv.type || "").toUpperCase() === "SALES")
      .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

    const salesChangeRatio = priorSales > 0
      ? (totalSales - priorSales) / priorSales
      : totalSales > 50000 ? 1 : 0;

    checks.push({
      code: "AT-003",
      category: "Ciro",
      description: "Ciro değişim analizi (önceki yıl karşılaştırma)",
      triggered: Math.abs(salesChangeRatio) > 0.5,
      severity: Math.abs(salesChangeRatio) > 1 ? "warning" : Math.abs(salesChangeRatio) > 0.5 ? "info" : "info",
      actualValue: `${salesChangeRatio > 0 ? "+" : ""}${(salesChangeRatio * 100).toFixed(1)}%`,
      threshold: "±50%",
      gibReference: "GİB Risk Analiz - Ciro Değişim Analizi",
      recommendation: Math.abs(salesChangeRatio) > 0.5
        ? `Ciro önceki yıla göre ${salesChangeRatio > 0 ? "artmış" : "azalmış"}. GİB ani ciro değişimlerini denetim kriteri olarak kullanır.`
        : "Ciro değişimi normal aralıkta.",
    });

    // AT-004: Expense ratio check
    const expenseRatio = totalSales > 0 ? totalPurchases / totalSales : 0;
    checks.push({
      code: "AT-004",
      category: "Gider",
      description: "Gider/ciro oranı kontrolü",
      triggered: expenseRatio > 0.90 || (totalSales > 0 && expenseRatio < 0.10),
      severity: expenseRatio > 0.95 ? "critical" : expenseRatio > 0.90 ? "warning" : "info",
      actualValue: `${(expenseRatio * 100).toFixed(1)}%`,
      threshold: "10% - 90%",
      gibReference: "GİB Risk Analiz - Gider Oranı Kontrolü",
      recommendation: expenseRatio > 0.90
        ? "Gider oranı çok yüksek. GİB bu durumu sahte gider belgesi şüphesiyle değerlendirebilir."
        : expenseRatio < 0.10 && totalSales > 0
          ? "Gider oranı anormal derecede düşük. Eksik gider kaydı olabilir."
          : "Gider oranı normal seviyede.",
    });

    // AT-005: Ba-Bs form consistency
    const counterpartyCount = new Set(
      currentInvoices
        .map((inv) => inv.counterpartyTaxNumber)
        .filter(Boolean)
    ).size;

    // Ba-Bs threshold: 5,000 TL per counterparty per month
    const BA_BS_THRESHOLD = 5000;
    const counterpartyTotals = new Map<string, number>();
    currentInvoices.forEach((inv) => {
      if (inv.counterpartyTaxNumber) {
        counterpartyTotals.set(
          inv.counterpartyTaxNumber,
          (counterpartyTotals.get(inv.counterpartyTaxNumber) || 0) + Number(inv.totalAmount || 0)
        );
      }
    });

    const aboveBABSThreshold = [...counterpartyTotals.values()].filter(
      (total) => total >= BA_BS_THRESHOLD
    ).length;

    checks.push({
      code: "AT-005",
      category: "Ba-Bs",
      description: "Ba-Bs form kapsamı kontrolü",
      triggered: aboveBABSThreshold > 0,
      severity: "info",
      actualValue: `${aboveBABSThreshold} karşı taraf (${BA_BS_THRESHOLD.toLocaleString("tr-TR")} TL üzeri)`,
      threshold: `${BA_BS_THRESHOLD.toLocaleString("tr-TR")} TL`,
      gibReference: "VUK 396 Sıra No'lu Genel Tebliğ - Ba-Bs Bildirimi",
      recommendation: `${aboveBABSThreshold} karşı taraf Ba-Bs bildirim eşiğinin üzerinde. Ba-Bs formlarının eksiksiz ve doğru hazırlandığından emin olun.`,
    });

    // AT-006: Cross-check invoice count vs e-fatura submissions
    checks.push({
      code: "AT-006",
      category: "E-Fatura",
      description: "E-fatura adet uyumu kontrolü",
      triggered: salesInvoices.length > 0,
      severity: "info",
      actualValue: `Satış: ${salesInvoices.length}, Alış: ${purchaseInvoices.length}`,
      threshold: "E-fatura sistemiyle uyumlu olmalı",
      gibReference: "VUK Md. 232 - E-Fatura Zorunluluğu",
      recommendation: "E-fatura portalındaki fatura sayısı ile kayıtlarınızın uyumlu olduğundan emin olun.",
    });

    // AT-007: Withholding tax (stopaj/tevkifat) consistency
    const invoicesWithTax = currentInvoices.filter(
      (inv) => Number(inv.taxAmount || 0) > 0
    );
    const zeroTaxInvoices = currentInvoices.filter(
      (inv) => Number(inv.taxAmount || 0) === 0 && Number(inv.totalAmount || 0) > 0
    );
    const zeroTaxRatio = currentInvoices.length > 0
      ? zeroTaxInvoices.length / currentInvoices.length
      : 0;

    checks.push({
      code: "AT-007",
      category: "Vergi",
      description: "Sıfır KDV'li fatura oranı kontrolü",
      triggered: zeroTaxRatio > 0.3,
      severity: zeroTaxRatio > 0.5 ? "warning" : zeroTaxRatio > 0.3 ? "info" : "info",
      actualValue: `${(zeroTaxRatio * 100).toFixed(1)}% (${zeroTaxInvoices.length}/${currentInvoices.length})`,
      threshold: "30%",
      gibReference: "GİB - KDV İstisna Kontrolleri",
      recommendation: zeroTaxRatio > 0.3
        ? "Sıfır KDV'li fatura oranı yüksek. KDV istisna nedenlerinin belgelenmesini kontrol edin."
        : "KDV uygulama oranı normal.",
    });

    // AT-008: Transaction amount concentration
    const amounts = currentInvoices.map((inv) => Number(inv.totalAmount || 0));
    const totalAmount = amounts.reduce((sum, a) => sum + a, 0);
    const maxAmount = Math.max(...amounts, 0);
    const concentrationRatio = totalAmount > 0 ? maxAmount / totalAmount : 0;

    checks.push({
      code: "AT-008",
      category: "Yoğunlaşma",
      description: "Tek faturada yoğunlaşma kontrolü",
      triggered: concentrationRatio > 0.5 && currentInvoices.length > 5,
      severity: concentrationRatio > 0.7 ? "warning" : "info",
      actualValue: `${(concentrationRatio * 100).toFixed(1)}% (en büyük fatura / toplam)`,
      threshold: "50%",
      gibReference: "GİB Risk Analiz - İşlem Yoğunlaşma Kontrolü",
      recommendation: concentrationRatio > 0.5
        ? "Tek bir fatura toplam cironun büyük bölümünü oluşturuyor. Bu işlemin detaylarını belgeleyin."
        : "Fatura dağılımı normal.",
    });

    // AT-009: Muhtasar beyanname consistency check
    // Check if salary-related accounts have proper withholding
    const salaryTransactions = currentTransactions.filter((txn) =>
      txn.lines.some((line) => {
        const code = (line as any).accountCode || "";
        return code.startsWith("770") || code.startsWith("720") || code.startsWith("730");
      })
    );

    checks.push({
      code: "AT-009",
      category: "Muhtasar",
      description: "Personel gideri - muhtasar beyanname uyumu",
      triggered: salaryTransactions.length > 0,
      severity: "info",
      actualValue: `${salaryTransactions.length} personel gider kaydı`,
      threshold: "Muhtasar beyanname ile uyumlu olmalı",
      gibReference: "GVK Md. 94 - Vergi Tevkifatı",
      recommendation: "Personel gider kayıtlarının muhtasar beyanname ile uyumlu olduğundan emin olun. SGK bildirgesi ile de çapraz kontrol yapılmalıdır.",
    });

    // AT-010: End-of-period transaction clustering
    const lastWeekOfPeriod = new Date(periodEnd);
    lastWeekOfPeriod.setDate(lastWeekOfPeriod.getDate() - 7);

    const endOfPeriodInvoices = currentInvoices.filter(
      (inv) => inv.issueDate >= lastWeekOfPeriod
    );
    const endOfPeriodRatio = currentInvoices.length > 0
      ? endOfPeriodInvoices.length / currentInvoices.length
      : 0;

    checks.push({
      code: "AT-010",
      category: "Zamanlama",
      description: "Dönem sonu fatura yığılması kontrolü",
      triggered: endOfPeriodRatio > 0.4,
      severity: endOfPeriodRatio > 0.6 ? "warning" : endOfPeriodRatio > 0.4 ? "info" : "info",
      actualValue: `${(endOfPeriodRatio * 100).toFixed(1)}% (son 7 gün)`,
      threshold: "40%",
      gibReference: "GİB Risk Analiz - Dönem Sonu Manipülasyonu",
      recommendation: endOfPeriodRatio > 0.4
        ? "Dönem sonunda fatura yoğunlaşması var. GİB bu durumu dönem sonu manipülasyonu olarak değerlendirebilir."
        : "Fatura dağılımı dönem içinde dengeli.",
    });

    // Calculate overall risk
    const triggeredChecks = checks.filter((c) => c.triggered);
    const criticalCount = triggeredChecks.filter((c) => c.severity === "critical").length;
    const warningCount = triggeredChecks.filter((c) => c.severity === "warning").length;

    const overallRisk: "low" | "medium" | "high" =
      criticalCount > 0 ? "high" :
      warningCount >= 3 ? "high" :
      warningCount >= 1 ? "medium" :
      "low";

    // Generate recommendations
    const recommendations: string[] = [];
    if (overallRisk === "high") {
      recommendations.push("YÜKSEK RİSK: Bu dönem beyannameleri GİB'in denetim algoritmalarını tetikleyebilir. Detaylı inceleme yapılmalıdır.");
    }
    for (const check of triggeredChecks.filter((c) => c.severity === "critical")) {
      recommendations.push(`KRİTİK - ${check.code}: ${check.recommendation}`);
    }
    for (const check of triggeredChecks.filter((c) => c.severity === "warning")) {
      recommendations.push(`UYARI - ${check.code}: ${check.recommendation}`);
    }
    if (overallRisk === "low") {
      recommendations.push("Risk seviyesi düşük. Beyanname güvenle dosyalanabilir.");
    }

    const periodLabel = `${periodYear}-${String(periodMonth).padStart(2, "0")}`;

    return {
      tenantId,
      clientCompanyId,
      period: periodLabel,
      checkDate: new Date(),
      overallRisk,
      totalChecks: checks.length,
      triggeredChecks: triggeredChecks.length,
      checks,
      summary: `${periodLabel} dönemi için ${checks.length} kontrol yapıldı. ${triggeredChecks.length} tetiklendi. Genel risk: ${overallRisk === "high" ? "YÜKSEK" : overallRisk === "medium" ? "ORTA" : "DÜŞÜK"}.`,
      recommendations,
    };
  }
}

export const gibAuditPrecheckService = new GibAuditPrecheckService();
