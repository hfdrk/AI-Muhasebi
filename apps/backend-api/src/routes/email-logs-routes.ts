import { Router, type Response, type NextFunction, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { emailLogService } from "../services/email-log-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// Only TenantOwner and Accountant can view email logs
router.use(requirePermission("settings:read"));

// GET /api/v1/email-logs - List email logs with filters
router.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.context?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: { message: "Kiracı bilgisi bulunamadı." } });
    }

    const querySchema = z.object({
      status: z.enum(["sent", "delivered", "bounced", "failed"]).optional(),
      dateFrom: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
      dateTo: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
      limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
      offset: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
    });

    const filters = querySchema.parse(req.query);
    const result = await emailLogService.getEmailLogs(tenantId, filters);

    res.json({
      data: result.data,
      meta: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: { message: "Geçersiz sorgu parametreleri." } });
    } else {
      next(error);
    }
  }
});

// GET /api/v1/email-logs/analytics - Get email analytics
router.get("/analytics", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.context?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: { message: "Kiracı bilgisi bulunamadı." } });
    }

    const querySchema = z.object({
      dateFrom: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
      dateTo: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
    });

    const filters = querySchema.parse(req.query);
    const analytics = await emailLogService.getEmailAnalytics(
      tenantId,
      filters.dateFrom,
      filters.dateTo
    );

    res.json({ data: analytics });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: { message: "Geçersiz sorgu parametreleri." } });
    } else {
      next(error);
    }
  }
});

// GET /api/v1/email-logs/:id - Get single email log
router.get("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.context?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: { message: "Kiracı bilgisi bulunamadı." } });
    }

    const emailLogId = req.params.id;
    const emailLog = await emailLogService.getEmailLog(emailLogId, tenantId);

    if (!emailLog) {
      return res.status(404).json({ error: { message: "E-posta logu bulunamadı." } });
    }

    res.json({ data: emailLog });
  } catch (error: any) {
    next(error);
  }
});

export default router;
