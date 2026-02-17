import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import { validate, baseListQuerySchema, idParamSchema, clientCompanyIdParamSchema, statusUpdateSchema } from "../middleware/validation-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response, NextFunction } from "express";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ─── Schemas ─────────────────────────────────────────────────────────

const listReportsQuery = baseListQuerySchema.extend({
  reportType: z.string().optional(),
});

const createReportBody = z.object({
  clientCompanyId: z.string().min(1, "Müşteri şirket ID gerekli"),
  reportType: z.string().optional(),
  suspicionType: z.string().min(1, "Şüphe türü gerekli"),
  suspicionDetails: z.string().min(1, "Şüphe detayları gerekli"),
  transactionIds: z.array(z.string()).optional(),
  invoiceIds: z.array(z.string()).optional(),
  totalAmount: z.number().positive("Tutar pozitif olmalı"),
  currency: z.string().length(3).optional(),
  counterpartyName: z.string().optional(),
  counterpartyTaxNo: z.string().optional(),
  riskScore: z.number().min(0).max(100).optional(),
  riskIndicators: z.array(z.any()).optional(),
  notes: z.string().optional(),
});

// ─── Routes ──────────────────────────────────────────────────────────

// GET /api/v1/masak/dashboard
router.get(
  "/dashboard",
  requirePermission("masak:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { masakStrService } = await import("../services/masak-str-service");
      const stats = await masakStrService.getDashboardStats(req.context!.tenantId!);
      res.json({ data: stats });
    } catch (error: any) {
      next(error);
    }
  }
);

// POST /api/v1/masak/scan/:clientCompanyId
router.post(
  "/scan/:clientCompanyId",
  requirePermission("masak:create"),
  validate({ params: clientCompanyIdParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { masakStrService } = await import("../services/masak-str-service");
      const result = await masakStrService.scanForSuspiciousActivity(
        req.context!.tenantId!,
        req.params.clientCompanyId
      );
      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/masak/reports
router.get(
  "/reports",
  requirePermission("masak:view"),
  validate({ query: listReportsQuery }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { masakStrService } = await import("../services/masak-str-service");
      const result = await masakStrService.listReports(req.context!.tenantId!, {
        status: req.query.status as string,
        clientCompanyId: req.query.clientCompanyId as string,
        reportType: req.query.reportType as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      });
      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/masak/reports/:id
router.get(
  "/reports/:id",
  requirePermission("masak:view"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { masakStrService } = await import("../services/masak-str-service");
      const report = await masakStrService.getReport(req.context!.tenantId!, req.params.id);
      res.json({ data: report });
    } catch (error: any) {
      next(error);
    }
  }
);

// POST /api/v1/masak/reports
router.post(
  "/reports",
  requirePermission("masak:create"),
  validate({ body: createReportBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { masakStrService } = await import("../services/masak-str-service");
      const report = await masakStrService.createReport(
        req.context!.tenantId!,
        req.context!.user.id,
        req.body
      );
      res.status(201).json({ data: report });
    } catch (error: any) {
      next(error);
    }
  }
);

// PATCH /api/v1/masak/reports/:id/status
router.patch(
  "/reports/:id/status",
  requirePermission("masak:manage"),
  validate({ params: idParamSchema, body: statusUpdateSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { masakStrService } = await import("../services/masak-str-service");
      const report = await masakStrService.updateReportStatus(
        req.context!.tenantId!,
        req.params.id,
        req.context!.user.id,
        req.body.status,
        req.body.notes
      );
      res.json({ data: report });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
