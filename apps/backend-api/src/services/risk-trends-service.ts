import { prisma } from "../lib/prisma";
import { riskTrendService } from "./risk-trend-service";

export interface RiskTrendsResponse {
  riskScoreTrend: {
    dates: string[];
    scores: number[];
    averageScore: number;
    trend: "increasing" | "decreasing" | "stable";
  };
  alertFrequencyTrend: {
    dates: string[];
    counts: number[];
    totalAlerts: number;
  };
  riskDistributionTrend: {
    dates: string[];
    low: number[];
    medium: number[];
    high: number[];
  };
}

export class RiskTrendsService {
  /**
   * Get aggregated risk trends for dashboard
   */
  async getDashboardTrends(
    tenantId: string,
    period: "7d" | "30d" | "90d" | "1y" = "30d"
  ): Promise<RiskTrendsResponse> {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get daily aggregated risk scores from history
    const historyRecords = await prisma.riskScoreHistory.findMany({
      where: {
        tenantId,
        entityType: "company",
        recordedAt: {
          gte: cutoffDate,
        },
      },
      orderBy: {
        recordedAt: "asc",
      },
    });

    // Group by date and calculate average risk score per day
    const dailyScores = new Map<string, { total: number; count: number }>();
    const dailyDistribution = new Map<
      string,
      { low: number; medium: number; high: number }
    >();

    historyRecords.forEach((record) => {
      const dateKey = record.recordedAt.toISOString().split("T")[0];
      const score = Number(record.score);

      // Aggregate scores
      const existing = dailyScores.get(dateKey);
      if (existing) {
        existing.total += score;
        existing.count += 1;
      } else {
        dailyScores.set(dateKey, { total: score, count: 1 });
      }

      // Aggregate distribution
      const dist = dailyDistribution.get(dateKey) || { low: 0, medium: 0, high: 0 };
      if (record.severity === "low") dist.low += 1;
      else if (record.severity === "medium") dist.medium += 1;
      else if (record.severity === "high") dist.high += 1;
      dailyDistribution.set(dateKey, dist);
    });

    // Get alert frequency by day
    const alerts = await prisma.riskAlert.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: cutoffDate,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const dailyAlerts = new Map<string, number>();
    alerts.forEach((alert) => {
      const dateKey = alert.createdAt.toISOString().split("T")[0];
      dailyAlerts.set(dateKey, (dailyAlerts.get(dateKey) || 0) + 1);
    });

    // Generate date range and fill in missing dates
    const dates: string[] = [];
    const scores: number[] = [];
    const alertCounts: number[] = [];
    const lowCounts: number[] = [];
    const mediumCounts: number[] = [];
    const highCounts: number[] = [];

    const currentDate = new Date(cutoffDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (currentDate <= today) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dates.push(dateKey);

      // Risk scores
      const dayData = dailyScores.get(dateKey);
      scores.push(dayData ? dayData.total / dayData.count : 0);

      // Alert counts
      alertCounts.push(dailyAlerts.get(dateKey) || 0);

      // Distribution
      const dist = dailyDistribution.get(dateKey) || { low: 0, medium: 0, high: 0 };
      lowCounts.push(dist.low);
      mediumCounts.push(dist.medium);
      highCounts.push(dist.high);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate trend
    const recentScores = scores.filter((s) => s > 0);
    const averageScore =
      recentScores.length > 0 ? recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length : 0;

    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (recentScores.length >= 2) {
      const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
      const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2));
      const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
      const diff = secondAvg - firstAvg;
      if (diff > 5) trend = "increasing";
      else if (diff < -5) trend = "decreasing";
    }

    return {
      riskScoreTrend: {
        dates,
        scores,
        averageScore,
        trend,
      },
      alertFrequencyTrend: {
        dates,
        counts: alertCounts,
        totalAlerts: alerts.length,
      },
      riskDistributionTrend: {
        dates,
        low: lowCounts,
        medium: mediumCounts,
        high: highCounts,
      },
    };
  }
}

export const riskTrendsService = new RiskTrendsService();

