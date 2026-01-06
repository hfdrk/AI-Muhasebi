import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { turkishTaxCalendarService, type TaxDeadlineType } from "../services/turkish-tax-calendar-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: Router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

const upcomingDeadlinesSchema = z.object({
  daysAhead: z.number().int().min(1).max(365).default(30).optional(),
  types: z.array(z.string()).optional(),
  clientCompanyId: z.string().optional(),
});

const markCompletedSchema = z.object({
  deadlineId: z.string().min(1, "Deadline ID gerekli"),
  filingReference: z.string().optional(),
  actualAmount: z.number().optional(),
  notes: z.string().max(1000).optional(),
});

const completionHistorySchema = z.object({
  type: z.string().optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  clientCompanyId: z.string().optional(),
});

// GET /api/v1/tax-calendar/deadlines - Get upcoming tax deadlines
router.get(
  "/deadlines",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = upcomingDeadlinesSchema.parse({
        daysAhead: req.query.daysAhead ? Number(req.query.daysAhead) : undefined,
        types: req.query.types ? String(req.query.types).split(",") : undefined,
        clientCompanyId: req.query.clientCompanyId as string | undefined,
      });

      const tenantId = req.context!.tenantId!;

      const deadlines = await turkishTaxCalendarService.getUpcomingDeadlines(tenantId, {
        daysAhead: query.daysAhead,
        types: query.types as TaxDeadlineType[] | undefined,
        clientCompanyId: query.clientCompanyId,
      });

      res.json({
        data: {
          deadlines,
          total: deadlines.length,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new Error(error.issues[0]?.message || "Geçersiz parametreler."));
      }
      next(error);
    }
  }
);

// GET /api/v1/tax-calendar/critical - Get critical deadlines (due soon or overdue)
router.get(
  "/critical",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.context!.tenantId!;

      const criticalDeadlines = await turkishTaxCalendarService.getCriticalDeadlines(tenantId);

      res.json({
        data: {
          deadlines: criticalDeadlines,
          total: criticalDeadlines.length,
          hasOverdue: criticalDeadlines.some(d => d.status === "overdue"),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/tax-calendar/summary - Get deadline summary for dashboard
router.get(
  "/summary",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.context!.tenantId!;

      const summary = await turkishTaxCalendarService.getDeadlineSummary(tenantId);

      res.json({
        data: summary,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

// POST /api/v1/tax-calendar/complete - Mark a deadline as completed
router.post(
  "/complete",
  requirePermission("documents:update"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = markCompletedSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;
      const userId = req.context!.user.id;

      await turkishTaxCalendarService.markDeadlineCompleted(tenantId, body.deadlineId, {
        completedBy: userId,
        filingReference: body.filingReference,
        actualAmount: body.actualAmount,
        notes: body.notes,
      });

      res.json({
        data: {
          success: true,
          message: "Vergi beyannamesi tamamlandı olarak işaretlendi.",
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new Error(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

// GET /api/v1/tax-calendar/history - Get completion history
router.get(
  "/history",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = completionHistorySchema.parse({
        type: req.query.type as string | undefined,
        year: req.query.year ? Number(req.query.year) : undefined,
        clientCompanyId: req.query.clientCompanyId as string | undefined,
      });

      const tenantId = req.context!.tenantId!;

      const history = await turkishTaxCalendarService.getCompletionHistory(tenantId, {
        type: query.type as TaxDeadlineType | undefined,
        year: query.year,
        clientCompanyId: query.clientCompanyId,
      });

      res.json({
        data: {
          history,
          total: history.length,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new Error(error.issues[0]?.message || "Geçersiz parametreler."));
      }
      next(error);
    }
  }
);

// GET /api/v1/tax-calendar/types - Get all tax deadline types (for filtering)
router.get(
  "/types",
  requirePermission("documents:read"),
  async (_req: AuthenticatedRequest, res: Response) => {
    const types = [
      { code: "KDV_1", name: "KDV Beyannamesi (Aylık)", frequency: "Aylık" },
      { code: "KDV_2", name: "KDV Beyannamesi (3 Aylık)", frequency: "3 Aylık" },
      { code: "MUHTASAR", name: "Muhtasar ve Prim Hizmet Beyannamesi", frequency: "Aylık" },
      { code: "GECICI_VERGI", name: "Geçici Vergi Beyannamesi", frequency: "3 Aylık" },
      { code: "KURUMLAR_VERGISI", name: "Kurumlar Vergisi Beyannamesi", frequency: "Yıllık" },
      { code: "GELIR_VERGISI", name: "Gelir Vergisi Beyannamesi", frequency: "Yıllık" },
      { code: "BA_BS", name: "Ba-Bs Formları", frequency: "Aylık" },
      { code: "SGK", name: "SGK Bildirgeleri", frequency: "Aylık" },
      { code: "DAMGA_VERGISI", name: "Damga Vergisi Beyannamesi", frequency: "Aylık" },
      { code: "MTV", name: "Motorlu Taşıtlar Vergisi", frequency: "6 Aylık" },
      { code: "EMLAK_VERGISI", name: "Emlak Vergisi", frequency: "6 Aylık" },
    ];

    res.json({
      data: { types },
    });
  }
);

export default router;
