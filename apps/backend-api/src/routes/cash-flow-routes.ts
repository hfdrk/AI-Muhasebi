import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import { validate, baseListQuerySchema, idParamSchema } from "../middleware/validation-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response, NextFunction } from "express";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ─── Schemas ─────────────────────────────────────────────────────────

const listQuery = baseListQuerySchema.extend({
  type: z.enum(["INFLOW", "OUTFLOW"]).optional(),
  category: z.string().optional(),
  source: z.string().optional(),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
  clientCompanyId: z.string().optional(),
});

const createBody = z.object({
  type: z.enum(["INFLOW", "OUTFLOW"], { message: "Tür INFLOW veya OUTFLOW olmalı" }),
  category: z.string().min(1, "Kategori gerekli"),
  source: z.string().optional(),
  amount: z.number().positive("Tutar pozitif olmalı"),
  currency: z.string().length(3).optional(),
  entryDate: z.string().min(1, "Tarih gerekli"),
  description: z.string().optional(),
  clientCompanyId: z.string().optional(),
  isRecurring: z.boolean().optional(),
});

const updateBody = createBody.partial();

const forecastQuery = z.object({
  months: z.coerce.number().int().min(1).max(24).optional(),
});

const dailyQuery = z.object({
  year: z.coerce.number().int().min(2020).max(2030),
  month: z.coerce.number().int().min(1).max(12),
});

// ─── Routes ──────────────────────────────────────────────────────────

// GET / - List entries
router.get(
  "/",
  requirePermission("cash_flow:view"),
  validate({ query: listQuery }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { cashFlowService } = await import("../services/cash-flow-service");
      const result = await cashFlowService.list(req.context!.tenantId!, req.query as any);
      res.json(result);
    } catch (error) { next(error); }
  }
);

// GET /stats - Dashboard stats
router.get(
  "/stats",
  requirePermission("cash_flow:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { cashFlowService } = await import("../services/cash-flow-service");
      const stats = await cashFlowService.getDashboardStats(req.context!.tenantId!);
      res.json(stats);
    } catch (error) { next(error); }
  }
);

// GET /summary - Current period summary
router.get(
  "/summary",
  requirePermission("cash_flow:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { cashFlowService } = await import("../services/cash-flow-service");
      const summary = await cashFlowService.getCurrentSummary(req.context!.tenantId!);
      res.json(summary);
    } catch (error) { next(error); }
  }
);

// GET /forecast - N-month forecast
router.get(
  "/forecast",
  requirePermission("cash_flow:view"),
  validate({ query: forecastQuery }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { cashFlowService } = await import("../services/cash-flow-service");
      const months = parseInt(req.query.months as string) || 12;
      const forecast = await cashFlowService.getForecast(req.context!.tenantId!, months);
      res.json(forecast);
    } catch (error) { next(error); }
  }
);

// GET /daily - Daily breakdown
router.get(
  "/daily",
  requirePermission("cash_flow:view"),
  validate({ query: dailyQuery }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { cashFlowService } = await import("../services/cash-flow-service");
      const year = parseInt(req.query.year as string);
      const month = parseInt(req.query.month as string);
      const daily = await cashFlowService.getDailyBreakdown(req.context!.tenantId!, year, month);
      res.json(daily);
    } catch (error) { next(error); }
  }
);

// POST / - Create manual entry
router.post(
  "/",
  requirePermission("cash_flow:manage"),
  validate({ body: createBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { cashFlowService } = await import("../services/cash-flow-service");
      const item = await cashFlowService.create(req.context!.tenantId!, req.body);
      res.status(201).json(item);
    } catch (error) { next(error); }
  }
);

// POST /sync - Sync from invoices
router.post(
  "/sync",
  requirePermission("cash_flow:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { cashFlowService } = await import("../services/cash-flow-service");
      const result = await cashFlowService.syncFromInvoices(req.context!.tenantId!);
      res.json(result);
    } catch (error) { next(error); }
  }
);

// PUT /:id - Update
router.put(
  "/:id",
  requirePermission("cash_flow:manage"),
  validate({ params: idParamSchema, body: updateBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { cashFlowService } = await import("../services/cash-flow-service");
      const item = await cashFlowService.update(req.context!.tenantId!, req.params.id, req.body);
      res.json(item);
    } catch (error) { next(error); }
  }
);

// DELETE /:id - Delete
router.delete(
  "/:id",
  requirePermission("cash_flow:manage"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { cashFlowService } = await import("../services/cash-flow-service");
      await cashFlowService.delete(req.context!.tenantId!, req.params.id);
      res.json({ message: "Nakit akış kaydı silindi." });
    } catch (error) { next(error); }
  }
);

export default router;
