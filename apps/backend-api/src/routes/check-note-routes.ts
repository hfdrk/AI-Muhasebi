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
  type: z.enum(["CEK", "SENET"]).optional(),
  direction: z.enum(["ALACAK", "BORC"]).optional(),
  status: z.string().optional(),
  clientCompanyId: z.string().optional(),
  dueDateStart: z.string().optional(),
  dueDateEnd: z.string().optional(),
});

const createBody = z.object({
  clientCompanyId: z.string().optional(),
  type: z.enum(["CEK", "SENET"], { message: "Tür CEK veya SENET olmalı" }),
  direction: z.enum(["ALACAK", "BORC"], { message: "Yön ALACAK veya BORC olmalı" }),
  documentNumber: z.string().min(1, "Belge numarası gerekli"),
  issuer: z.string().optional(),
  bankName: z.string().optional(),
  branchName: z.string().optional(),
  amount: z.number().positive("Tutar pozitif olmalı"),
  currency: z.string().length(3).optional(),
  issueDate: z.string().min(1, "Düzenleme tarihi gerekli"),
  dueDate: z.string().min(1, "Vade tarihi gerekli"),
  notes: z.string().optional(),
});

const updateBody = createBody.partial();

const statusBody = z.object({
  status: z.string().min(1, "Durum gerekli"),
  endorsedTo: z.string().optional(),
  collectedDate: z.string().optional(),
  bouncedDate: z.string().optional(),
});

const endorseBody = z.object({
  endorsedTo: z.string().min(1, "Ciro edilen kişi/kurum gerekli"),
});

// ─── Routes ──────────────────────────────────────────────────────────

// GET / - List
router.get(
  "/",
  requirePermission("check_notes:view"),
  validate({ query: listQuery }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { checkNoteService } = await import("../services/check-note-service");
      const result = await checkNoteService.list(req.context!.tenantId!, req.query as any);
      res.json(result);
    } catch (error) { next(error); }
  }
);

// GET /stats - Dashboard stats
router.get(
  "/stats",
  requirePermission("check_notes:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { checkNoteService } = await import("../services/check-note-service");
      const stats = await checkNoteService.getDashboardStats(req.context!.tenantId!);
      res.json(stats);
    } catch (error) { next(error); }
  }
);

// GET /upcoming - Upcoming due
router.get(
  "/upcoming",
  requirePermission("check_notes:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { checkNoteService } = await import("../services/check-note-service");
      const days = parseInt(req.query.days as string) || 7;
      const items = await checkNoteService.getUpcomingDue(req.context!.tenantId!, days);
      res.json(items);
    } catch (error) { next(error); }
  }
);

// GET /overdue - Overdue items
router.get(
  "/overdue",
  requirePermission("check_notes:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { checkNoteService } = await import("../services/check-note-service");
      const items = await checkNoteService.getOverdue(req.context!.tenantId!);
      res.json(items);
    } catch (error) { next(error); }
  }
);

// GET /:id - Single
router.get(
  "/:id",
  requirePermission("check_notes:view"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { checkNoteService } = await import("../services/check-note-service");
      const item = await checkNoteService.getById(req.context!.tenantId!, req.params.id);
      res.json(item);
    } catch (error) { next(error); }
  }
);

// POST / - Create
router.post(
  "/",
  requirePermission("check_notes:manage"),
  validate({ body: createBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { checkNoteService } = await import("../services/check-note-service");
      const item = await checkNoteService.create(req.context!.tenantId!, req.body);
      res.status(201).json(item);
    } catch (error) { next(error); }
  }
);

// PUT /:id - Update
router.put(
  "/:id",
  requirePermission("check_notes:manage"),
  validate({ params: idParamSchema, body: updateBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { checkNoteService } = await import("../services/check-note-service");
      const item = await checkNoteService.update(req.context!.tenantId!, req.params.id, req.body);
      res.json(item);
    } catch (error) { next(error); }
  }
);

// DELETE /:id - Delete
router.delete(
  "/:id",
  requirePermission("check_notes:manage"),
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { checkNoteService } = await import("../services/check-note-service");
      await checkNoteService.delete(req.context!.tenantId!, req.params.id);
      res.json({ message: "Çek/senet silindi." });
    } catch (error) { next(error); }
  }
);

// PATCH /:id/status - Update status
router.patch(
  "/:id/status",
  requirePermission("check_notes:manage"),
  validate({ params: idParamSchema, body: statusBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { checkNoteService } = await import("../services/check-note-service");
      const item = await checkNoteService.updateStatus(
        req.context!.tenantId!, req.params.id, req.body.status, req.body
      );
      res.json(item);
    } catch (error) { next(error); }
  }
);

// PATCH /:id/endorse - Endorse
router.patch(
  "/:id/endorse",
  requirePermission("check_notes:manage"),
  validate({ params: idParamSchema, body: endorseBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { checkNoteService } = await import("../services/check-note-service");
      const item = await checkNoteService.endorse(req.context!.tenantId!, req.params.id, req.body.endorsedTo);
      res.json(item);
    } catch (error) { next(error); }
  }
);

export default router;
