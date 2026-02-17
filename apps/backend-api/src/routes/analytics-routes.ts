import { Router, type Router as ExpressRouter } from "express";
import type { NextFunction, Response } from "express";
import { z } from "zod";
import { analyticsService } from "../services/analytics-service";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import { cacheMiddleware } from "../middleware/cache-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const dateRangeSchema = z.object({
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  granularity: z.enum(["daily", "weekly", "monthly", "quarterly"]).optional(),
});

// Get financial trends
router.get(
  "/financial-trends",
  requirePermission("reports:read"),
  cacheMiddleware(300000),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = dateRangeSchema.parse(req.query);
      const trends = await analyticsService.getFinancialTrends(
        req.context!.tenantId!,
        filters.startDate,
        filters.endDate,
        filters.granularity || "monthly"
      );
      res.json({ data: trends });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            message: error.issues[0]?.message || "Geçersiz bilgiler.",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  }
);

// Get risk trends
router.get(
  "/risk-trends",
  requirePermission("reports:read"),
  cacheMiddleware(300000),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = dateRangeSchema.parse(req.query);
      const trends = await analyticsService.getRiskTrends(
        req.context!.tenantId!,
        filters.startDate,
        filters.endDate,
        (filters.granularity as "daily" | "weekly" | "monthly") || "monthly"
      );
      res.json({ data: trends });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            message: error.issues[0]?.message || "Geçersiz bilgiler.",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  }
);

// Get client portfolio analytics
router.get(
  "/portfolio",
  requirePermission("reports:read"),
  cacheMiddleware(300000),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const portfolio = await analyticsService.getClientPortfolioAnalytics(
        req.context!.tenantId!,
        startDate,
        endDate
      );
      res.json({ data: portfolio });
    } catch (error) {
      next(error);
    }
  }
);

// Get revenue forecast
router.get(
  "/revenue-forecast",
  requirePermission("reports:read"),
  cacheMiddleware(300000),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const periods = req.query.periods ? parseInt(req.query.periods as string, 10) : 3;
      const historicalMonths = req.query.historicalMonths
        ? parseInt(req.query.historicalMonths as string, 10)
        : 12;
      const forecast = await analyticsService.generateRevenueForecast(
        req.context!.tenantId!,
        periods,
        historicalMonths
      );
      res.json({ data: forecast });
    } catch (error) {
      next(error);
    }
  }
);

// Get expense forecast
router.get(
  "/expense-forecast",
  requirePermission("reports:read"),
  cacheMiddleware(300000),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const periods = req.query.periods ? parseInt(req.query.periods as string, 10) : 3;
      const historicalMonths = req.query.historicalMonths
        ? parseInt(req.query.historicalMonths as string, 10)
        : 12;
      const forecast = await analyticsService.generateExpenseForecast(
        req.context!.tenantId!,
        periods,
        historicalMonths
      );
      res.json({ data: forecast });
    } catch (error) {
      next(error);
    }
  }
);

// Get comprehensive analytics dashboard
router.get(
  "/dashboard",
  requirePermission("reports:read"),
  cacheMiddleware(300000),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = dateRangeSchema.parse(req.query);
      const dashboard = await analyticsService.getAnalyticsDashboard(
        req.context!.tenantId!,
        filters.startDate,
        filters.endDate
      );
      
      // Transform backend response to match frontend expectations
      // Calculate growth from financial trends (comparing first and last periods)
      const financialTrends = dashboard.financialTrends;
      let revenueGrowth = 0;
      let expenseGrowth = 0;
      
      if (financialTrends.length >= 2) {
        const first = financialTrends[0];
        const last = financialTrends[financialTrends.length - 1];
        
        if (first.revenue > 0) {
          revenueGrowth = ((last.revenue - first.revenue) / first.revenue) * 100;
        }
        if (first.expenses > 0) {
          expenseGrowth = ((last.expenses - first.expenses) / first.expenses) * 100;
        }
      }
      
      // Determine risk trend
      const riskTrends = dashboard.riskTrends;
      let riskTrend: "increasing" | "decreasing" | "stable" = "stable";
      if (riskTrends.length >= 2) {
        const recent = riskTrends[riskTrends.length - 1].averageRiskScore;
        const previous = riskTrends[riskTrends.length - 2].averageRiskScore;
        if (recent > previous + 5) riskTrend = "increasing";
        else if (recent < previous - 5) riskTrend = "decreasing";
      }
      
      // Transform to frontend format
      res.json({
        data: {
          financial: {
            totalRevenue: dashboard.summary.totalRevenue,
            totalExpenses: dashboard.summary.totalExpenses,
            netProfit: dashboard.summary.netProfit,
            profitMargin: dashboard.summary.profitMargin,
            revenueGrowth: Math.round(revenueGrowth * 100) / 100,
            expenseGrowth: Math.round(expenseGrowth * 100) / 100,
          },
          risk: {
            averageRiskScore: dashboard.summary.averageRiskScore,
            highRiskClientCount: dashboard.summary.highRiskClientCount,
            criticalAlertsCount: riskTrends.reduce((sum, t) => sum + t.criticalAlertsCount, 0),
            riskTrend,
          },
          portfolio: {
            totalClients: dashboard.portfolio.totalClients,
            activeClients: dashboard.portfolio.activeClients,
            newClients: dashboard.portfolio.newClients || 0,
            churnedClients: dashboard.portfolio.churnedClients || 0,
          },
          forecasts: {
            nextMonthRevenue: dashboard.revenueForecast[0]?.forecastedRevenue || 0,
            nextMonthExpenses: dashboard.expenseForecast[0]?.forecastedExpenses || 0,
            nextQuarterRevenue: dashboard.revenueForecast.slice(0, 3).reduce((sum, f) => sum + f.forecastedRevenue, 0),
            nextQuarterExpenses: dashboard.expenseForecast.slice(0, 3).reduce((sum, f) => sum + f.forecastedExpenses, 0),
          },
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            message: error.issues[0]?.message || "Geçersiz bilgiler.",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  }
);

export default router;


