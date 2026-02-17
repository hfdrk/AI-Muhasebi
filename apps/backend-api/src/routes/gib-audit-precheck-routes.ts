import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import { validate, clientCompanyIdParamSchema } from "../middleware/validation-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response, NextFunction } from "express";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ─── Schemas ─────────────────────────────────────────────────────────

const periodQuerySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Dönem formatı YYYY-MM olmalı (ör: 2025-01)").optional(),
});

const analyzeBodySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Dönem formatı YYYY-MM olmalı (ör: 2025-01)").optional(),
});

// ─── Routes ──────────────────────────────────────────────────────────

// GET /api/v1/gib-audit-precheck/:clientCompanyId
router.get(
  "/:clientCompanyId",
  requirePermission("risk:view"),
  validate({ params: clientCompanyIdParamSchema, query: periodQuerySchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { gibAuditPrecheckService } = await import("../services/gib-audit-precheck-service");
      const result = await gibAuditPrecheckService.runPrecheck(
        req.context!.tenantId!,
        req.params.clientCompanyId,
        req.query.period as string | undefined
      );
      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

// POST /api/v1/gib-audit-precheck/:clientCompanyId/analyze
router.post(
  "/:clientCompanyId/analyze",
  requirePermission("risk:view"),
  validate({ params: clientCompanyIdParamSchema, body: analyzeBodySchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { gibAuditPrecheckService } = await import("../services/gib-audit-precheck-service");
      const result = await gibAuditPrecheckService.runPrecheck(
        req.context!.tenantId!,
        req.params.clientCompanyId,
        req.body.period
      );
      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
