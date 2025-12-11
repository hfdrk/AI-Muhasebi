import { prisma } from "../lib/prisma";

export interface RiskBreakdown {
  totalRiskScore: number;
  categoryBreakdown: {
    fraud: { score: number; percentage: number };
    compliance: { score: number; percentage: number };
    financial: { score: number; percentage: number };
    operational: { score: number; percentage: number };
  };
  topRiskFactors: Array<{
    name: string;
    contribution: number;
    ruleCode: string;
    severity: string;
  }>;
  triggeredRules: Array<{
    code: string;
    description: string;
    weight: number;
    severity: string;
    count: number;
  }>;
}

export class RiskBreakdownService {
  /**
   * Get tenant-level risk breakdown
   */
  async getTenantRiskBreakdown(tenantId: string): Promise<RiskBreakdown> {
    // Get all company risk scores
    const companyScores = await prisma.clientCompanyRiskScore.findMany({
      where: {
        tenantId,
      },
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get all triggered rules
    const allTriggeredRules: Map<string, { count: number; weight: number; severity: string }> = new Map();

    companyScores.forEach((score) => {
      const rules = (score.triggeredRuleCodes as string[]) || [];
      rules.forEach((ruleCode) => {
        const existing = allTriggeredRules.get(ruleCode);
        if (existing) {
          existing.count += 1;
        } else {
          allTriggeredRules.set(ruleCode, { count: 1, weight: 0, severity: score.severity });
        }
      });
    });

    // Get rule details
    const ruleCodes = Array.from(allTriggeredRules.keys());
    const rules = await prisma.riskRule.findMany({
      where: {
        tenantId: tenantId,
        code: {
          in: ruleCodes,
        },
        isActive: true,
      },
    });

    // Update triggered rules with rule details
    const triggeredRules = rules.map((rule) => {
      const triggered = allTriggeredRules.get(rule.code);
      return {
        code: rule.code,
        description: rule.description,
        weight: Number(rule.weight),
        severity: triggered?.severity || rule.defaultSeverity,
        count: triggered?.count || 0,
      };
    });

    // Calculate category breakdown (simplified - based on rule codes)
    const categoryScores = {
      fraud: 0,
      compliance: 0,
      financial: 0,
      operational: 0,
    };

    triggeredRules.forEach((rule) => {
      const contribution = rule.weight * rule.count;
      if (rule.code.toLowerCase().includes("fraud") || rule.code.toLowerCase().includes("duplicate")) {
        categoryScores.fraud += contribution;
      } else if (
        rule.code.toLowerCase().includes("vat") ||
        rule.code.toLowerCase().includes("tax") ||
        rule.code.toLowerCase().includes("compliance")
      ) {
        categoryScores.compliance += contribution;
      } else if (
        rule.code.toLowerCase().includes("amount") ||
        rule.code.toLowerCase().includes("transaction") ||
        rule.code.toLowerCase().includes("financial")
      ) {
        categoryScores.financial += contribution;
      } else {
        categoryScores.operational += contribution;
      }
    });

    const totalCategoryScore =
      categoryScores.fraud + categoryScores.compliance + categoryScores.financial + categoryScores.operational;

    // Calculate average risk score
    const totalRiskScore =
      companyScores.length > 0
        ? companyScores.reduce((sum, s) => sum + Number(s.score), 0) / companyScores.length
        : 0;

    // Get top risk factors
    const topRiskFactors = triggeredRules
      .sort((a, b) => b.weight * b.count - a.weight * a.count)
      .slice(0, 5)
      .map((rule) => ({
        name: rule.description,
        contribution: (rule.weight * rule.count) / (totalCategoryScore || 1),
        ruleCode: rule.code,
        severity: rule.severity,
      }));

    return {
      totalRiskScore,
      categoryBreakdown: {
        fraud: {
          score: categoryScores.fraud,
          percentage: totalCategoryScore > 0 ? (categoryScores.fraud / totalCategoryScore) * 100 : 0,
        },
        compliance: {
          score: categoryScores.compliance,
          percentage: totalCategoryScore > 0 ? (categoryScores.compliance / totalCategoryScore) * 100 : 0,
        },
        financial: {
          score: categoryScores.financial,
          percentage: totalCategoryScore > 0 ? (categoryScores.financial / totalCategoryScore) * 100 : 0,
        },
        operational: {
          score: categoryScores.operational,
          percentage: totalCategoryScore > 0 ? (categoryScores.operational / totalCategoryScore) * 100 : 0,
        },
      },
      topRiskFactors,
      triggeredRules: triggeredRules.sort((a, b) => b.count - a.count),
    };
  }
}

export const riskBreakdownService = new RiskBreakdownService();
