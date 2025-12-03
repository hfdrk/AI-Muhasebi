import { Router } from "express";
import { z } from "zod";
import { riskAlertService } from "../services/risk-alert-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission, requireRole } from "../middleware/rbac-middleware";
import { TENANT_ROLES } from "@repo/core-domain";
import type { AuthenticatedRequest, Response } from "../types/request-context";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const updateAlertStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "closed", "ignored"]),
});

// GET /api/v1/risk/alerts
router.get(
  "/",
  requirePermission("documents:read"), // All roles can view alerts
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filters = {
        clientCompanyId: req.query.clientCompanyId as string | undefined,
        severity: req.query.severity as string | undefined,
        status: req.query.status as any,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      };

      const result = await riskAlertService.listAlerts(req.context!.tenantId!, filters);
      res.json({ data: result });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: { message: error.message } });
    }
  }
);

// PATCH /api/v1/risk/alerts/:id/status
router.patch(
  "/:id/status",
  requireRole([TENANT_ROLES.TenantOwner, TENANT_ROLES.Accountant, TENANT_ROLES.Staff]), // ReadOnly cannot update
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = updateAlertStatusSchema.parse(req.body);
      const alert = await riskAlertService.updateAlertStatus(
        req.context!.tenantId!,
        req.params.id,
        body.status,
        req.context!.user.id
      );
      res.json({ data: alert });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            message: error.errors[0].message,
          },
        });
      }
      res.status(error.statusCode || 500).json({ error: { message: error.message } });
    }
  }
);

export default router;

