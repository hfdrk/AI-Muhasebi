import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { aiAssistantService } from "../services/ai-assistant-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

const chatSchema = z.object({
  question: z.string().min(1, "Soru gerekli."),
  type: z.enum(["GENEL", "RAPOR", "RISK"]).optional(),
  dateRange: z
    .object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    })
    .optional(),
  companyId: z.string().optional(),
});

const dailyRiskSummarySchema = z.object({
  date: z.string().datetime().optional(),
});

// POST /api/v1/ai/chat
router.post(
  "/chat",
  requirePermission("documents:read"), // All roles can use AI (read-only)
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = chatSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;
      const userId = req.context!.user.id;

      const answer = await aiAssistantService.generateChatResponse({
        tenantId,
        userId,
        question: body.question,
        type: body.type,
        contextFilters: {
          type: body.type,
          dateRange: body.dateRange
            ? {
                from: new Date(body.dateRange.from),
                to: new Date(body.dateRange.to),
              }
            : undefined,
          companyId: body.companyId,
        },
      });

      res.json({ data: { answer } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new Error(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

// POST /api/v1/ai/summaries/daily-risk
router.post(
  "/summaries/daily-risk",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = dailyRiskSummarySchema.parse(req.body);
      const tenantId = req.context!.tenantId!;
      const userId = req.context!.user.id;

      const date = body.date ? new Date(body.date) : new Date();

      const summary = await aiAssistantService.generateDailyRiskSummary({
        tenantId,
        userId,
        date,
      });

      res.json({
        data: {
          summary,
          date: date.toISOString(),
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

// POST /api/v1/ai/summaries/portfolio
router.post(
  "/summaries/portfolio",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.context!.tenantId!;
      const userId = req.context!.user.id;

      const summary = await aiAssistantService.generatePortfolioOverview({
        tenantId,
        userId,
      });

      res.json({
        data: {
          summary,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;




