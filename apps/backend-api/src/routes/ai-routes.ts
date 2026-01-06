import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { aiAssistantService } from "../services/ai-assistant-service";
import { ragService } from "../services/rag-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: Router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

const chatSchema = z.object({
  question: z.string().min(1, "Soru gerekli.").max(5000, "Soru en fazla 5000 karakter olabilir."),
  type: z.enum(["GENEL", "RAPOR", "RISK"]).optional(),
  dateRange: z
    .object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    })
    .optional(),
  companyId: z.string().max(100, "Şirket ID en fazla 100 karakter olabilir.").optional(),
});

const dailyRiskSummarySchema = z.object({
  date: z.string().datetime().optional(),
});

const ragSearchSchema = z.object({
  query: z.string().min(1, "Arama sorgusu gerekli.").max(1000, "Arama sorgusu en fazla 1000 karakter olabilir."),
  topK: z.number().int().min(1).max(50).optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
  clientCompanyId: z.string().max(100, "Müşteri şirketi ID en fazla 100 karakter olabilir.").optional(),
  documentType: z.string().max(100, "Belge tipi en fazla 100 karakter olabilir.").optional(),
  dateRange: z
    .object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    })
    .optional(),
});

// Enhanced chat schema with conversation history support
const enhancedChatSchema = z.object({
  question: z.string().min(1, "Soru gerekli.").max(5000, "Soru en fazla 5000 karakter olabilir."),
  type: z.enum(["GENEL", "RAPOR", "RISK"]).optional(),
  dateRange: z
    .object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    })
    .optional(),
  companyId: z.string().max(100, "Şirket ID en fazla 100 karakter olabilir.").optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(5000),
      })
    )
    .max(20, "Konuşma geçmişi en fazla 20 mesaj içerebilir.")
    .optional(),
  useHybridSearch: z.boolean().default(true).optional(),
  useReranking: z.boolean().default(false).optional(),
});

// Hybrid search schema for advanced RAG queries
const hybridSearchSchema = z.object({
  query: z.string().min(1, "Arama sorgusu gerekli.").max(1000, "Arama sorgusu en fazla 1000 karakter olabilir."),
  topK: z.number().int().min(1).max(50).default(5).optional(),
  minSimilarity: z.number().min(0).max(1).default(0.7).optional(),
  clientCompanyId: z.string().max(100, "Müşteri şirketi ID en fazla 100 karakter olabilir.").optional(),
  documentType: z.string().max(100, "Belge tipi en fazla 100 karakter olabilir.").optional(),
  dateRange: z
    .object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    })
    .optional(),
  useReranking: z.boolean().default(false).optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(5000),
      })
    )
    .max(10)
    .optional(),
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

