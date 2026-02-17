import { prisma } from "../lib/prisma";

/**
 * Turkish NACE (NACE Rev. 2) sector codes mapped to typical financial ratios
 * These are approximate industry averages for Turkish businesses
 * Source: GIB sector analysis reports, TÜİK industry statistics
 */
const TURKISH_SECTOR_BENCHMARKS: Record<string, SectorBenchmark> = {
  // Manufacturing
  "10": { name: "Gıda ürünlerinin imalatı", grossMargin: [0.15, 0.35], expenseRatio: [0.60, 0.85], vatEffectiveRate: [0.08, 0.18], avgInvoiceSize: [5000, 50000], monthlyTxnCount: [50, 500] },
  "13": { name: "Tekstil ürünlerinin imalatı", grossMargin: [0.20, 0.40], expenseRatio: [0.55, 0.80], vatEffectiveRate: [0.08, 0.18], avgInvoiceSize: [3000, 40000], monthlyTxnCount: [40, 300] },
  "25": { name: "Fabrikasyon metal ürünleri imalatı", grossMargin: [0.15, 0.35], expenseRatio: [0.60, 0.85], vatEffectiveRate: [0.18, 0.20], avgInvoiceSize: [5000, 80000], monthlyTxnCount: [30, 200] },
  // Construction
  "41": { name: "Bina inşaatı", grossMargin: [0.10, 0.25], expenseRatio: [0.70, 0.90], vatEffectiveRate: [0.18, 0.20], avgInvoiceSize: [20000, 500000], monthlyTxnCount: [20, 150] },
  "42": { name: "Bina dışı yapıların inşaatı", grossMargin: [0.08, 0.20], expenseRatio: [0.75, 0.92], vatEffectiveRate: [0.18, 0.20], avgInvoiceSize: [50000, 1000000], monthlyTxnCount: [15, 100] },
  "43": { name: "Özel inşaat faaliyetleri", grossMargin: [0.12, 0.30], expenseRatio: [0.65, 0.88], vatEffectiveRate: [0.18, 0.20], avgInvoiceSize: [10000, 200000], monthlyTxnCount: [20, 120] },
  // Wholesale & Retail
  "46": { name: "Toptan ticaret", grossMargin: [0.05, 0.20], expenseRatio: [0.80, 0.95], vatEffectiveRate: [0.08, 0.20], avgInvoiceSize: [10000, 100000], monthlyTxnCount: [100, 1000] },
  "47": { name: "Perakende ticaret", grossMargin: [0.15, 0.40], expenseRatio: [0.55, 0.85], vatEffectiveRate: [0.08, 0.20], avgInvoiceSize: [100, 10000], monthlyTxnCount: [200, 5000] },
  // Transportation
  "49": { name: "Kara taşımacılığı", grossMargin: [0.10, 0.25], expenseRatio: [0.70, 0.90], vatEffectiveRate: [0.18, 0.20], avgInvoiceSize: [5000, 50000], monthlyTxnCount: [30, 200] },
  // Accommodation & Food
  "55": { name: "Konaklama", grossMargin: [0.30, 0.55], expenseRatio: [0.40, 0.70], vatEffectiveRate: [0.08, 0.10], avgInvoiceSize: [500, 5000], monthlyTxnCount: [100, 2000] },
  "56": { name: "Yiyecek ve içecek hizmeti", grossMargin: [0.40, 0.65], expenseRatio: [0.30, 0.60], vatEffectiveRate: [0.08, 0.10], avgInvoiceSize: [100, 3000], monthlyTxnCount: [200, 5000] },
  // IT & Communication
  "62": { name: "Bilgisayar programlama", grossMargin: [0.30, 0.60], expenseRatio: [0.35, 0.70], vatEffectiveRate: [0.18, 0.20], avgInvoiceSize: [5000, 100000], monthlyTxnCount: [10, 100] },
  "63": { name: "Bilgi hizmeti faaliyetleri", grossMargin: [0.35, 0.65], expenseRatio: [0.30, 0.65], vatEffectiveRate: [0.18, 0.20], avgInvoiceSize: [3000, 50000], monthlyTxnCount: [10, 80] },
  // Professional Services
  "69": { name: "Hukuk ve muhasebe faaliyetleri", grossMargin: [0.40, 0.70], expenseRatio: [0.25, 0.60], vatEffectiveRate: [0.18, 0.20], avgInvoiceSize: [2000, 30000], monthlyTxnCount: [20, 150] },
  "70": { name: "İdare merkezi faaliyetleri; danışmanlık", grossMargin: [0.35, 0.65], expenseRatio: [0.30, 0.65], vatEffectiveRate: [0.18, 0.20], avgInvoiceSize: [5000, 80000], monthlyTxnCount: [10, 80] },
  "71": { name: "Mimarlık ve mühendislik", grossMargin: [0.25, 0.50], expenseRatio: [0.45, 0.75], vatEffectiveRate: [0.18, 0.20], avgInvoiceSize: [5000, 100000], monthlyTxnCount: [10, 60] },
  // Health
  "86": { name: "İnsan sağlığı hizmetleri", grossMargin: [0.25, 0.55], expenseRatio: [0.40, 0.75], vatEffectiveRate: [0.08, 0.10], avgInvoiceSize: [200, 20000], monthlyTxnCount: [100, 3000] },
  // Education
  "85": { name: "Eğitim", grossMargin: [0.30, 0.55], expenseRatio: [0.40, 0.70], vatEffectiveRate: [0.08, 0.10], avgInvoiceSize: [500, 10000], monthlyTxnCount: [50, 500] },
  // Agriculture
  "01": { name: "Bitkisel ve hayvansal üretim", grossMargin: [0.10, 0.30], expenseRatio: [0.65, 0.90], vatEffectiveRate: [0.01, 0.10], avgInvoiceSize: [2000, 50000], monthlyTxnCount: [20, 200] },
  // Default fallback
  "99": { name: "Diğer (Varsayılan)", grossMargin: [0.15, 0.45], expenseRatio: [0.50, 0.85], vatEffectiveRate: [0.08, 0.20], avgInvoiceSize: [1000, 50000], monthlyTxnCount: [20, 300] },
};

