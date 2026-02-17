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
  type: z.string().optional(),
  isPaid: z.coerce.boolean().optional(),
  upcoming: z.coerce.boolean().optional(),
  overdue: z.coerce.boolean().optional(),
});

const createBody = z.object({
  clientCompanyId: z.string().optional(),
  invoiceId: z.string().optional(),
  checkNoteId: z.string().optional(),
  type: z.enum(["TAHSILAT", "ODEME", "CEK_VADESI", "SENET_VADESI"], { message: "Geçersiz hatırlatma türü" }),
  dueDate: z.string().min(1, "Vade tarihi gerekli"),
  amount: z.number().positive("Tutar pozitif olmalı"),
  currency: z.string().length(3).optional(),
  description: z.string().min(1, "Açıklama gerekli"),
  reminderDaysBefore: z.number().int().min(0).max(30).optional(),
});

const updateBody = createBody.partial();

// ─── Routes ──────────────────────────────────────────────────────────

// GET / - List
router.get(
  "/",
  requirePermission("payment_reminders:view"),
  validate({ query: listQuery }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentReminderService } = await import("../services/payment-reminder-service");
      const result = await paymentReminderService.list(req.context!.tenantId!, req.query as any);
      res.json(result);
    } catch (error) { next(error); }
  }
);

// GET /stats - Dashboard stats
router.get(
  "/stats",
  requirePermission("payment_reminders:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentReminderService } = await import("../services/payment-reminder-service");
      const stats = await paymentReminderService.getDashboardStats(req.context!.tenantId!);
      res.json(stats);
    } catch (error) { next(error); }
  }
);

// GET /upcoming - Upcoming reminders
router.get(
  "/upcoming",
  requirePermission("payment_reminders:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentReminderService } = await import("../services/payment-reminder-service");
      const days = parseInt(req.query.days as string) || 7;
      const items = await paymentReminderService.getUpcoming(req.context!.tenantId!, days);
      res.json(items);
    } catch (error) { next(error); }
  }
);

// GET /overdue - Overdue items
router.get(
  "/overdue",
  requirePermission("payment_reminders:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentReminderService } = await import("../services/payment-reminder-service");
      const items = await paymentReminderService.getOverdue(req.context!.tenantId!);
      res.json(items);
    } catch (error) { next(error); }
  }
);

// GET /:id - Single
router.get(
  "/:id",
  requirePermission("payment_reminders:view"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentReminderService } = await import("../services/payment-reminder-service");
      const item = await paymentReminderService.getById(req.context!.tenantId!, req.params.id);
      res.json(item);
    } catch (error) { next(error); }
  }
);

// POST / - Create
router.post(
  "/",
  requirePermission("payment_reminders:manage"),
  validate({ body: createBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentReminderService } = await import("../services/payment-reminder-service");
      const item = await paymentReminderService.create(req.context!.tenantId!, req.body);
      res.status(201).json(item);
    } catch (error) { next(error); }
  }
);

// POST /sync - Auto-sync from invoices/checks
router.post(
  "/sync",
  requirePermission("payment_reminders:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentReminderService } = await import("../services/payment-reminder-service");
      const result = await paymentReminderService.syncReminders(req.context!.tenantId!);
      res.json(result);
    } catch (error) { next(error); }
  }
);

// POST /process - Process and send notifications
router.post(
  "/process",
  requirePermission("payment_reminders:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentReminderService } = await import("../services/payment-reminder-service");
      const result = await paymentReminderService.processReminders();
      res.json(result);
    } catch (error) { next(error); }
  }
);

// PUT /:id - Update
router.put(
  "/:id",
  requirePermission("payment_reminders:manage"),
  validate({ params: idParamSchema, body: updateBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentReminderService } = await import("../services/payment-reminder-service");
      const item = await paymentReminderService.update(req.context!.tenantId!, req.params.id, req.body);
      res.json(item);
    } catch (error) { next(error); }
  }
);

// DELETE /:id - Delete
router.delete(
  "/:id",
  requirePermission("payment_reminders:manage"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentReminderService } = await import("../services/payment-reminder-service");
      await paymentReminderService.delete(req.context!.tenantId!, req.params.id);
      res.json({ message: "Hatırlatma silindi." });
    } catch (error) { next(error); }
  }
);

// PATCH /:id/paid - Mark as paid
router.patch(
  "/:id/paid",
  requirePermission("payment_reminders:manage"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentReminderService } = await import("../services/payment-reminder-service");
      const item = await paymentReminderService.markAsPaid(req.context!.tenantId!, req.params.id);
      res.json(item);
    } catch (error) { next(error); }
  }
);

export default router;
