import { Router } from "express";
import { riskService } from "../services/risk-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest, Response } from "../types/request-context";

const router = Router();

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
      res.status(error.statusCode || 500).json({ error: { message: error.message } });
    }
  }
);

// GET /api/v1/risk/companies/:id
router.get(
  "/companies/:id",
  requirePermission("clientCompanies:read"),
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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dashboard = await riskService.getTenantRiskDashboard(req.context!.tenantId!);
      res.json({ data: dashboard });
    } catch (error: any) {
      throw error;
    }
  }
);

export default router;

