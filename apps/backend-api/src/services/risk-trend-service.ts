import { prisma } from "../lib/prisma";
import { NotFoundError, logger } from "@repo/shared-utils";

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

    // Get history from RiskScoreHistory table
    const historyRecords = await prisma.riskScoreHistory.findMany({
      where: {
        tenantId,
        entityType: "document",
        entityId: documentId,
        recordedAt: {
          gte: cutoffDate,
        },
      },
      orderBy: {
        recordedAt: "asc",
      },
    });

    // If no history, include current score as history
    const history: RiskScoreHistory[] =
      historyRecords.length > 0
        ? historyRecords.map((record) => ({
            date: record.recordedAt,
            score: Number(record.score),
            severity: record.severity as "low" | "medium" | "high",
          }))
        : [
            {
              date: currentScore.generatedAt,
              score: Number(currentScore.score),
              severity: currentScore.severity as "low" | "medium" | "high",
            },
          ];

    const currentScoreValue = Number(currentScore.score);
    const previousScore = history.length > 1 ? history[history.length - 2].score : null;

    // Determine trend
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (previousScore !== null) {
      const diff = currentScoreValue - previousScore;
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
      currentScore: currentScoreValue,
      previousScore,
      trend,
      averageScore,
      minScore,
      maxScore,
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
   */
  async storeRiskScoreHistory(
    tenantId: string,
    entityType: "document" | "company",
    entityId: string,
    score: number,
    severity: "low" | "medium" | "high"
  ): Promise<void> {
    try {
      await prisma.riskScoreHistory.create({
        data: {
          tenantId,
          entityType,
          entityId,
          score,
          severity,
          recordedAt: new Date(),
        },
      });
    } catch (error) {
      // Log error but don't throw - history storage shouldn't break risk calculation
      logger.error(
        `[RiskTrendService] Error storing risk score history: ${entityType} ${entityId}, score: ${score}, severity: ${severity}`,
        { error }
      );
    }
  }
}

export const riskTrendService = new RiskTrendService();

