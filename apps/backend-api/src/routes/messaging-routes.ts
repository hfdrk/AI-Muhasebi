import { Router, type Response, type NextFunction, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { messagingService } from "../services/messaging-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// POST /api/v1/messaging/threads - Create a new thread
router.post("/threads", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.context!.tenantId!;
    const userId = req.context!.user!.id;

    const bodySchema = z.object({
      clientCompanyId: z.string().optional().nullable(),
      subject: z.string().optional().nullable(),
      participantUserIds: z.array(z.string()).min(1),
    });

    const body = bodySchema.parse(req.body);

    // Include current user in participants if not already included
    const participantUserIds = body.participantUserIds.includes(userId)
      ? body.participantUserIds
      : [...body.participantUserIds, userId];

    const thread = await messagingService.createThread({
      tenantId,
      clientCompanyId: body.clientCompanyId || null,
      subject: body.subject || null,
      participantUserIds,
    });

    res.status(201).json({ data: thread });
  } catch (error: any) {
    console.error("Error creating message thread:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: { message: "Geçersiz istek verisi." } });
    } else {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Mesaj konuşması oluşturulurken bir hata oluştu.";
      res.status(statusCode).json({ error: { message } });
    }
  }
});

// GET /api/v1/messaging/threads - List threads
router.get("/threads", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.context!.tenantId!;
    const userId = req.context!.user!.id;

    const querySchema = z.object({
      clientCompanyId: z.string().optional(),
      limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
      offset: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
    });

    const query = querySchema.parse(req.query);

    const result = await messagingService.listThreads(tenantId, userId, {
      clientCompanyId: query.clientCompanyId,
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
    console.error("Error listing message threads:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: { message: "Geçersiz sorgu parametreleri." } });
    } else {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Mesaj konuşmaları alınırken bir hata oluştu.";
      res.status(statusCode).json({ error: { message } });
    }
  }
});

// GET /api/v1/messaging/threads/:id - Get thread with messages
router.get("/threads/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.context!.tenantId!;
    const userId = req.context!.user!.id;
    const threadId = req.params.id;

    const thread = await messagingService.getThread(tenantId, threadId, userId);

    res.json({ data: thread });
  } catch (error: any) {
    next(error); // Let error handler middleware handle NotFoundError properly
  }
});

// POST /api/v1/messaging/threads/:id/messages - Send a message
router.post("/threads/:id/messages", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.context!.user!.id;
    const threadId = req.params.id;

    const bodySchema = z.object({
      content: z.string().min(1, "Mesaj içeriği boş olamaz"),
    });

    const body = bodySchema.parse(req.body);

    const message = await messagingService.sendMessage({
      threadId,
      senderId: userId,
      content: body.content,
    });

    res.status(201).json({ data: message });
  } catch (error: any) {
    console.error("Error sending message:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: { message: "Geçersiz istek verisi." } });
    } else {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Mesaj gönderilirken bir hata oluştu.";
      res.status(statusCode).json({ error: { message } });
    }
  }
});

// POST /api/v1/messaging/threads/:id/read - Mark thread as read
router.post("/threads/:id/read", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.context!.user!.id;
    const threadId = req.params.id;

    await messagingService.markAsRead(threadId, userId);

    res.json({ data: { success: true } });
  } catch (error: any) {
    next(error); // Let error handler middleware handle NotFoundError properly
  }
});

export default router;


