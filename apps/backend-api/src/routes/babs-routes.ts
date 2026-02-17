import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { validate, baseListQuerySchema, idParamSchema, statusUpdateSchema } from "../middleware/validation-middleware";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response, NextFunction } from "express";

const generateFormBody = z.object({
  clientCompanyId: z.string().min(1, "Müşteri şirket ID gerekli"),
  formType: z.enum(["BA", "BS"], { message: "Form türü BA veya BS olmalı" }),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Dönem formatı: YYYY-MM"),
});

const listFormsQuery = baseListQuerySchema.extend({
  formType: z.string().optional(),
  period: z.string().optional(),
});

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/v1/babs/dashboard - Ba-Bs dashboard statistics
router.get(
  "/dashboard",
  requirePermission("babs:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { babsFormService } = await import("../services/babs-form-service");
      const stats = await babsFormService.getDashboardStats(req.context!.tenantId!);
      res.json({ data: stats });
    } catch (error: any) {
      next(error);
    }
  }
);

// POST /api/v1/babs/generate - Generate Ba or Bs form
router.post(
  "/generate",
  requirePermission("babs:create"),
  validate({ body: generateFormBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { babsFormService } = await import("../services/babs-form-service");
      const form = await babsFormService.generateForm(
        req.context!.tenantId!,
        req.context!.user.id,
        req.body
      );
      res.status(201).json({ data: form });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/babs/forms - List Ba-Bs forms
router.get(
  "/forms",
  requirePermission("babs:view"),
  validate({ query: listFormsQuery }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { babsFormService } = await import("../services/babs-form-service");
      const result = await babsFormService.listForms(req.context!.tenantId!, {
        clientCompanyId: req.query.clientCompanyId as string,
        formType: req.query.formType as string,
        period: req.query.period as string,
        status: req.query.status as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      });
      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/babs/forms/:id - Get a single form
router.get(
  "/forms/:id",
  requirePermission("babs:view"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { babsFormService } = await import("../services/babs-form-service");
      const form = await babsFormService.getForm(req.context!.tenantId!, req.params.id);
      res.json({ data: form });
    } catch (error: any) {
      next(error);
    }
  }
);

// PATCH /api/v1/babs/forms/:id/status - Update form status
router.patch(
  "/forms/:id/status",
  requirePermission("babs:manage"),
  validate({ params: idParamSchema, body: statusUpdateSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { babsFormService } = await import("../services/babs-form-service");
      const form = await babsFormService.updateFormStatus(
        req.context!.tenantId!,
        req.params.id,
        req.body.status,
        req.body.notes
      );
      res.json({ data: form });
    } catch (error: any) {
      next(error);
    }
  }
);

// POST /api/v1/babs/forms/:id/cross-check - Cross-check form
router.post(
  "/forms/:id/cross-check",
  requirePermission("babs:manage"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { babsFormService } = await import("../services/babs-form-service");
      const result = await babsFormService.crossCheck(req.context!.tenantId!, req.params.id);
      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
