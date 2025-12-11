import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import { riskRuleEngine } from "./risk-rule-engine";
import type {
  DocumentRiskScore,
  ClientCompanyRiskScore,
  RiskAlert,
  RiskAlertStatus,
} from "@repo/core-domain";

export interface TenantRiskDashboard {
  highRiskClientCount: number;
  openCriticalAlertsCount: number;
  totalDocuments: number;
  highRiskDocumentsCount: number;
  clientRiskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

export class RiskService {
  /**
   * Get document risk score with triggered rules
   */
  async getDocumentRiskScore(tenantId: string, documentId: string): Promise<{
    riskScore: DocumentRiskScore | null;
    triggeredRules: Array<{
      code: string;
      description: string;
      severity: string;
      weight: number;
    }>;
  }> {
    // Verify document belongs to tenant
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!document) {
      throw new NotFoundError("Belge bulunamadı.");
    }

    // Get risk score
    const riskScoreData = await prisma.documentRiskScore.findUnique({
      where: { documentId },
    });

    // If no risk score exists (document not processed yet or processing failed), return null
    if (!riskScoreData || riskScoreData.tenantId !== tenantId) {
      return {
        riskScore: null,
        triggeredRules: [],
      };
    }

    const riskScore: DocumentRiskScore = {
      id: riskScoreData.id,
      tenantId: riskScoreData.tenantId,
      documentId: riskScoreData.documentId,
      score: Number(riskScoreData.score),
      severity: riskScoreData.severity as any,
      triggeredRuleCodes: riskScoreData.triggeredRuleCodes as string[],
      generatedAt: riskScoreData.generatedAt,
      createdAt: riskScoreData.createdAt,
      updatedAt: riskScoreData.updatedAt,
    };

    // Get rule descriptions
    const { riskRuleService } = await import("./risk-rule-service");
    const triggeredRules = [];
    try {
      for (const code of riskScore.triggeredRuleCodes) {
        try {
          const rule = await riskRuleService.getRuleByCode(tenantId, code);
          if (rule) {
            triggeredRules.push({
              code: rule.code,
              description: rule.description,
              severity: rule.defaultSeverity,
              weight: rule.weight,
            });
          }
        } catch (ruleError: any) {
          // Log but don't fail if a single rule lookup fails
          console.warn(`Failed to get rule by code ${code}:`, ruleError.message);
        }
      }
    } catch (error: any) {
      // If rule service import fails, return empty triggered rules
      console.error("Error loading risk rule service:", error);
    }

    return {
      riskScore,
      triggeredRules,
    };
  }

