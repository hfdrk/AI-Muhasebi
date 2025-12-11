import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import { riskRuleService } from "./risk-rule-service";

export interface RiskExplanation {
  score: number;
  severity: "low" | "medium" | "high";
  contributingFactors: Array<{
    ruleCode: string;
    ruleDescription: string;
    weight: number;
    triggered: boolean;
  }>;
  summary: string;
  recommendations: string[];
}

export class RiskExplanationService {
  /**
   * Generate detailed explanation for a document risk score
   */
  async explainDocumentRisk(
    tenantId: string,
    documentId: string
  ): Promise<RiskExplanation> {
    // Get document risk score
    const riskScore = await prisma.documentRiskScore.findUnique({
      where: { documentId },
    });

    if (!riskScore) {
      throw new NotFoundError("Belge risk skoru bulunamadı.");
    }

    // Get risk features
    const riskFeatures = await prisma.documentRiskFeatures.findUnique({
      where: { documentId },
    });

    if (!riskFeatures) {
      throw new NotFoundError("Belge risk özellikleri bulunamadı.");
    }

    // Get all active document rules
    const allRules = await riskRuleService.loadActiveRules(tenantId);
    const documentRules = allRules.filter((r) => r.scope === "document");

    // Build contributing factors
    const contributingFactors = documentRules.map((rule) => {
      const triggeredRuleCodes = riskScore.triggeredRuleCodes as string[];
      const triggered = triggeredRuleCodes.includes(rule.code);

      return {
        ruleCode: rule.code,
        ruleDescription: rule.description,
        weight: Number(rule.weight),
        triggered,
      };
    });

    // Generate summary
    const triggeredCount = contributingFactors.filter((f) => f.triggered).length;
    const totalWeight = contributingFactors
      .filter((f) => f.triggered)
      .reduce((sum, f) => sum + f.weight, 0);

    const summary = this.generateSummary(
      Number(riskScore.score),
      riskScore.severity as "low" | "medium" | "high",
      triggeredCount,
      totalWeight
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      contributingFactors.filter((f) => f.triggered),
      Number(riskScore.score)
    );

    return {
      score: Number(riskScore.score),
      severity: riskScore.severity as "low" | "medium" | "high",
      contributingFactors,
      summary,
      recommendations,
    };
  }

  /**
   * Generate detailed explanation for a company risk score
   */
  async explainCompanyRisk(
    tenantId: string,
    clientCompanyId: string
  ): Promise<RiskExplanation> {
    // Get company risk score
    const riskScore = await prisma.clientCompanyRiskScore.findFirst({
      where: {
        tenantId,
        clientCompanyId,
      },
      orderBy: {
        generatedAt: "desc",
      },
    });

    if (!riskScore) {
      throw new NotFoundError("Müşteri risk skoru bulunamadı.");
    }

    // Get all active company rules
    const allRules = await riskRuleService.loadActiveRules(tenantId);
    const companyRules = allRules.filter((r) => r.scope === "company");

    // Build contributing factors
    const contributingFactors = companyRules.map((rule) => {
      const triggeredRuleCodes = riskScore.triggeredRuleCodes as string[];
      const triggered = triggeredRuleCodes.includes(rule.code);

      return {
        ruleCode: rule.code,
        ruleDescription: rule.description,
        weight: Number(rule.weight),
        triggered,
      };
    });

    // Generate summary
    const triggeredCount = contributingFactors.filter((f) => f.triggered).length;
    const totalWeight = contributingFactors
      .filter((f) => f.triggered)
      .reduce((sum, f) => sum + f.weight, 0);

    const summary = this.generateSummary(
      Number(riskScore.score),
      riskScore.severity as "low" | "medium" | "high",
      triggeredCount,
      totalWeight
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      contributingFactors.filter((f) => f.triggered),
      Number(riskScore.score)
    );

    return {
      score: Number(riskScore.score),
      severity: riskScore.severity as "low" | "medium" | "high",
      contributingFactors,
      summary,
      recommendations,
    };
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    score: number,
    severity: "low" | "medium" | "high",
    triggeredCount: number,
    totalWeight: number
  ): string {
    const severityText = {
      low: "düşük",
      medium: "orta",
      high: "yüksek",
    }[severity];

    if (score === 0) {
      return "Bu belge/müşteri için risk tespit edilmedi. Tüm kontroller başarılı.";
    }

    if (severity === "high") {
      return `Yüksek risk seviyesi (${score.toFixed(1)}/100). ${triggeredCount} adet risk kuralı tetiklendi. Acil inceleme önerilir.`;
    }

    if (severity === "medium") {
      return `Orta risk seviyesi (${score.toFixed(1)}/100). ${triggeredCount} adet risk kuralı tetiklendi. Dikkatli inceleme önerilir.`;
    }

    return `Düşük risk seviyesi (${score.toFixed(1)}/100). ${triggeredCount} adet risk kuralı tetiklendi. Normal takip yeterlidir.`;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    triggeredFactors: Array<{ ruleCode: string; ruleDescription: string; weight: number }>,
    score: number
  ): string[] {
    const recommendations: string[] = [];

    // Check for specific rule types and provide recommendations
    for (const factor of triggeredFactors) {
      switch (factor.ruleCode) {
        case "INV_DUPLICATE_NUMBER":
        case "INV_DUPLICATE_INVOICE":
          recommendations.push("Yinelenen fatura tespit edildi. Fatura numaralarını kontrol edin ve gerekiyorsa düzeltin.");
          break;

        case "INV_TOTAL_MISMATCH":
          recommendations.push("Fatura toplamı ile satır toplamları eşleşmiyor. Fatura tutarlarını kontrol edin.");
          break;

        case "VAT_RATE_INCONSISTENCY":
          recommendations.push("KDV oranı tutarsızlığı tespit edildi. KDV oranlarını ve hesaplamaları gözden geçirin.");
          break;

        case "AMOUNT_DATE_INCONSISTENCY":
          recommendations.push("Tutar-tarih tutarsızlığı tespit edildi. Fatura tarihlerini ve tutarlarını kontrol edin.");
          break;

        case "UNUSUAL_COUNTERPARTY":
        case "NEW_COUNTERPARTY":
          recommendations.push("Alışılmadık karşı taraf tespit edildi. Karşı taraf bilgilerini doğrulayın.");
          break;

        case "CHART_MISMATCH":
          recommendations.push("Hesap planı uyumsuzluğu tespit edildi. İşlemlerin doğru hesaplara kaydedildiğini kontrol edin.");
          break;
      }
    }

    // General recommendations based on score
    if (score > 65) {
      recommendations.push("Yüksek risk seviyesi nedeniyle detaylı bir inceleme yapılması önerilir.");
      recommendations.push("İlgili belgeleri ve işlemleri gözden geçirin.");
    } else if (score > 30) {
      recommendations.push("Orta risk seviyesi nedeniyle dikkatli takip önerilir.");
    }

    // Remove duplicates
    return Array.from(new Set(recommendations));
  }
}

export const riskExplanationService = new RiskExplanationService();

