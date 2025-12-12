import { riskService } from "../services/risk-service";
import { riskExplanationService } from "../services/risk-explanation-service";
import { riskTrendService } from "../services/risk-trend-service";
import { riskAlertService } from "../services/risk-alert-service";
import { riskTrendsService } from "../services/risk-trends-service";
import { riskBreakdownService } from "../services/risk-breakdown-service";
import { riskRecommendationsService } from "../services/risk-recommendations-service";
import { riskHeatMapService } from "../services/risk-heatmap-service";
import { riskForecastService } from "../services/risk-forecast-service";
import { riskExportService } from "../services/risk-export-service";
import { mlFraudDetectorService } from "../services/ml-fraud-detector-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response, NextFunction } from "express";

import { Router, type Router as ExpressRouter } from "express";
const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/v1/risk/documents/:id
router.get(
  "/documents/:id",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await riskService.getDocumentRiskScore(req.context!.tenantId!, req.params.id);
      res.json({ data: result });
    } catch (error: any) {
      console.error("Error getting document risk score:", error);
      const statusCode = error.statusCode || 500;
      const message = error.message || "Belge risk skoru alınırken bir hata oluştu.";
      res.status(statusCode).json({ error: { message } });
    }
  }
);

// GET /api/v1/risk/companies/:id
router.get(
  "/companies/:id",
  requirePermission("clients:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await riskService.getClientCompanyRiskScore(req.context!.tenantId!, req.params.id);
      res.json({ data: result });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: { message: error.message } });
    }
  }
);

// GET /api/v1/risk/dashboard
router.get(
  "/dashboard",
  requirePermission("documents:read"), // All roles can view risk dashboard
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dashboard = await riskService.getTenantRiskDashboard(req.context!.tenantId!);
      res.json({ data: dashboard });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/risk/dashboard/recent-alerts
router.get(
  "/dashboard/recent-alerts",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      
      // Get critical alerts first
      const criticalAlerts = await riskAlertService.listAlerts(req.context!.tenantId!, {
        severity: "critical",
        status: "open",
        page: 1,
        pageSize: limit,
      });

      let allAlerts = criticalAlerts.data;

      // Also get high severity alerts if less than limit
      if (allAlerts.length < limit) {
        const highAlerts = await riskAlertService.listAlerts(req.context!.tenantId!, {
          severity: "high",
          status: "open",
          page: 1,
          pageSize: limit - allAlerts.length,
        });
        allAlerts = [...allAlerts, ...highAlerts.data].slice(0, limit);
      }

      res.json({ data: allAlerts });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/risk/documents/:id/explanation
router.get(
  "/documents/:id/explanation",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const explanation = await riskExplanationService.explainDocumentRisk(
        req.context!.tenantId!,
        req.params.id
      );
      res.json({ data: explanation });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: { message: error.message } });
    }
  }
);

// GET /api/v1/risk/companies/:id/explanation
router.get(
  "/companies/:id/explanation",
  requirePermission("clients:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const explanation = await riskExplanationService.explainCompanyRisk(
        req.context!.tenantId!,
        req.params.id
      );
      res.json({ data: explanation });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: { message: error.message } });
    }
  }
);

// GET /api/v1/risk/documents/:id/trend
router.get(
  "/documents/:id/trend",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 90;
      const trend = await riskTrendService.getDocumentRiskTrend(
        req.context!.tenantId!,
        req.params.id,
        days
      );
      res.json({ data: trend });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: { message: error.message } });
    }
  }
);

// GET /api/v1/risk/companies/:id/trend
router.get(
  "/companies/:id/trend",
  requirePermission("clients:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 90;
      const trend = await riskTrendService.getCompanyRiskTrend(
        req.context!.tenantId!,
        req.params.id,
        days
      );
      res.json({ data: trend });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: { message: error.message } });
    }
  }
);

// GET /api/v1/risk/dashboard/trends
router.get(
  "/dashboard/trends",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const period = (req.query.period as "7d" | "30d" | "90d" | "1y") || "30d";
      const trends = await riskTrendsService.getDashboardTrends(req.context!.tenantId!, period);
      res.json({ data: trends });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/risk/dashboard/breakdown
router.get(
  "/dashboard/breakdown",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const breakdown = await riskBreakdownService.getTenantRiskBreakdown(req.context!.tenantId!);
      res.json({ data: breakdown });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/risk/dashboard/recommendations
router.get(
  "/dashboard/recommendations",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const recommendations = await riskRecommendationsService.getRecommendations(req.context!.tenantId!);
      res.json({ data: recommendations });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/risk/dashboard/heatmap
router.get(
  "/dashboard/heatmap",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const heatmap = await riskHeatMapService.getRiskHeatMap(req.context!.tenantId!);
      res.json({ data: heatmap });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/risk/dashboard/forecast
router.get(
  "/dashboard/forecast",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const forecast = await riskForecastService.getRiskForecast(req.context!.tenantId!, days);
      res.json({ data: forecast });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/risk/dashboard/export
router.get(
  "/dashboard/export",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const format = (req.query.format as "csv" | "json") || "json";

      if (format === "csv") {
        const csv = await riskExportService.exportDashboardAsCSV(req.context!.tenantId!);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="risk-dashboard-${Date.now()}.csv"`);
        res.send(csv);
      } else {
        const json = await riskExportService.exportDashboardAsJSON(req.context!.tenantId!);
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="risk-dashboard-${Date.now()}.json"`);
        res.json(json);
      }
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/risk/dashboard/export-data (for frontend PDF generation)
router.get(
  "/dashboard/export-data",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const exportData = await riskExportService.getExportData(req.context!.tenantId!);
      res.json({ data: exportData });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/risk/ml-fraud/:clientCompanyId
router.get(
  "/ml-fraud/:clientCompanyId",
  requirePermission("clients:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const fraudScore = await mlFraudDetectorService.calculateFraudScore(
        req.context!.tenantId!,
        req.params.clientCompanyId
      );
      res.json({ data: fraudScore });
    } catch (error: any) {
      next(error);
    }
  }
);

// POST /api/v1/risk/ml-fraud/:clientCompanyId/check
router.post(
  "/ml-fraud/:clientCompanyId/check",
  requirePermission("clients:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await mlFraudDetectorService.checkAndAlertFraud(
        req.context!.tenantId!,
        req.params.clientCompanyId
      );
      res.json({ data: { message: "ML dolandırıcılık kontrolü tamamlandı." } });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;