  /**
   * Get client company risk overview
   */
  async getClientCompanyRiskScore(tenantId: string, clientCompanyId: string): Promise<{
    riskScore: ClientCompanyRiskScore | null;
    breakdown: {
      low: number;
      medium: number;
      high: number;
    };
    topTriggeredRules: Array<{
      code: string;
      description: string;
      count: number;
    }>;
  }> {
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

    // Get latest risk score
    const riskScoreData = await prisma.clientCompanyRiskScore.findFirst({
      where: {
        tenantId,
        clientCompanyId,
      },
      orderBy: { generatedAt: "desc" },
    });

    const riskScore: ClientCompanyRiskScore | null = riskScoreData
      ? {
          id: riskScoreData.id,
          tenantId: riskScoreData.tenantId,
          clientCompanyId: riskScoreData.clientCompanyId,
          score: Number(riskScoreData.score),
          severity: riskScoreData.severity as any,
          triggeredRuleCodes: riskScoreData.triggeredRuleCodes as string[],
          generatedAt: riskScoreData.generatedAt,
          createdAt: riskScoreData.createdAt,
          updatedAt: riskScoreData.updatedAt,
        }
      : null;

    // Get all documents for this company first
    const allDocuments = await prisma.document.findMany({
      where: {
        tenantId,
        clientCompanyId,
        isDeleted: false,
      },
      select: {
        id: true,
      },
    });

    // Get all document risk scores for this company to calculate breakdown
    const documentScores = await prisma.documentRiskScore.findMany({
      where: {
        tenantId,
        document: {
          clientCompanyId,
          isDeleted: false,
        },
      },
      select: {
        id: true,
        severity: true,
        score: true,
        triggeredRuleCodes: true,
        documentId: true,
      },
    });

    // Count by severity - always calculate from score for consistency
    let lowCount = 0;
    let mediumCount = 0;
    let highCount = 0;

    documentScores.forEach((score) => {
      // Always use score to determine severity for consistency
      const scoreValue = Number(score.score);
      if (scoreValue <= 30) {
        lowCount++;
      } else if (scoreValue <= 65) {
        mediumCount++;
      } else {
        highCount++;
      }
    });

    // If company has risk score but documents don't have individual scores,
    // this is a data inconsistency - documents should have risk scores
    if (riskScore && documentScores.length === 0 && allDocuments.length > 0) {
      console.warn(
        `[RiskService] Data inconsistency: Company ${clientCompanyId} has risk score ${riskScore.score} (${riskScore.severity}) ` +
        `but ${allDocuments.length} documents don't have individual risk scores. ` +
        `This suggests document risk scores need to be calculated.`
      );
      
      // Note: We could trigger risk score calculation here, but that might be slow
      // For now, we'll return 0s and let the frontend handle this case
      // The frontend could show a message like "Risk scores are being calculated" or trigger calculation
    }

    // Debug logging
    if (riskScore) {
      console.log(
        `[RiskService] Company ${clientCompanyId}: Total documents=${allDocuments.length}, ` +
        `Documents with risk scores=${documentScores.length}, ` +
        `Company risk score=${riskScore.score} (${riskScore.severity}), ` +
        `Breakdown: low=${lowCount}, medium=${mediumCount}, high=${highCount}`
      );
      
      // Log sample document scores for debugging
      if (documentScores.length > 0) {
        const sampleScores = documentScores.slice(0, 5).map(s => ({
          score: Number(s.score),
          severity: s.severity,
          calculatedSeverity: Number(s.score) <= 30 ? 'low' : Number(s.score) <= 65 ? 'medium' : 'high'
        }));
        console.log(`[RiskService] Sample document scores:`, sampleScores);
      } else if (allDocuments.length > 0) {
        console.warn(
          `[RiskService] No document risk scores found for ${allDocuments.length} documents. ` +
          `Company risk score exists (${riskScore.score}), but document-level scores are missing.`
        );
      }
    }

    const breakdown = {
      low: lowCount,
      medium: mediumCount,
      high: highCount,
    };

    // Get top triggered rules
    const ruleCounts = new Map<string, number>();
    documentScores.forEach((score) => {
      const codes = score.triggeredRuleCodes as string[];
      codes.forEach((code) => {
        ruleCounts.set(code, (ruleCounts.get(code) || 0) + 1);
      });
    });

    const { riskRuleService } = await import("./risk-rule-service");
    const topTriggeredRules = [];
    for (const [code, count] of Array.from(ruleCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      const rule = await riskRuleService.getRuleByCode(tenantId, code);
      if (rule) {
        topTriggeredRules.push({
          code: rule.code,
          description: rule.description,
          count,
        });
      }
    }

    return {
      riskScore,
      breakdown,
      topTriggeredRules,
    };
  }

  /**
   * Get tenant-level risk dashboard with enhanced data
   */
  async getTenantRiskDashboard(tenantId: string): Promise<TenantRiskDashboard & {
    comparisons?: {
      previousPeriod: {
        highRiskClientCount: number;
        openCriticalAlertsCount: number;
        highRiskDocumentsCount: number;
      };
    };
    trends?: {
      riskScoreTrend: "increasing" | "decreasing" | "stable";
      alertTrend: "increasing" | "decreasing" | "stable";
    };
  }> {
    // Count high-risk client companies
    const highRiskCompanies = await prisma.clientCompanyRiskScore.findMany({
      where: {
        tenantId,
        severity: "high",
      },
      distinct: ["clientCompanyId"],
    });

    // Count open critical alerts
    const openCriticalAlerts = await prisma.riskAlert.count({
      where: {
        tenantId,
        severity: "critical",
        status: {
          in: ["open", "in_progress"],
        },
      },
    });

    // Count documents
    const totalDocuments = await prisma.document.count({
      where: {
        tenantId,
        isDeleted: false,
      },
    });

    const highRiskDocuments = await prisma.documentRiskScore.count({
      where: {
        tenantId,
        severity: "high",
      },
    });

    // Get client risk distribution
    const companyScores = await prisma.clientCompanyRiskScore.findMany({
      where: {
        tenantId,
      },
      orderBy: { generatedAt: "desc" },
      distinct: ["clientCompanyId"],
    });

    const clientRiskDistribution = {
      low: companyScores.filter((s) => s.severity === "low").length,
      medium: companyScores.filter((s) => s.severity === "medium").length,
      high: companyScores.filter((s) => s.severity === "high").length,
    };

    // Calculate previous period comparisons (30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const previousHighRiskCompanies = await prisma.clientCompanyRiskScore.findMany({
      where: {
        tenantId,
        severity: "high",
        generatedAt: {
          lte: thirtyDaysAgo,
        },
      },
      distinct: ["clientCompanyId"],
    });

    const previousCriticalAlerts = await prisma.riskAlert.count({
      where: {
        tenantId,
        severity: "critical",
        status: {
          in: ["open", "in_progress"],
        },
        createdAt: {
          lte: thirtyDaysAgo,
        },
      },
    });

    const previousHighRiskDocuments = await prisma.documentRiskScore.count({
      where: {
        tenantId,
        severity: "high",
        generatedAt: {
          lte: thirtyDaysAgo,
        },
      },
    });

    // Calculate trends
    const currentHighRiskCount = highRiskCompanies.length;
    const previousHighRiskCount = previousHighRiskCompanies.length;
    const riskTrend: "increasing" | "decreasing" | "stable" =
      currentHighRiskCount > previousHighRiskCount
        ? "increasing"
        : currentHighRiskCount < previousHighRiskCount
          ? "decreasing"
          : "stable";

    const alertTrend: "increasing" | "decreasing" | "stable" =
      openCriticalAlerts > previousCriticalAlerts
        ? "increasing"
        : openCriticalAlerts < previousCriticalAlerts
          ? "decreasing"
          : "stable";

    return {
      highRiskClientCount: highRiskCompanies.length,
      openCriticalAlertsCount: openCriticalAlerts,
      totalDocuments,
      highRiskDocumentsCount: highRiskDocuments,
      clientRiskDistribution,
      comparisons: {
        previousPeriod: {
          highRiskClientCount: previousHighRiskCompanies.length,
          openCriticalAlertsCount: previousCriticalAlerts,
          highRiskDocumentsCount: previousHighRiskDocuments,
        },
      },
      trends: {
        riskScoreTrend: riskTrend,
        alertTrend,
      },
    };
  }
}

export const riskService = new RiskService();


