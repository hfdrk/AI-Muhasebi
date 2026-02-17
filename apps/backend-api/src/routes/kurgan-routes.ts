import { Router, type Router as ExpressRouter } from "express";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response, NextFunction } from "express";
import { z } from "zod";
import { validate, baseListQuerySchema, idParamSchema, clientCompanyIdParamSchema, statusUpdateSchema } from "../middleware/validation-middleware";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const listSignalsQuery = baseListQuerySchema.extend({
  severity: z.string().optional(),
  signalType: z.string().optional(),
});

// GET /api/v1/kurgan/dashboard - KURGAN dashboard statistics
router.get(
  "/dashboard",
  requirePermission("kurgan:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { kurganMonitorService } = await import("../services/kurgan-monitor-service");
      const stats = await kurganMonitorService.getDashboardStats(req.context!.tenantId!);
      res.json({ data: stats });
    } catch (error: any) {
      next(error);
    }
  }
);

// POST /api/v1/kurgan/analyze/:clientCompanyId - Run KURGAN analysis
router.post(
  "/analyze/:clientCompanyId",
  validate({ params: clientCompanyIdParamSchema }),
  requirePermission("kurgan:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { kurganMonitorService } = await import("../services/kurgan-monitor-service");
      const result = await kurganMonitorService.analyzeCompany(
        req.context!.tenantId!,
        req.params.clientCompanyId
      );

      // Save signals to database if any found
      if (result.signals.length > 0) {
        await kurganMonitorService.saveSignals(
          req.context!.tenantId!,
          req.params.clientCompanyId,
          result.signals
        );
      }

      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/kurgan/signals - List KURGAN signals
router.get(
  "/signals",
  validate({ query: listSignalsQuery }),
  requirePermission("kurgan:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { kurganMonitorService } = await import("../services/kurgan-monitor-service");
      const result = await kurganMonitorService.listSignals(req.context!.tenantId!, {
        clientCompanyId: req.query.clientCompanyId as string,
        status: req.query.status as string,
        severity: req.query.severity as string,
        signalType: req.query.signalType as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      });
      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

// PATCH /api/v1/kurgan/signals/:id/status - Update signal status
router.patch(
  "/signals/:id/status",
  validate({ params: idParamSchema, body: statusUpdateSchema }),
  requirePermission("kurgan:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { kurganMonitorService } = await import("../services/kurgan-monitor-service");
      const signal = await kurganMonitorService.updateSignalStatus(
        req.context!.tenantId!,
        req.params.id,
        req.context!.user.id,
        req.body.status,
        req.body.responseNotes
      );
      res.json({ data: signal });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
