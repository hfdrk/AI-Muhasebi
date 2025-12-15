import { z } from "zod";
import type { NextFunction } from "express";
import { scheduledReportService } from "../services/scheduled-report-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response } from "express";

import { Router, type Router as ExpressRouter } from "express";
const router: ExpressRouter = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/v1/report-execution-logs
router.get(
  "/",
  requirePermission("reports:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.context!.tenantId!;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({
          error: { message: "Limit 1 ile 100 arasında olmalıdır." },
        });
      }

      const logs = await scheduledReportService.listRecentExecutionLogsForTenant(tenantId, limit);

      res.json({
        data: logs.map((log) => ({
          id: log.id,
          reportCode: log.reportCode,
          scheduledReportId: log.scheduledReportId,
          startedAt: log.startedAt,
          finishedAt: log.finishedAt,
          status: log.status,
          message: log.message,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/report-execution-logs/scheduled/:scheduledReportId
router.get(
  "/scheduled/:scheduledReportId",
  requirePermission("reports:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.context!.tenantId!;
      const { scheduledReportId } = req.params;

      const logs = await scheduledReportService.listExecutionLogsForScheduledReport(
        tenantId,
        scheduledReportId
      );

      res.json({
        data: logs.map((log) => ({
          id: log.id,
          reportCode: log.reportCode,
          scheduledReportId: log.scheduledReportId,
          startedAt: log.startedAt,
          finishedAt: log.finishedAt,
          status: log.status,
          message: log.message,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;