export interface SectorBenchmark {
  name: string;
  grossMargin: [number, number]; // [min, max] expected range
  expenseRatio: [number, number];
  vatEffectiveRate: [number, number];
  avgInvoiceSize: [number, number];
  monthlyTxnCount: [number, number];
}

export interface BenchmarkDeviation {
  metric: string;
  metricLabel: string;
  actualValue: number;
  expectedRange: [number, number];
  deviationPercentage: number; // How far outside the range
  severity: "normal" | "warning" | "critical";
  description: string;
  gibRiskFactor: boolean; // Whether GIB would flag this
}

export interface SectoralBenchmarkResult {
  sectorCode: string;
  sectorName: string;
  overallDeviationScore: number; // 0-100
  deviations: BenchmarkDeviation[];
  summary: string;
  gibAuditRisk: "low" | "medium" | "high";
  recommendations: string[];
}

export class SectoralBenchmarkService {
  /**
   * Analyze a client company against its sector benchmarks
   */
  async analyzeCompany(
    tenantId: string,
    clientCompanyId: string,
    sectorCode?: string
  ): Promise<SectoralBenchmarkResult> {
    // Verify company
    const company = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });

    if (!company || company.tenantId !== tenantId) {
      throw new Error("Müşteri şirketi bulunamadı");
    }

    // Determine sector code
    const effectiveSectorCode = sectorCode || (company as any).naceCode || (company as any).sectorCode || "99";
    const sectorKey = effectiveSectorCode.substring(0, 2);
    const benchmark = TURKISH_SECTOR_BENCHMARKS[sectorKey] || TURKISH_SECTOR_BENCHMARKS["99"];

    // Get financial data for last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [invoices, transactions] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          tenantId,
          clientCompanyId,
          issueDate: { gte: twelveMonthsAgo },
        },
      }),
      prisma.transaction.findMany({
        where: {
          tenantId,
          clientCompanyId,
          date: { gte: twelveMonthsAgo },
        },
        include: { lines: true },
      }),
    ]);

    // Calculate actual metrics
    const totalRevenue = invoices
      .filter((inv) => inv.type === "SALES" || inv.type === "sales")
      .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

    const totalExpenses = invoices
      .filter((inv) => inv.type === "PURCHASE" || inv.type === "purchase")
      .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

    const totalTax = invoices.reduce((sum, inv) => sum + Number(inv.taxAmount || 0), 0);
    const totalNet = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0) - Number(inv.taxAmount || 0), 0);

    const grossMargin = totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue : 0;
    const expenseRatio = totalRevenue > 0 ? totalExpenses / totalRevenue : 0;
    const vatEffectiveRate = totalNet > 0 ? totalTax / totalNet : 0;
    const avgInvoiceSize = invoices.length > 0
      ? invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0) / invoices.length
      : 0;

    // Calculate monthly transaction count (average)
    const monthCount = Math.max(1, Math.ceil(
      (Date.now() - twelveMonthsAgo.getTime()) / (30 * 24 * 60 * 60 * 1000)
    ));
    const monthlyTxnCount = transactions.length / monthCount;

    // Compare against benchmarks
    const deviations: BenchmarkDeviation[] = [];

    // Gross Margin
    deviations.push(this.checkDeviation(
      "grossMargin",
      "Brüt Kar Marjı",
      grossMargin,
      benchmark.grossMargin,
      "Brüt kar marjı sektör ortalamasının dışında. GIB bu oranı denetim seçim kriterlerinde kullanır.",
      true
    ));

    // Expense Ratio
    deviations.push(this.checkDeviation(
      "expenseRatio",
      "Gider Oranı",
      expenseRatio,
      benchmark.expenseRatio,
      "Gider oranı sektör normlarından sapma gösteriyor. Yüksek gider oranı sahte fatura şüphesi doğurabilir.",
      true
    ));

    // VAT Effective Rate
    if (totalNet > 0) {
      deviations.push(this.checkDeviation(
        "vatEffectiveRate",
        "Efektif KDV Oranı",
        vatEffectiveRate,
        benchmark.vatEffectiveRate,
        "KDV oranı sektörel beklentilerden farklı. GIB KDV iade taleplerinde bu oranı kontrol eder.",
        true
      ));
    }

    // Average Invoice Size
    if (invoices.length > 0) {
      deviations.push(this.checkDeviation(
        "avgInvoiceSize",
        "Ortalama Fatura Tutarı",
        avgInvoiceSize,
        benchmark.avgInvoiceSize,
        "Ortalama fatura tutarı sektör ortalamasından sapma gösteriyor.",
        false
      ));
    }

    // Monthly Transaction Count
    deviations.push(this.checkDeviation(
      "monthlyTxnCount",
      "Aylık İşlem Sayısı",
      monthlyTxnCount,
      benchmark.monthlyTxnCount,
      "Aylık işlem sayısı sektör ortalamasından farklı. Çok düşük veya yüksek işlem hacmi denetim tetikleyebilir.",
      true
    ));

    // Filter out normal deviations for the result
    const significantDeviations = deviations.filter((d) => d.severity !== "normal");

    // Calculate overall deviation score
    const deviationScores = deviations.map((d) => {
      if (d.severity === "critical") return 30;
      if (d.severity === "warning") return 15;
      return 0;
    });
    const overallDeviationScore = Math.min(100, deviationScores.reduce((sum, s) => sum + s, 0));

    // Determine GIB audit risk
    const gibFlagCount = significantDeviations.filter((d) => d.gibRiskFactor).length;
    const gibAuditRisk: "low" | "medium" | "high" =
      gibFlagCount >= 3 || overallDeviationScore >= 60 ? "high" :
      gibFlagCount >= 1 || overallDeviationScore >= 30 ? "medium" :
      "low";

    // Generate recommendations
    const recommendations: string[] = [];
    for (const deviation of significantDeviations) {
      if (deviation.severity === "critical" && deviation.gibRiskFactor) {
        recommendations.push(`ACIL: ${deviation.metricLabel} sektör ortalamasından kritik sapma gösteriyor - GIB denetim riski yüksek`);
      } else if (deviation.severity === "warning") {
        recommendations.push(`UYARI: ${deviation.metricLabel} izlenmeli - ${deviation.description}`);
      }
    }

    if (gibAuditRisk === "high") {
      recommendations.push("Genel değerlendirme: Birden fazla sektörel sapma tespit edildi. VDK denetim listesine alınma riski yüksek.");
    }

    const summary = `${benchmark.name} sektörü ile karşılaştırma: ${significantDeviations.length} sapma tespit edildi. ` +
      `GIB denetim riski: ${gibAuditRisk === "high" ? "YÜKSEK" : gibAuditRisk === "medium" ? "ORTA" : "DÜŞÜK"}.`;

    return {
      sectorCode: effectiveSectorCode,
      sectorName: benchmark.name,
      overallDeviationScore,
      deviations,
      summary,
      gibAuditRisk,
      recommendations,
    };
  }

  /**
   * Check deviation from benchmark range
   */
  private checkDeviation(
    metric: string,
    metricLabel: string,
    actualValue: number,
    expectedRange: [number, number],
    description: string,
    gibRiskFactor: boolean
  ): BenchmarkDeviation {
    const [min, max] = expectedRange;
    let deviationPercentage = 0;
    let severity: "normal" | "warning" | "critical" = "normal";

    if (actualValue < min) {
      deviationPercentage = min > 0 ? ((min - actualValue) / min) * 100 : 0;
    } else if (actualValue > max) {
      deviationPercentage = max > 0 ? ((actualValue - max) / max) * 100 : 0;
    }

    if (deviationPercentage > 50) {
      severity = "critical";
    } else if (deviationPercentage > 20) {
      severity = "warning";
    }

    return {
      metric,
      metricLabel,
      actualValue,
      expectedRange,
      deviationPercentage,
      severity,
      description: severity !== "normal" ? description : `${metricLabel} sektör normları dahilinde.`,
      gibRiskFactor: gibRiskFactor && severity !== "normal",
    };
  }

  /**
   * Get available sector codes
   */
  getSectorList(): Array<{ code: string; name: string }> {
    return Object.entries(TURKISH_SECTOR_BENCHMARKS)
      .filter(([code]) => code !== "99")
      .map(([code, data]) => ({ code, name: data.name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }
}

export const sectoralBenchmarkService = new SectoralBenchmarkService();