// POST /api/v1/ai/rag/search
router.post(
  "/rag/search",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = ragSearchSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;

      const context = await ragService.retrieveContext(body.query, tenantId, {
        topK: body.topK,
        minSimilarity: body.minSimilarity,
        includeMetadata: true,
        filters: {
          clientCompanyId: body.clientCompanyId,
          documentType: body.documentType,
          dateRange: body.dateRange
            ? {
                from: new Date(body.dateRange.from),
                to: new Date(body.dateRange.to),
              }
            : undefined,
        },
      });

      res.json({
        data: {
          documents: context.documents,
          totalResults: context.totalResults,
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

// POST /api/v1/ai/chat/enhanced - Enhanced chat with multi-turn conversation, hybrid search, and re-ranking
router.post(
  "/chat/enhanced",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = enhancedChatSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;
      const userId = req.context!.user.id;

      const result = await aiAssistantService.generateEnhancedChatResponse({
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
        conversationHistory: body.conversationHistory,
        useHybridSearch: body.useHybridSearch,
        useReranking: body.useReranking,
      });

      res.json({
        data: {
          answer: result.answer,
          sourcesUsed: result.sourcesUsed,
          searchMetrics: result.searchMetrics,
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

// POST /api/v1/ai/rag/hybrid-search - Advanced hybrid (semantic + keyword) search
router.post(
  "/rag/hybrid-search",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = hybridSearchSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;

      const context = await ragService.hybridSearch(body.query, tenantId, {
        topK: body.topK,
        minSimilarity: body.minSimilarity,
        includeMetadata: true,
        filters: {
          clientCompanyId: body.clientCompanyId,
          documentType: body.documentType,
          dateRange: body.dateRange
            ? {
                from: new Date(body.dateRange.from),
                to: new Date(body.dateRange.to),
              }
            : undefined,
        },
      });

      res.json({
        data: {
          documents: context.documents,
          totalResults: context.totalResults,
          hybridResults: context.hybridResults,
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

// POST /api/v1/ai/embeddings/generate (Admin only - for testing/manual embedding generation)
router.post(
  "/embeddings/generate",
  requirePermission("documents:create" as any), // Admin only
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId, text } = z
        .object({
          documentId: z.string().min(1),
          text: z.string().min(1),
        })
        .parse(req.body);

      const tenantId = req.context!.tenantId!;
      const { embeddingService } = await import("../services/embedding-service");

      await embeddingService.generateAndStoreDocumentEmbedding(tenantId, documentId, text);

      res.json({
        data: {
          success: true,
          documentId,
          model: embeddingService.getModel(),
          dimensions: embeddingService.getDimensions(),
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

const batchRegenerateSchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1).max(100),
  force: z.boolean().default(false).optional(), // Force regeneration even if embedding exists
});

// POST /api/v1/ai/embeddings/batch-regenerate (Admin only - batch regeneration)
router.post(
  "/embeddings/batch-regenerate",
  requirePermission("documents:create" as any), // Admin only
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = batchRegenerateSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;
      const { embeddingService } = await import("../services/embedding-service");
      const { prisma } = await import("../lib/prisma");
      const { logger } = await import("@repo/shared-utils");

      const results = {
        successful: [] as string[],
        failed: [] as Array<{ documentId: string; error: string }>,
        skipped: [] as string[],
      };

      // Process documents in parallel batches (max 10 at a time)
      const batchSize = 10;
      for (let i = 0; i < body.documentIds.length; i += batchSize) {
        const batch = body.documentIds.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (documentId) => {
            try {
              // Verify document belongs to tenant
              const document = await prisma.document.findFirst({
                where: {
                  id: documentId,
                  tenantId,
                  isDeleted: false,
                },
                include: {
                  ocrResult: true,
                },
              });

              if (!document) {
                results.failed.push({
                  documentId,
                  error: "Document not found or doesn't belong to tenant",
                });
                return;
              }

              // Check if embedding exists and force flag
              if (!body.force) {
                const existingEmbedding = await embeddingService.getDocumentEmbedding(documentId);
                if (existingEmbedding) {
                  results.skipped.push(documentId);
                  return;
                }
              }

              // Get OCR text for embedding
              if (!document.ocrResult?.rawText) {
                results.failed.push({
                  documentId,
                  error: "No OCR text available for document",
                });
                return;
              }

              // Generate embedding text (OCR + parsed data if available)
              let embeddingText = document.ocrResult.rawText;
              if (document.parsedData) {
                const parsedData = document.parsedData as any;
                embeddingText += `\n\nType: ${parsedData.documentType || document.type}\nFields: ${JSON.stringify(parsedData.fields || {})}`;
              }

              // Generate and store embedding
              await embeddingService.generateAndStoreDocumentEmbedding(
                tenantId,
                documentId,
                embeddingText
              );

              results.successful.push(documentId);
            } catch (error: any) {
              logger.error("Failed to regenerate embedding for document", { tenantId }, {
                documentId,
                error: error.message,
              });
              results.failed.push({
                documentId,
                error: error.message || "Unknown error",
              });
            }
          })
        );
      }

      res.json({
        data: {
          total: body.documentIds.length,
          successful: results.successful.length,
          failed: results.failed.length,
          skipped: results.skipped.length,
          results,
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

export default router;







