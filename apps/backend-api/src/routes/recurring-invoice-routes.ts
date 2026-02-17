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
  clientCompanyId: z.string().optional(),
  frequency: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

const createBody = z.object({
  clientCompanyId: z.string().min(1, "Müşteri şirket ID gerekli"),
  templateName: z.string().min(1, "Şablon adı gerekli"),
  type: z.string().min(1, "Fatura türü gerekli"),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"], { message: "Geçersiz frekans" }),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  startDate: z.string().min(1, "Başlangıç tarihi gerekli"),
  endDate: z.string().optional(),
  totalAmount: z.number().positive("Tutar pozitif olmalı"),
  currency: z.string().length(3).optional(),
  taxAmount: z.number().min(0, "Vergi tutarı negatif olamaz"),
  counterpartyName: z.string().optional(),
  counterpartyTaxNo: z.string().optional(),
  lineItems: z.array(z.any()).default([]),
  autoSend: z.boolean().optional(),
  notes: z.string().optional(),
});

const updateBody = createBody.partial();

// ─── Routes ──────────────────────────────────────────────────────────

// GET / - List recurring invoices
router.get(
  "/",
  requirePermission("invoices:read"),
  validate({ query: listQuery }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { recurringInvoiceService } = await import("../services/recurring-invoice-service");
      const result = await recurringInvoiceService.list(req.context!.tenantId!, req.query as any);
      res.json(result);
    } catch (error) { next(error); }
  }
);

// GET /stats - Dashboard stats
router.get(
  "/stats",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { recurringInvoiceService } = await import("../services/recurring-invoice-service");
      const stats = await recurringInvoiceService.getDashboardStats(req.context!.tenantId!);
      res.json(stats);
    } catch (error) { next(error); }
  }
);

// GET /:id - Get single
router.get(
  "/:id",
  requirePermission("invoices:read"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { recurringInvoiceService } = await import("../services/recurring-invoice-service");
      const item = await recurringInvoiceService.getById(req.context!.tenantId!, req.params.id);
      res.json(item);
    } catch (error) { next(error); }
  }
);

// POST / - Create
router.post(
  "/",
  requirePermission("invoices:manage"),
  validate({ body: createBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { recurringInvoiceService } = await import("../services/recurring-invoice-service");
      const item = await recurringInvoiceService.create(req.context!.tenantId!, req.body);
      res.status(201).json(item);
    } catch (error) { next(error); }
  }
);

// PUT /:id - Update
router.put(
  "/:id",
  requirePermission("invoices:manage"),
  validate({ params: idParamSchema, body: updateBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { recurringInvoiceService } = await import("../services/recurring-invoice-service");
      const item = await recurringInvoiceService.update(req.context!.tenantId!, req.params.id, req.body);
      res.json(item);
    } catch (error) { next(error); }
  }
);

// DELETE /:id - Soft delete
router.delete(
  "/:id",
  requirePermission("invoices:manage"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { recurringInvoiceService } = await import("../services/recurring-invoice-service");
      await recurringInvoiceService.delete(req.context!.tenantId!, req.params.id);
      res.json({ message: "Tekrarlayan fatura silindi." });
    } catch (error) { next(error); }
  }
);

// PATCH /:id/toggle - Toggle active
router.patch(
  "/:id/toggle",
  requirePermission("invoices:manage"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { recurringInvoiceService } = await import("../services/recurring-invoice-service");
      const item = await recurringInvoiceService.toggleActive(req.context!.tenantId!, req.params.id);
      res.json(item);
    } catch (error) { next(error); }
  }
);

// POST /generate - Trigger due invoice generation
router.post(
  "/generate",
  requirePermission("invoices:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { recurringInvoiceService } = await import("../services/recurring-invoice-service");
      const result = await recurringInvoiceService.generateDueInvoices(req.context!.tenantId!);
      res.json(result);
    } catch (error) { next(error); }
  }
);

export default router;
