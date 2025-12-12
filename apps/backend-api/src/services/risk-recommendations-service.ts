import { prisma } from "../lib/prisma";

export interface RiskRecommendation {
  id: string;
  type: "urgent" | "preventive" | "optimization";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  actionUrl: string;
  actionLabel: string;
  relatedMetric: string;
  impact: string;
}

export class RiskRecommendationsService {
  /**
   * Generate actionable recommendations based on risk data
   */
  async getRecommendations(tenantId: string): Promise<RiskRecommendation[]> {
    const recommendations: RiskRecommendation[] = [];

    // Get dashboard data
    const highRiskCompaniesResult = await prisma.clientCompanyRiskScore.findMany({
      where: {
        tenantId,
        severity: "high",
      },
      distinct: ["clientCompanyId"],
      select: {
        clientCompanyId: true,
      },
    });
    const highRiskCompanies = highRiskCompaniesResult.length;

    const criticalAlerts = await prisma.riskAlert.count({
      where: {
        tenantId,
        severity: "critical",
        status: {
          in: ["open", "in_progress"],
        },
      },
    });

    const highAlerts = await prisma.riskAlert.count({
      where: {
        tenantId,
        severity: "high",
        status: {
          in: ["open", "in_progress"],
        },
      },
    });

    const highRiskDocuments = await prisma.documentRiskScore.count({
      where: {
        tenantId,
        severity: "high",
      },
    });

    // Get trend data (30 days ago vs now)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const previousHighRiskCompaniesResult = await prisma.clientCompanyRiskScore.findMany({
      where: {
        tenantId,
        severity: "high",
        generatedAt: {
          lte: thirtyDaysAgo,
        },
      },
      distinct: ["clientCompanyId"],
      select: {
        clientCompanyId: true,
      },
    });
    const previousHighRiskCompanies = previousHighRiskCompaniesResult.length;

    const riskChange = highRiskCompanies - previousHighRiskCompanies;
    const riskChangePercent =
      previousHighRiskCompanies > 0 ? (riskChange / previousHighRiskCompanies) * 100 : 0;

    // URGENT RECOMMENDATIONS

    // 1. Critical alerts need immediate attention
    if (criticalAlerts > 0) {
      recommendations.push({
        id: "urgent-critical-alerts",
        type: "urgent",
        priority: "high",
        title: `${criticalAlerts} kritik uyarı acil inceleme gerektiriyor`,
        description: `Sisteminizde ${criticalAlerts} adet kritik seviyede risk uyarısı bulunmaktadır. Bu uyarılar acil müdahale gerektirmektedir.`,
        actionUrl: "/risk/alerts?severity=critical&status=open",
        actionLabel: "Kritik Uyarıları İncele",
        relatedMetric: "openCriticalAlertsCount",
        impact: "Kritik risklerin zamanında ele alınması ciddi sorunların önlenmesine yardımcı olur.",
      });
    }

    // 2. High risk clients need review
    if (highRiskCompanies > 0) {
      recommendations.push({
        id: "urgent-high-risk-clients",
        type: "urgent",
        priority: highRiskCompanies > 5 ? "high" : "medium",
        title: `${highRiskCompanies} yüksek riskli müşteri inceleme bekliyor`,
        description: `${highRiskCompanies} müşteriniz yüksek risk kategorisinde. Bu müşterilerin detaylı analizi önerilir.`,
        actionUrl: "/musteriler?risk=high&severity=high",
        actionLabel: "Yüksek Riskli Müşterileri Görüntüle",
        relatedMetric: "highRiskClientCount",
        impact: "Yüksek riskli müşterilerin erken tespiti olası sorunların önlenmesine yardımcı olur.",
      });
    }

    // PREVENTIVE RECOMMENDATIONS

    // 3. Risk trend is increasing
    if (riskChangePercent > 15) {
      recommendations.push({
        id: "preventive-rising-risk",
        type: "preventive",
        priority: "high",
        title: `Risk skoru %${riskChangePercent.toFixed(1)} arttı - araştırma gerekli`,
        description: `Son 30 günde yüksek riskli müşteri sayısı ${riskChange > 0 ? "+" : ""}${riskChange} değişti. Bu trendin nedenlerini araştırmanız önerilir.`,
        actionUrl: "/risk/dashboard?view=trends",
        actionLabel: "Trend Analizini Görüntüle",
        relatedMetric: "highRiskClientCount",
        impact: "Rising risk trends can indicate systemic issues that need attention.",
      });
    }

    // 4. High risk documents need review
    if (highRiskDocuments > 10) {
      recommendations.push({
        id: "preventive-high-risk-docs",
        type: "preventive",
        priority: "medium",
        title: `${highRiskDocuments} yüksek riskli belge inceleme bekliyor`,
        description: `${highRiskDocuments} belgeniz yüksek risk kategorisinde. Bu belgelerin detaylı incelemesi önerilir.`,
        actionUrl: "/belgeler?risk=high&severity=high",
        actionLabel: "Yüksek Riskli Belgeleri İncele",
        relatedMetric: "highRiskDocumentsCount",
        impact: "High-risk documents may contain errors or fraud indicators.",
      });
    }

    // 5. Multiple high alerts
    if (highAlerts > 5) {
      recommendations.push({
        id: "preventive-multiple-alerts",
        type: "preventive",
        priority: "medium",
        title: `${highAlerts} yüksek seviyeli uyarı çözüm bekliyor`,
        description: `${highAlerts} adet yüksek seviyeli risk uyarısı açık durumda. Bu uyarıların gözden geçirilmesi önerilir.`,
        actionUrl: "/risk/alerts?severity=high&status=open",
        actionLabel: "Yüksek Seviyeli Uyarıları Görüntüle",
        relatedMetric: "openHighAlertsCount",
        impact: "Addressing high-level alerts prevents escalation to critical issues.",
      });
    }

    // OPTIMIZATION RECOMMENDATIONS

    // 6. Risk is decreasing - good progress
    if (riskChangePercent < -10) {
      recommendations.push({
        id: "optimization-improving-risk",
        type: "optimization",
        priority: "low",
        title: `Risk skoru %${Math.abs(riskChangePercent).toFixed(1)} azaldı - iyi ilerleme`,
        description: `Son 30 günde risk seviyeniz düşüş gösterdi. Bu olumlu bir gelişmedir.`,
        actionUrl: "/risk/dashboard?view=trends",
        actionLabel: "Trend Analizini Görüntüle",
        relatedMetric: "highRiskClientCount",
        impact: "Maintaining low risk levels improves overall business health.",
      });
    }

    // 7. No critical alerts - good status
    if (criticalAlerts === 0 && highRiskCompanies < 3) {
      recommendations.push({
        id: "optimization-low-risk",
        type: "optimization",
        priority: "low",
        title: "Risk seviyeniz düşük - iyi durum",
        description: "Şu anda kritik uyarı bulunmuyor ve yüksek riskli müşteri sayınız düşük. Risk yönetimi iyi durumda.",
        actionUrl: "/risk/dashboard",
        actionLabel: "Risk Panosunu Görüntüle",
        relatedMetric: "overallRiskLevel",
        impact: "Maintaining proactive monitoring helps sustain low risk levels.",
      });
    }

    // Sort by priority (high first, then by type: urgent > preventive > optimization)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const typeOrder = { urgent: 0, preventive: 1, optimization: 2 };

    return recommendations.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }
}

export const riskRecommendationsService = new RiskRecommendationsService();

