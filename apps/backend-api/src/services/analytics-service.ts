import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/core-domain";
import { logger } from "@repo/shared-utils";

/**
 * Analytics Service
 * 
 * Provides advanced analytics for financial trends, risk trends, client portfolio,
 * and revenue/expense forecasting.
 */
export interface FinancialTrend {
  period: string; // "2024-01" or "2024-Q1"
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  invoiceCount: number;
  averageInvoiceValue: number;
}

export interface RiskTrend {
  period: string;
  averageRiskScore: number;
  highRiskClientCount: number;
  criticalAlertsCount: number;
  riskScoreChange: number; // percentage change from previous period
}

export interface ClientPortfolioAnalytics {
  totalClients: number;
  activeClients: number;
  highRiskClients: number;
  mediumRiskClients: number;
  lowRiskClients: number;
  totalRevenue: number;
  averageRevenuePerClient: number;
  topClients: Array<{
    clientCompanyId: string;
    clientName: string;
    revenue: number;
    riskScore: number;
    invoiceCount: number;
  }>;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface RevenueForecast {
  period: string;
  forecastedRevenue: number;
  confidence: number; // 0-1
  lowerBound: number;
  upperBound: number;
  factors: Array<{
    name: string;
    impact: number; // positive or negative impact on forecast
  }>;
}

export interface ExpenseForecast {
  period: string;
  forecastedExpenses: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
  categoryBreakdown: Array<{
    category: string;
    forecastedAmount: number;
    percentage: number;
  }>;
}

export class AnalyticsService {
  /**
   * Get financial trends for a tenant
   */
  async getFinancialTrends(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    granularity: "daily" | "weekly" | "monthly" | "quarterly" = "monthly"
  ): Promise<FinancialTrend[]> {
    try {
      const trends: FinancialTrend[] = [];
      const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        issueDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        clientCompany: true,
      },
    });

    // Group by period
    const periodMap = new Map<string, {
      revenue: number;
      expenses: number;
      invoiceCount: number;
    }>();

    for (const invoice of invoices) {
      // Skip invoices without issueDate
      if (!invoice.issueDate) continue;
      
      const period = this.getPeriodKey(
        invoice.issueDate instanceof Date ? invoice.issueDate : new Date(invoice.issueDate),
        granularity
      );
      if (!periodMap.has(period)) {
        periodMap.set(period, {
          revenue: 0,
          expenses: 0,
          invoiceCount: 0,
        });
      }

      const data = periodMap.get(period)!;
      data.invoiceCount++;

      if (invoice.type === "SATIŞ") {
        data.revenue += Number(invoice.totalAmount || 0);
      } else if (invoice.type === "ALIŞ") {
        data.expenses += Number(invoice.totalAmount || 0);
      }
    }

    // Convert to trends array
    for (const [period, data] of periodMap.entries()) {
      const profit = data.revenue - data.expenses;
      const profitMargin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
      const averageInvoiceValue = data.invoiceCount > 0 ? data.revenue / data.invoiceCount : 0;

      trends.push({
        period,
        revenue: data.revenue,
        expenses: data.expenses,
        profit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        invoiceCount: data.invoiceCount,
        averageInvoiceValue: Math.round(averageInvoiceValue * 100) / 100,
      });
    }

