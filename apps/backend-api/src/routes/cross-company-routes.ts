import { Router, type Router as ExpressRouter } from "express";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import { validate, clientCompanyIdParamSchema } from "../middleware/validation-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response, NextFunction } from "express";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ─── Routes ──────────────────────────────────────────────────────────

// GET /api/v1/cross-company-matching/scan
router.get(
  "/scan",
  requirePermission("risk:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { crossCompanyMatchingService } = await import("../services/cross-company-matching-service");
      const result = await crossCompanyMatchingService.scanTenant(req.context!.tenantId!);
      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/cross-company-matching/:clientCompanyId
router.get(
  "/:clientCompanyId",
  requirePermission("risk:view"),
  validate({ params: clientCompanyIdParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { crossCompanyMatchingService } = await import("../services/cross-company-matching-service");
      const result = await crossCompanyMatchingService.scanCompany(
        req.context!.tenantId!,
        req.params.clientCompanyId
      );
      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
