import { Router, type Response, type Router as ExpressRouter } from "express";
import { eventStreamService } from "../services/event-stream-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/v1/events/stream - SSE endpoint for real-time events
router.get("/stream", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.context?.tenantId;
    const userId = req.context?.user?.id;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: { message: "Kiracı veya kullanıcı bilgisi bulunamadı." } });
    }

    // Add connection to event stream service
    const connectionId = eventStreamService.addConnection(userId, tenantId, res);

    // Keep connection alive
    req.on("close", () => {
      eventStreamService.removeConnection(connectionId);
    });
  } catch (error: any) {
    console.error("Error setting up event stream:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: { message: "Olay akışı kurulamadı." } });
    }
  }
});

export default router;


