import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import type { Response } from "express";
import { documentAIService } from "../services/document-ai-service";
import { documentService } from "../services/document-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/v1/documents/search-by-risk
// IMPORTANT: This route must be defined BEFORE /:id/ai-analysis to avoid route conflicts
router.get(
  "/search-by-risk",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    const schema = z.object({
      hasRiskFlags: z
        .string()
        .optional()
        .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
      riskFlagCode: z.string().optional(),
      riskSeverity: z.enum(["low", "medium", "high"]).optional(),
      minRiskScore: z
        .string()
        .optional()
        .transform((val) => (val ? parseFloat(val) : undefined)),
      maxRiskScore: z
        .string()
        .optional()
        .transform((val) => (val ? parseFloat(val) : undefined)),
      clientCompanyId: z.string().optional(),
      page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
      pageSize: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
    });

    try {
      const filters = schema.parse(req.query);

      console.log(`[DocumentAI Routes] /search-by-risk called with filters:`, filters);

      const result = await documentService.listDocuments(req.context!.tenantId!, {
        clientCompanyId: filters.clientCompanyId,
        hasRiskFlags: filters.hasRiskFlags,
        riskFlagCode: filters.riskFlagCode,
        riskSeverity: filters.riskSeverity,
        minRiskScore: filters.minRiskScore,
        maxRiskScore: filters.maxRiskScore,
        page: filters.page,
        pageSize: filters.pageSize,
      });

      console.log(`[DocumentAI Routes] /search-by-risk result:`, {
        documentsCount: result.data.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      });

      res.json({ data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            message: error.issues[0].message,
          },
        });
      }
      throw error;
    }
  }
);

// GET /api/v1/documents/:id/ai-analysis
router.get(
  "/:id/ai-analysis",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const analysis = await documentAIService.getDocumentAIAnalysis(
        req.context!.tenantId!,
        req.params.id
      );

      res.json({ data: analysis });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            message: error.issues[0].message,
          },
        });
      }
      // Handle NotFoundError specifically
      if (error.name === "NotFoundError" || error.message?.includes("bulunamadı")) {
        return res.status(404).json({
          error: {
            message: error.message || "Belge bulunamadı.",
          },
        });
      }
      // Log unexpected errors
      console.error("Error fetching AI analysis:", error);
      throw error;
    }
  }
);

export default router;

