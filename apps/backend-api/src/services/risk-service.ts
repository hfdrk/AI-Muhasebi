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
    riskScore: DocumentRiskScore;
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

    if (!riskScoreData || riskScoreData.tenantId !== tenantId) {
      throw new NotFoundError("Belge risk skoru bulunamadı.");
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
    for (const code of riskScore.triggeredRuleCodes) {
      const rule = await riskRuleService.getRuleByCode(tenantId, code);
      if (rule) {
        triggeredRules.push({
          code: rule.code,
          description: rule.description,
          severity: rule.defaultSeverity,
          weight: rule.weight,
        });
      }
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

    // Get document risk score breakdown
    const documentScores = await prisma.documentRiskScore.findMany({
      where: {
        tenantId,
        document: {
          clientCompanyId,
          isDeleted: false,
        },
      },
    });

    const breakdown = {
      low: documentScores.filter((s) => s.severity === "low").length,
      medium: documentScores.filter((s) => s.severity === "medium").length,
      high: documentScores.filter((s) => s.severity === "high").length,
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
   * Get tenant-level risk dashboard
   */
  async getTenantRiskDashboard(tenantId: string): Promise<TenantRiskDashboard> {
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

    return {
      highRiskClientCount: highRiskCompanies.length,
      openCriticalAlertsCount: openCriticalAlerts,
      totalDocuments,
      highRiskDocumentsCount: highRiskDocuments,
      clientRiskDistribution,
    };
  }
}

export const riskService = new RiskService();

