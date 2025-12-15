import { prisma } from "../lib/prisma";
import { riskService } from "./risk-service";
import { riskTrendsService } from "./risk-trends-service";
import { riskBreakdownService } from "./risk-breakdown-service";
import { riskRecommendationsService } from "./risk-recommendations-service";

export class RiskExportService {
  /**
   * Export risk dashboard data as CSV
   */
  async exportDashboardAsCSV(tenantId: string): Promise<string> {
    const dashboard = await riskService.getTenantRiskDashboard(tenantId);
    const breakdown = await riskBreakdownService.getTenantRiskBreakdown(tenantId);
    const recommendations = await riskRecommendationsService.getRecommendations(tenantId);

    // Build CSV content
    const lines: string[] = [];

    // Header
    lines.push("Risk Dashboard Raporu");
    lines.push(`Oluşturulma Tarihi: ${new Date().toLocaleString("tr-TR")}`);
    lines.push("");

    // Dashboard Metrics
    lines.push("Genel Metrikler");
    lines.push("Metrik,Değer");
    lines.push(`Yüksek Riskli Müşteri Sayısı,${dashboard.highRiskClientCount}`);
    lines.push(`Açık Kritik Uyarı Sayısı,${dashboard.openCriticalAlertsCount}`);
    lines.push(`Toplam Belge Sayısı,${dashboard.totalDocuments}`);
    lines.push(`Yüksek Riskli Belge Sayısı,${dashboard.highRiskDocumentsCount}`);
    lines.push("");

    // Risk Distribution
    lines.push("Risk Dağılımı");
    lines.push("Seviye,Sayı");
    lines.push(`Düşük,${dashboard.clientRiskDistribution.low}`);
    lines.push(`Orta,${dashboard.clientRiskDistribution.medium}`);
    lines.push(`Yüksek,${dashboard.clientRiskDistribution.high}`);
    lines.push("");

    // Risk Breakdown
    lines.push("Risk Kategorileri");
    lines.push("Kategori,Skor,Yüzde");
    lines.push(`Dolandırıcılık,${breakdown.categoryBreakdown.fraud.score.toFixed(2)},${breakdown.categoryBreakdown.fraud.percentage.toFixed(2)}%`);
    lines.push(`Uyumluluk,${breakdown.categoryBreakdown.compliance.score.toFixed(2)},${breakdown.categoryBreakdown.compliance.percentage.toFixed(2)}%`);
    lines.push(`Finansal,${breakdown.categoryBreakdown.financial.score.toFixed(2)},${breakdown.categoryBreakdown.financial.percentage.toFixed(2)}%`);
    lines.push(`Operasyonel,${breakdown.categoryBreakdown.operational.score.toFixed(2)},${breakdown.categoryBreakdown.operational.percentage.toFixed(2)}%`);
    lines.push("");

    // Top Risk Factors
    lines.push("En Önemli Risk Faktörleri");
    lines.push("Faktör,Katkı,Şiddet");
    breakdown.topRiskFactors.forEach((factor) => {
      lines.push(`${factor.name},${(factor.contribution * 100).toFixed(2)}%,${factor.severity}`);
    });
    lines.push("");

    // Recommendations
    lines.push("Öneriler");
    lines.push("Tip,Öncelik,Başlık,Açıklama");
    recommendations.forEach((rec) => {
      // Escape quotes in CSV
      const escapedTitle = rec.title.replace(/"/g, '""');
      const escapedDescription = rec.description.replace(/"/g, '""');
      lines.push(`${rec.type},${rec.priority},"${escapedTitle}","${escapedDescription}"`);
    });

    // Add UTF-8 BOM for proper encoding (especially for Turkish characters)
    const csvContent = lines.join("\n");
    const BOM = "\uFEFF";
    return BOM + csvContent;
  }

  /**
   * Export risk dashboard data as JSON
   */
  async exportDashboardAsJSON(tenantId: string): Promise<any> {
    const dashboard = await riskService.getTenantRiskDashboard(tenantId);
    const breakdown = await riskBreakdownService.getTenantRiskBreakdown(tenantId);
    const recommendations = await riskRecommendationsService.getRecommendations(tenantId);
    const trends = await riskTrendsService.getDashboardTrends(tenantId, "30d");

    return {
      exportDate: new Date().toISOString(),
      dashboard,
      breakdown,
      recommendations,
      trends,
    };
  }

  /**
   * Get export data for frontend to generate PDF
   */
  async getExportData(tenantId: string): Promise<{
    dashboard: any;
    breakdown: any;
    recommendations: any;
    trends: any;
  }> {
    const dashboard = await riskService.getTenantRiskDashboard(tenantId);
    const breakdown = await riskBreakdownService.getTenantRiskBreakdown(tenantId);
    const recommendations = await riskRecommendationsService.getRecommendations(tenantId);
    const trends = await riskTrendsService.getDashboardTrends(tenantId, "30d");

    return {
      dashboard,
      breakdown,
      recommendations,
      trends,
    };
  }
}

export const riskExportService = new RiskExportService();


