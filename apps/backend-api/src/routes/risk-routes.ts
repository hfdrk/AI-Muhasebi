import { riskService } from "../services/risk-service";
import { riskExplanationService } from "../services/risk-explanation-service";
import { riskTrendService } from "../services/risk-trend-service";
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

export default router;