      return trends.sort((a, b) => a.period.localeCompare(b.period));
    } catch (error) {
      logger.error("Error in getFinancialTrends:", error);
      // Return empty array on error instead of crashing
      return [];
    }
  }

  /**
   * Get risk trends for a tenant
   */
  async getRiskTrends(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    granularity: "daily" | "weekly" | "monthly" = "monthly"
  ): Promise<RiskTrend[]> {
    try {
      const trends: RiskTrend[] = [];

      // Get risk score history - handle case where table might not exist
      const riskHistory = await prisma.riskScoreHistory.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        clientCompany: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by period
    const periodMap = new Map<string, {
      scores: number[];
      highRiskCount: number;
      criticalAlerts: number;
    }>();

    for (const history of riskHistory) {
      const period = this.getPeriodKey(history.createdAt, granularity);
      if (!periodMap.has(period)) {
        periodMap.set(period, {
          scores: [],
          highRiskCount: 0,
          criticalAlerts: 0,
        });
      }

      const data = periodMap.get(period)!;
      data.scores.push(Number(history.overallScore));

      if (history.overallScore >= 70) {
        data.highRiskCount++;
      }
    }

    // Get critical alerts count per period
    const alerts = await prisma.riskAlert.findMany({
      where: {
        tenantId,
        severity: "critical",
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    for (const alert of alerts) {
      const period = this.getPeriodKey(alert.createdAt, granularity);
      const data = periodMap.get(period);
      if (data) {
        data.criticalAlerts++;
      }
    }

    // Convert to trends array
    let previousAverage = 0;
    for (const [period, data] of periodMap.entries()) {
      const averageScore = data.scores.length > 0
        ? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
        : 0;
      const riskScoreChange = previousAverage > 0
        ? ((averageScore - previousAverage) / previousAverage) * 100
        : 0;

      trends.push({
        period,
        averageRiskScore: Math.round(averageScore * 100) / 100,
        highRiskClientCount: data.highRiskCount,
        criticalAlertsCount: data.criticalAlerts,
        riskScoreChange: Math.round(riskScoreChange * 100) / 100,
      });

      previousAverage = averageScore;
    }

      return trends.sort((a, b) => a.period.localeCompare(b.period));
    } catch (error) {
      logger.error("Error in getRiskTrends:", error);
      // Return empty array on error instead of crashing
      return [];
    }
  }

  /**
   * Get client portfolio analytics
   */
  async getClientPortfolioAnalytics(
    tenantId: string,
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<ClientPortfolioAnalytics> {
    try {
      const where: any = {
        tenantId,
        isActive: true,
      };

      const clients = await prisma.clientCompany.findMany({
        where,
        include: {
          riskScores: {
            orderBy: {
              updatedAt: "desc",
            },
            take: 1,
          },
          invoices: periodStart && periodEnd ? {
          where: {
            issueDate: {
              gte: periodStart,
              lte: periodEnd,
            },
            type: "SATIŞ",
          },
        } : {
          where: {
            type: "SATIŞ",
          },
        },
      },
    });

    let totalRevenue = 0;
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;

    const clientAnalytics = clients.map((client) => {
      const riskScore = client.riskScores[0]?.overallScore || 0;
      const revenue = client.invoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount),
        0
      );
      totalRevenue += revenue;

      if (riskScore >= 70) {
        highRiskCount++;
      } else if (riskScore >= 40) {
        mediumRiskCount++;
      } else {
        lowRiskCount++;
      }

      return {
        clientCompanyId: client.id,
        clientName: client.name,
        revenue,
        riskScore,
        invoiceCount: client.invoices.length,
      };
    });

    // Sort by revenue and get top 10
    const topClients = clientAnalytics
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const averageRevenuePerClient = clients.length > 0
      ? totalRevenue / clients.length
      : 0;

    return {
      totalClients: clients.length,
      activeClients: clients.filter((c) => c.isActive).length,
      highRiskClients: highRiskCount,
      mediumRiskClients: mediumRiskCount,
      lowRiskClients: lowRiskCount,
      totalRevenue,
      averageRevenuePerClient: Math.round(averageRevenuePerClient * 100) / 100,
      topClients,
      riskDistribution: {
        low: lowRiskCount,
        medium: mediumRiskCount,
        high: highRiskCount,
      },
    };
    } catch (error) {
      logger.error("Error in getClientPortfolioAnalytics:", error);
      // Return empty portfolio on error instead of crashing
      return {
        totalClients: 0,
        activeClients: 0,
        highRiskClients: 0,
        mediumRiskClients: 0,
        lowRiskClients: 0,
        totalRevenue: 0,
        averageRevenuePerClient: 0,
        topClients: [],
        riskDistribution: {
          low: 0,
          medium: 0,
          high: 0,
        },
      };
    }
  }

  /**
   * Generate revenue forecast
   */
  async generateRevenueForecast(
    tenantId: string,
    forecastPeriods: number = 3, // months
    historicalMonths: number = 12
  ): Promise<RevenueForecast[]> {
    try {
      const forecasts: RevenueForecast[] = [];

    // Get historical revenue data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - historicalMonths);

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
        type: "SATIŞ",
      },
    });

    // Calculate monthly revenue
    const monthlyRevenue = new Map<string, number>();
    for (const invoice of invoices) {
      const monthKey = invoice.issueDate.toISOString().substring(0, 7); // YYYY-MM
      const current = monthlyRevenue.get(monthKey) || 0;
      monthlyRevenue.set(monthKey, current + Number(invoice.totalAmount));
    }

    // Calculate trend (simple linear regression)
    const months = Array.from(monthlyRevenue.keys()).sort();
    const revenues = months.map((m) => monthlyRevenue.get(m) || 0);

    if (revenues.length < 2) {
      // Not enough data for forecasting
      return forecasts;
    }

    // Simple moving average forecast
    const avgRevenue = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
    const recentAvg = revenues.slice(-3).reduce((sum, r) => sum + r, 0) / Math.min(3, revenues.length);
    const trend = recentAvg - avgRevenue;

    // Generate forecasts
    const lastMonth = new Date(months[months.length - 1] + "-01");
    for (let i = 1; i <= forecastPeriods; i++) {
      const forecastMonth = new Date(lastMonth);
      forecastMonth.setMonth(forecastMonth.getMonth() + i);
      const period = forecastMonth.toISOString().substring(0, 7);

      // Simple forecast: recent average + trend
      const baseForecast = recentAvg + (trend * i);
      const confidence = Math.max(0.5, 1 - (i * 0.1)); // Decreases with distance
      const variance = avgRevenue * 0.2; // 20% variance

      forecasts.push({
        period,
        forecastedRevenue: Math.max(0, Math.round(baseForecast * 100) / 100),
        confidence: Math.round(confidence * 100) / 100,
        lowerBound: Math.max(0, Math.round((baseForecast - variance) * 100) / 100),
        upperBound: Math.round((baseForecast + variance) * 100) / 100,
        factors: [
          {
            name: "Tarihsel Trend",
            impact: trend > 0 ? trend : -Math.abs(trend),
          },
          {
            name: "Ortalama Gelir",
            impact: avgRevenue,
          },
        ],
      });
    }

    return forecasts;
    } catch (error) {
      logger.error("Error in generateRevenueForecast:", error);
      return [];
    }
  }

  /**
   * Generate expense forecast
   */
  async generateExpenseForecast(
    tenantId: string,
    forecastPeriods: number = 3,
    historicalMonths: number = 12
  ): Promise<ExpenseForecast[]> {
    try {
      const forecasts: ExpenseForecast[] = [];

    // Get historical expense data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - historicalMonths);

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
        type: "ALIŞ",
      },
      include: {
        lines: true,
      },
    });

    // Calculate monthly expenses by category (simplified - using VAT rates as proxy)
    const monthlyExpenses = new Map<string, number>();
    for (const invoice of invoices) {
      const monthKey = invoice.issueDate.toISOString().substring(0, 7);
      const current = monthlyExpenses.get(monthKey) || 0;
      monthlyExpenses.set(monthKey, current + Number(invoice.totalAmount));
    }

    const months = Array.from(monthlyExpenses.keys()).sort();
    const expenses = months.map((m) => monthlyExpenses.get(m) || 0);

    if (expenses.length < 2) {
      return forecasts;
    }

    const avgExpenses = expenses.reduce((sum, e) => sum + e, 0) / expenses.length;
    const recentAvg = expenses.slice(-3).reduce((sum, e) => sum + e, 0) / Math.min(3, expenses.length);

    // Generate forecasts
    const lastMonth = new Date(months[months.length - 1] + "-01");
    for (let i = 1; i <= forecastPeriods; i++) {
      const forecastMonth = new Date(lastMonth);
      forecastMonth.setMonth(forecastMonth.getMonth() + i);
      const period = forecastMonth.toISOString().substring(0, 7);

      const baseForecast = recentAvg;
      const confidence = Math.max(0.5, 1 - (i * 0.1));
      const variance = avgExpenses * 0.15;

      // Category breakdown (simplified)
      const categoryBreakdown = [
        {
          category: "Genel Giderler",
          forecastedAmount: baseForecast * 0.4,
          percentage: 40,
        },
        {
          category: "Personel Giderleri",
          forecastedAmount: baseForecast * 0.3,
          percentage: 30,
        },
        {
          category: "Operasyonel Giderler",
          forecastedAmount: baseForecast * 0.2,
          percentage: 20,
        },
        {
          category: "Diğer",
          forecastedAmount: baseForecast * 0.1,
          percentage: 10,
        },
      ];

      forecasts.push({
        period,
        forecastedExpenses: Math.max(0, Math.round(baseForecast * 100) / 100),
        confidence: Math.round(confidence * 100) / 100,
        lowerBound: Math.max(0, Math.round((baseForecast - variance) * 100) / 100),
        upperBound: Math.round((baseForecast + variance) * 100) / 100,
        categoryBreakdown: categoryBreakdown.map((cat) => ({
          ...cat,
          forecastedAmount: Math.round(cat.forecastedAmount * 100) / 100,
        })),
      });
    }

      return forecasts;
    } catch (error) {
      logger.error("Error in generateExpenseForecast:", error);
      return [];
    }
  }

  /**
   * Get comprehensive analytics dashboard data
   */
  async getAnalyticsDashboard(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    financialTrends: FinancialTrend[];
    riskTrends: RiskTrend[];
    portfolio: ClientPortfolioAnalytics;
    revenueForecast: RevenueForecast[];
    expenseForecast: ExpenseForecast[];
    summary: {
      totalRevenue: number;
      totalExpenses: number;
      netProfit: number;
      profitMargin: number;
      averageRiskScore: number;
      highRiskClientCount: number;
    };
  }> {
    try {
      const [financialTrends, riskTrends, portfolio, revenueForecast, expenseForecast] = await Promise.all([
        this.getFinancialTrends(tenantId, periodStart, periodEnd, "monthly"),
        this.getRiskTrends(tenantId, periodStart, periodEnd, "monthly"),
        this.getClientPortfolioAnalytics(tenantId, periodStart, periodEnd),
        this.generateRevenueForecast(tenantId, 3, 12),
        this.generateExpenseForecast(tenantId, 3, 12),
      ]);

      // Calculate summary
      const totalRevenue = financialTrends.reduce((sum, t) => sum + t.revenue, 0);
      const totalExpenses = financialTrends.reduce((sum, t) => sum + t.expenses, 0);
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      const averageRiskScore = riskTrends.length > 0
        ? riskTrends.reduce((sum, t) => sum + t.averageRiskScore, 0) / riskTrends.length
        : 0;

      return {
        financialTrends,
        riskTrends,
        portfolio,
        revenueForecast,
        expenseForecast,
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalExpenses: Math.round(totalExpenses * 100) / 100,
          netProfit: Math.round(netProfit * 100) / 100,
          profitMargin: Math.round(profitMargin * 100) / 100,
          averageRiskScore: Math.round(averageRiskScore * 100) / 100,
          highRiskClientCount: portfolio.highRiskClients,
        },
      };
    } catch (error) {
      logger.error("Error in getAnalyticsDashboard:", error);
      // Return empty dashboard on error instead of crashing
      return {
        financialTrends: [],
        riskTrends: [],
        portfolio: {
          totalClients: 0,
          activeClients: 0,
          highRiskClients: 0,
          mediumRiskClients: 0,
          lowRiskClients: 0,
          totalRevenue: 0,
          averageRevenuePerClient: 0,
          topClients: [],
          riskDistribution: {
            low: 0,
            medium: 0,
            high: 0,
          },
        },
        revenueForecast: [],
        expenseForecast: [],
        summary: {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          profitMargin: 0,
          averageRiskScore: 0,
          highRiskClientCount: 0,
        },
      };
    }
  }

  /**
   * Get period key for grouping
   */
  private getPeriodKey(date: Date, granularity: "daily" | "weekly" | "monthly" | "quarterly"): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    switch (granularity) {
      case "daily":
        return `${year}-${month}-${day}`;
      case "weekly":
        const week = Math.ceil(date.getDate() / 7);
        return `${year}-W${week}`;
      case "monthly":
        return `${year}-${month}`;
      case "quarterly":
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${year}-Q${quarter}`;
      default:
        return `${year}-${month}`;
    }
  }
}

export const analyticsService = new AnalyticsService();

