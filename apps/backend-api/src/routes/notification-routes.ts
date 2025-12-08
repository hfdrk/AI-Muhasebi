import { Router } from "express";
import { z } from "zod";
import { notificationService } from "../services/notification-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import type { AuthenticatedRequest, Response } from "../types/request-context";
import { ValidationError } from "@repo/shared-utils";

const router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/v1/notifications
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.context!.tenantId!;
    const userId = req.context!.user!.id;

    // Parse query parameters
    const querySchema = z.object({
      is_read: z.string().optional().transform((val) => val === "true" ? true : val === "false" ? false : undefined),
      type: z.enum(["RISK_ALERT", "SCHEDULED_REPORT", "INTEGRATION_SYNC", "SYSTEM"]).optional(),
      limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
      offset: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
    });

    const query = querySchema.parse(req.query);

    const result = await notificationService.listNotifications(tenantId, userId, {
      is_read: query.is_read,
      type: query.type,
      limit: query.limit,
      offset: query.offset,
    });

    res.json({
      data: result.data,
      meta: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error: any) {
    console.error("Error listing notifications:", error);
    if (error instanceof z.ZodError) {
      const statusCode = 400;
      const message = "Geçersiz sorgu parametreleri.";
      res.status(statusCode).json({ error: { message } });
    } else {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Bildirimler alınırken bir hata oluştu.";
      res.status(statusCode).json({ error: { message } });
    }
  }
});

// POST /api/v1/notifications/read-all (must come before /:id/read)
router.post("/read-all", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.context!.tenantId!;
    const userId = req.context!.user!.id;

    const result = await notificationService.markAllAsRead(tenantId, userId);

    res.json({ data: result });
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error);
    const statusCode = error.statusCode || 500;
    const message = error.message || "Bildirimler okundu olarak işaretlenirken bir hata oluştu.";
    res.status(statusCode).json({ error: { message } });
  }
});

// POST /api/v1/notifications/:id/read
router.post("/:id/read", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.context!.tenantId!;
    const userId = req.context!.user!.id;
    const notificationId = req.params.id;

    const notification = await notificationService.markAsRead(tenantId, userId, notificationId);

    res.json({ data: notification });
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    const statusCode = error.statusCode || 500;
    const message = error.message || "Bildirim okundu olarak işaretlenirken bir hata oluştu.";
    res.status(statusCode).json({ error: { message } });
  }
});

export default router;

