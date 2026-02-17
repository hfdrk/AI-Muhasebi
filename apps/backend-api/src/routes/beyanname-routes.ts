import { Router, type Router as ExpressRouter } from "express";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import { z } from "zod";
import { validate, baseListQuerySchema, idParamSchema, statusUpdateSchema } from "../middleware/validation-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response, NextFunction } from "express";

const createBeyannameBody = z.object({
  clientCompanyId: z.string().min(1, "Müşteri şirket ID gerekli"),
  type: z.string().min(1, "Beyanname türü gerekli"),
  period: z.string().min(1, "Dönem gerekli"),
  dueDate: z.string().min(1, "Son tarih gerekli"),
  notes: z.string().optional(),
});

const listBeyannameQuery = baseListQuerySchema.extend({
  type: z.string().optional(),
  period: z.string().optional(),
});

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/v1/beyanname/dashboard - Beyanname dashboard statistics
router.get(
  "/dashboard",
  requirePermission("beyanname:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { beyannameService } = await import("../services/beyanname-service");
      const stats = await beyannameService.getDashboardStats(req.context!.tenantId!);
      res.json({ data: stats });
    } catch (error: any) {
      next(error);
    }
  }
);

// POST /api/v1/beyanname - Create a new beyanname
router.post(
  "/",
  requirePermission("beyanname:create"),
  validate({ body: createBeyannameBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { beyannameService } = await import("../services/beyanname-service");
      const beyanname = await beyannameService.createBeyanname(
        req.context!.tenantId!,
        req.context!.user.id,
        req.body
      );
      res.status(201).json({ data: beyanname });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/beyanname - List beyannameler
router.get(
  "/",
  requirePermission("beyanname:view"),
  validate({ query: listBeyannameQuery }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { beyannameService } = await import("../services/beyanname-service");
      const result = await beyannameService.listBeyannameler(req.context!.tenantId!, {
        clientCompanyId: req.query.clientCompanyId as string,
        type: req.query.type as string,
        status: req.query.status as string,
        period: req.query.period as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      });
      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/beyanname/:id - Get single beyanname
router.get(
  "/:id",
  requirePermission("beyanname:view"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { beyannameService } = await import("../services/beyanname-service");
      const beyanname = await beyannameService.getBeyanname(req.context!.tenantId!, req.params.id);
      res.json({ data: beyanname });
    } catch (error: any) {
      next(error);
    }
  }
);

// POST /api/v1/beyanname/:id/calculate - Calculate beyanname amounts
router.post(
  "/:id/calculate",
  requirePermission("beyanname:manage"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { beyannameService } = await import("../services/beyanname-service");
      const beyanname = await beyannameService.calculateBeyanname(req.context!.tenantId!, req.params.id);
      res.json({ data: beyanname });
    } catch (error: any) {
      next(error);
    }
  }
);

// PATCH /api/v1/beyanname/:id/status - Update beyanname status
router.patch(
  "/:id/status",
  requirePermission("beyanname:manage"),
  validate({ params: idParamSchema, body: statusUpdateSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { beyannameService } = await import("../services/beyanname-service");
      const beyanname = await beyannameService.updateBeyannameStatus(
        req.context!.tenantId!,
        req.params.id,
        req.context!.user.id,
        req.body.status,
        req.body.notes
      );
      res.json({ data: beyanname });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
