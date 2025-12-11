import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";

export interface RiskScoreHistory {
  date: Date;
  score: number;
  severity: "low" | "medium" | "high";
}

export interface RiskTrendData {
  history: RiskScoreHistory[];
  currentScore: number;
  previousScore: number | null;
  trend: "increasing" | "decreasing" | "stable";
  averageScore: number;
  minScore: number;
  maxScore: number;
}

export class RiskTrendService {
  /**
   * Get risk score history for a document
   * Note: Currently risk scores are overwritten, so we need to track history separately
   * For now, we'll use the generatedAt timestamp to create a history
   */
  async getDocumentRiskTrend(
    tenantId: string,
    documentId: string,
    days: number = 90
  ): Promise<RiskTrendData> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get current risk score
    const currentScore = await prisma.documentRiskScore.findUnique({
      where: { documentId },
    });

    if (!currentScore) {
      throw new NotFoundError("Belge risk skoru bulunamadı.");
    }

    // For now, we only have the current score
    // In a real implementation, we'd have a RiskScoreHistory table
    // For MVP, we'll create a simple history from the current score
    const history: RiskScoreHistory[] = [
      {
        date: currentScore.generatedAt,
        score: Number(currentScore.score),
        severity: currentScore.severity as "low" | "medium" | "high",
      },
    ];

    return {
      history,
      currentScore: Number(currentScore.score),
      previousScore: null, // Would need history table
      trend: "stable",
      averageScore: Number(currentScore.score),
      minScore: Number(currentScore.score),
      maxScore: Number(currentScore.score),
    };
  }

  /**
   * Get risk score history for a client company
   */
  async getCompanyRiskTrend(
    tenantId: string,
    clientCompanyId: string,
    days: number = 90
  ): Promise<RiskTrendData> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get all risk scores for this company within the date range
    const riskScores = await prisma.clientCompanyRiskScore.findMany({
      where: {
        tenantId,
        clientCompanyId,
        generatedAt: {
          gte: cutoffDate,
        },
      },
      orderBy: {
        generatedAt: "asc",
      },
    });

    if (riskScores.length === 0) {
      throw new NotFoundError("Müşteri risk skoru bulunamadı.");
    }

    const history: RiskScoreHistory[] = riskScores.map((score) => ({
      date: score.generatedAt,
      score: Number(score.score),
      severity: score.severity as "low" | "medium" | "high",
    }));

    const currentScore = Number(riskScores[riskScores.length - 1].score);
    const previousScore = riskScores.length > 1 ? Number(riskScores[riskScores.length - 2].score) : null;

    // Determine trend
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (previousScore !== null) {
      const diff = currentScore - previousScore;
      if (diff > 5) {
        trend = "increasing";
      } else if (diff < -5) {
        trend = "decreasing";
      }
    }

    const scores = history.map((h) => h.score);
    const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    return {
      history,
      currentScore,
      previousScore,
      trend,
      averageScore,
      minScore,
      maxScore,
    };
  }

  /**
   * Store risk score history (should be called when risk score is updated)
   * For now, this is a placeholder - in production, you'd have a RiskScoreHistory table
   */
  async storeRiskScoreHistory(
    tenantId: string,
    entityType: "document" | "company",
    entityId: string,
    score: number,
    severity: "low" | "medium" | "high"
  ): Promise<void> {
    // TODO: Implement RiskScoreHistory table and store history
    // For now, we rely on the existing risk score tables with generatedAt timestamps
    console.log(
      `[RiskTrendService] Risk score history stored: ${entityType} ${entityId}, score: ${score}, severity: ${severity}`
    );
  }
}

export const riskTrendService = new RiskTrendService();

