import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import { cacheMiddleware } from "../middleware/cache-middleware";
import { validate, clientCompanyIdParamSchema } from "../middleware/validation-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response, NextFunction } from "express";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ─── Schemas ─────────────────────────────────────────────────────────

const analyzeBody = z.object({
  sectorCode: z.string().min(2).max(4).optional(),
});

// ─── Routes ──────────────────────────────────────────────────────────

// GET /api/v1/sectoral-benchmark/sectors
router.get(
  "/sectors",
  requirePermission("risk:view"),
  cacheMiddleware(3600000),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { sectoralBenchmarkService } = await import("../services/sectoral-benchmark-service");
      const sectors = sectoralBenchmarkService.getSectorList();
      res.json({ data: sectors });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/sectoral-benchmark/:clientCompanyId
router.get(
  "/:clientCompanyId",
  requirePermission("risk:view"),
  validate({ params: clientCompanyIdParamSchema }),
  cacheMiddleware(3600000),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { sectoralBenchmarkService } = await import("../services/sectoral-benchmark-service");
      const result = await sectoralBenchmarkService.analyzeCompany(
        req.context!.tenantId!,
        req.params.clientCompanyId
      );
      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

// POST /api/v1/sectoral-benchmark/:clientCompanyId/analyze
router.post(
  "/:clientCompanyId/analyze",
  requirePermission("risk:view"),
  validate({ params: clientCompanyIdParamSchema, body: analyzeBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { sectoralBenchmarkService } = await import("../services/sectoral-benchmark-service");
      const result = await sectoralBenchmarkService.analyzeCompany(
        req.context!.tenantId!,
        req.params.clientCompanyId,
        req.body.sectorCode
      );
      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
