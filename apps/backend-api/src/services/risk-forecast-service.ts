import { prisma } from "../lib/prisma";

export interface RiskForecast {
  predictedScores: Array<{
    date: string;
    score: number;
    confidence: number;
  }>;
  earlyWarnings: Array<{
    type: string;
    message: string;
    probability: number;
    recommendedAction: string;
  }>;
  riskVelocity: {
    current: number;
    predicted: number;
    trend: "accelerating" | "decelerating" | "stable";
  };
}

export class RiskForecastService {
  /**
   * Generate risk forecast for next N days
   */
  async getRiskForecast(tenantId: string, days: number = 30): Promise<RiskForecast> {
    // Get historical risk scores (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const historyRecords = await prisma.riskScoreHistory.findMany({
      where: {
        tenantId,
        entityType: "company",
        recordedAt: {
          gte: ninetyDaysAgo,
        },
      },
      orderBy: {
        recordedAt: "asc",
      },
    });

    // Group by date and calculate average
    const dailyAverages = new Map<string, number[]>();
    historyRecords.forEach((record) => {
      const dateKey = record.recordedAt.toISOString().split("T")[0];
      const scores = dailyAverages.get(dateKey) || [];
      scores.push(Number(record.score));
      dailyAverages.set(dateKey, scores);
    });

    // Calculate daily average scores
    const historicalData: Array<{ date: string; score: number }> = [];
    dailyAverages.forEach((scores, date) => {
      const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      historicalData.push({ date, score: avg });
    });

    historicalData.sort((a, b) => a.date.localeCompare(b.date));

    // Simple linear regression for prediction
    const predictedScores: Array<{ date: string; score: number; confidence: number }> = [];

    if (historicalData.length >= 7) {
      // Calculate trend (slope)
      const n = historicalData.length;
      const recentData = historicalData.slice(-30); // Use last 30 days for trend
      const xValues = recentData.map((_, i) => i);
      const yValues = recentData.map((d) => d.score);

      const sumX = xValues.reduce((sum, x) => sum + x, 0);
      const sumY = yValues.reduce((sum, y) => sum + y, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Calculate R-squared for confidence
      const yMean = sumY / n;
      const ssRes = yValues.reduce(
        (sum, y, i) => sum + Math.pow(y - (slope * xValues[i] + intercept), 2),
        0
      );
      const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
      const rSquared = 1 - ssRes / ssTot;
      const confidence = Math.max(0, Math.min(100, rSquared * 100));

      // Generate predictions
      const lastDate = new Date(historicalData[historicalData.length - 1].date);
      for (let i = 1; i <= days; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(futureDate.getDate() + i);
        const dateKey = futureDate.toISOString().split("T")[0];
        const predictedScore = slope * (recentData.length + i) + intercept;

        // Clamp score between 0 and 100
        const clampedScore = Math.max(0, Math.min(100, predictedScore));

        predictedScores.push({
          date: dateKey,
          score: Math.round(clampedScore * 100) / 100,
          confidence: Math.round(confidence),
        });
      }
    } else {
      // Not enough data - use current average
      const currentAvg =
        historicalData.length > 0
          ? historicalData.reduce((sum, d) => sum + d.score, 0) / historicalData.length
          : 50;

      const today = new Date();
      for (let i = 1; i <= days; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + i);
        const dateKey = futureDate.toISOString().split("T")[0];

        predictedScores.push({
          date: dateKey,
          score: currentAvg,
          confidence: 30, // Low confidence with limited data
        });
      }
    }

    // Calculate risk velocity
    const currentScore = historicalData.length > 0 ? historicalData[historicalData.length - 1].score : 0;
    const predictedScore = predictedScores.length > 0 ? predictedScores[predictedScores.length - 1].score : currentScore;

    // Calculate velocity trend
    const recentScores = historicalData.slice(-7).map((d) => d.score);
    const velocity = recentScores.length > 1 ? recentScores[recentScores.length - 1] - recentScores[0] : 0;
    const predictedVelocity = predictedScore - currentScore;

    let velocityTrend: "accelerating" | "decelerating" | "stable" = "stable";
    if (Math.abs(predictedVelocity) > Math.abs(velocity * 1.2)) {
      velocityTrend = predictedVelocity > 0 ? "accelerating" : "decelerating";
    } else if (Math.abs(predictedVelocity) < Math.abs(velocity * 0.8)) {
      velocityTrend = predictedVelocity > 0 ? "decelerating" : "accelerating";
    }

    // Generate early warnings
    const earlyWarnings: Array<{
      type: string;
      message: string;
      probability: number;
      recommendedAction: string;
    }> = [];

    if (predictedScore > 70 && currentScore < 70) {
      earlyWarnings.push({
        type: "HIGH_RISK_PREDICTION",
        message: `Risk skoru önümüzdeki ${days} gün içinde yüksek seviyeye çıkabilir`,
        probability: 75,
        recommendedAction: "Yüksek riskli müşterileri önceden gözden geçirin",
      });
    }

    if (velocityTrend === "accelerating" && predictedVelocity > 10) {
      earlyWarnings.push({
        type: "ACCELERATING_RISK",
        message: "Risk hızı artıyor - acil müdahale gerekebilir",
        probability: 60,
        recommendedAction: "Risk trendlerini detaylı analiz edin",
      });
    }

    if (predictedScore > currentScore + 15) {
      earlyWarnings.push({
        type: "SIGNIFICANT_INCREASE",
        message: `Risk skoru %${((predictedScore - currentScore) / currentScore * 100).toFixed(1)} artabilir`,
        probability: 65,
        recommendedAction: "Önleyici tedbirler almayı düşünün",
      });
    }

    return {
      predictedScores,
      earlyWarnings,
      riskVelocity: {
        current: Math.round(velocity * 100) / 100,
        predicted: Math.round(predictedVelocity * 100) / 100,
        trend: velocityTrend,
      },
    };
  }
}

export const riskForecastService = new RiskForecastService();


