import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import { z } from "zod";
import type { NextFunction, Response } from "express";
import { ValidationError } from "@repo/shared-utils";
import { prisma } from "../lib/prisma";
import { documentService } from "../services/document-service";
import { documentJobService } from "../services/document-job-service";
import { batchUploadService } from "../services/batch-upload-service";
import { batchAIAnalysisService } from "../services/batch-ai-analysis-service";
import { auditService } from "../services/audit-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission, requireRole } from "../middleware/rbac-middleware";
import { TENANT_ROLES } from "@repo/core-domain";
import { getStorageConfig } from "@repo/config";
import type { AuthenticatedRequest } from "../types/request-context";
import { enforceCustomerIsolation } from "../utils/customer-isolation";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Configure multer for file uploads
const storageConfig = getStorageConfig();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: storageConfig.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    if (storageConfig.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Bu dosya türüne izin verilmiyor: ${file.mimetype}`));
    }
  },
});

// Configure multer for ZIP file uploads (larger size limit)
const uploadZip = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: storageConfig.maxZipFileSize,
  },
  fileFilter: (req, file, cb) => {
    if (storageConfig.allowedZipMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`ZIP dosyası bekleniyor. İzin verilen türler: ${storageConfig.allowedZipMimeTypes.join(", ")}`));
    }
  },
});

// POST /api/v1/documents/upload
router.post(
  "/upload",
  requirePermission("documents:create"),
  upload.single("file"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: {
            message: "Lütfen bir dosya seçin.",
          },
        });
      }

      const schema = z.object({
        clientCompanyId: z.string().min(1, "Müşteri şirketi gerekli."),
        type: z.enum(["INVOICE", "BANK_STATEMENT", "RECEIPT", "OTHER"]).optional(),
        relatedInvoiceId: z.string().optional().nullable(),
        relatedTransactionId: z.string().optional().nullable(),
      });

      const body = schema.parse(req.body);

      const document = await documentService.uploadDocument(
        req.context!.tenantId!,
        req.context!.user.id,
        {
          file: {
            buffer: req.file.buffer,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          },
          clientCompanyId: body.clientCompanyId,
          type: body.type,
          relatedInvoiceId: body.relatedInvoiceId,
          relatedTransactionId: body.relatedTransactionId,
        }
      );

      // Audit log
      await auditService.log({
        action: "DOCUMENT_UPLOADED",
        tenantId: req.context!.tenantId!,
        userId: req.context!.user.id,
        metadata: {
          documentId: document.id,
          clientCompanyId: document.clientCompanyId,
          fileName: document.originalFileName,
          fileSize: document.fileSizeBytes,
        },
      });

      res.status(201).json({ data: document });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

// POST /api/v1/documents/upload-batch
router.post(
  "/upload-batch",
  requirePermission("documents:create"),
  uploadZip.single("zipFile"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: {
            message: "Lütfen bir ZIP dosyası seçin.",
          },
        });
      }

      const schema = z.object({
        clientCompanyId: z.string().min(1, "Müşteri şirketi gerekli."),
        type: z.enum(["INVOICE", "BANK_STATEMENT", "RECEIPT", "OTHER"]).optional(),
        relatedInvoiceId: z.string().optional().nullable(),
        relatedTransactionId: z.string().optional().nullable(),
      });

      const body = schema.parse(req.body);

      const result = await batchUploadService.uploadZipContents(
        req.context!.tenantId!,
        req.context!.user.id,
        req.file.buffer,
        req.file.originalname,
        {
          clientCompanyId: body.clientCompanyId,
          type: body.type,
          relatedInvoiceId: body.relatedInvoiceId,
          relatedTransactionId: body.relatedTransactionId,
        }
      );

      // Audit log
      await auditService.log({
        action: "DOCUMENT_BATCH_UPLOADED",
        tenantId: req.context!.tenantId!,
        userId: req.context!.user.id,
        metadata: {
          batchId: result.batchId,
          totalFiles: result.totalFiles,
          successfulUploads: result.successfulUploads,
          failedUploads: result.failedUploads,
          zipFileName: req.file.originalname,
        },
      });

      res.status(201).json({ data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

// GET /api/v1/documents/batch/:batchId/status
router.get(
  "/batch/:batchId/status",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = await batchUploadService.getBatchStatus(
        req.context!.tenantId!,
        req.params.batchId
      );

      res.json({ data: status });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/documents/batch/analyze
router.post(
  "/batch/analyze",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        clientCompanyId: z.string().min(1, "Müşteri şirketi gerekli."),
        documentIds: z.array(z.string()).min(1, "En az bir belge ID'si gerekli."),
      });

      const body = schema.parse(req.body);

      const result = await batchAIAnalysisService.analyzeBatchContents(
        req.context!.tenantId!,
        body.clientCompanyId,
        body.documentIds
      );

      // Audit log
      await auditService.log({
        action: "DOCUMENT_BATCH_ANALYZED",
        tenantId: req.context!.tenantId!,
        userId: req.context!.user.id,
        metadata: {
          analysisId: result.analysisId,
          documentCount: result.documentCount,
          riskScore: result.riskScore,
        },
      });

      res.json({ data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

// GET /api/v1/documents/search-by-risk
// IMPORTANT: This route must be defined BEFORE /:id to avoid route conflicts
router.get(
  "/search-by-risk",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
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

      const filters = schema.parse(req.query);

      console.log(`[Document Routes] /search-by-risk called with filters:`, filters);

      if (!req.context || !req.context.tenantId) {
        return res.status(401).json({
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "Yetkilendirme gerekli.",
          },
        });
      }

      // Enforce customer isolation for ReadOnly users
      const isolationFilter = await enforceCustomerIsolation(req.context, {
        clientCompanyId: filters.clientCompanyId || undefined,
      });

      const result = await documentService.listDocuments(req.context.tenantId, {
        clientCompanyId: isolationFilter.clientCompanyId || filters.clientCompanyId,
        hasRiskFlags: filters.hasRiskFlags,
        riskFlagCode: filters.riskFlagCode,
        riskSeverity: filters.riskSeverity,
        minRiskScore: filters.minRiskScore,
        maxRiskScore: filters.maxRiskScore,
        page: filters.page,
        pageSize: filters.pageSize,
      });

      console.log(`[Document Routes] /search-by-risk result:`, {
        documentsCount: result.data.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      });

      res.json({ data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

// GET /api/v1/documents
router.get(
  "/",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        clientCompanyId: z.string().optional(),
        type: z.enum(["INVOICE", "BANK_STATEMENT", "RECEIPT", "OTHER"]).optional(),
        status: z.enum(["UPLOADED", "PROCESSING", "PROCESSED", "FAILED"]).optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
        page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
        pageSize: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
      });

      const parsedFilters = schema.parse(req.query);

      if (!req.context || !req.context.tenantId) {
        return res.status(401).json({
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "Yetkilendirme gerekli.",
          },
        });
      }

      // Enforce customer isolation for ReadOnly users
      const isolationFilter = await enforceCustomerIsolation(req.context, {
        clientCompanyId: parsedFilters.clientCompanyId || undefined,
      });

      const result = await documentService.listDocuments(req.context.tenantId, {
        clientCompanyId: isolationFilter.clientCompanyId || parsedFilters.clientCompanyId,
        type: parsedFilters.type,
        status: parsedFilters.status,
        dateFrom: parsedFilters.dateFrom ? new Date(parsedFilters.dateFrom) : undefined,
        dateTo: parsedFilters.dateTo ? new Date(parsedFilters.dateTo) : undefined,
        page: parsedFilters.page,
        pageSize: parsedFilters.pageSize,
      });

      res.json({ data: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

// GET /api/v1/documents/:id
router.get(
  "/:id",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const document = await documentService.getDocumentById(
        req.context!.tenantId!,
        req.params.id
      );

      res.json({ data: document });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/documents/:id/download
router.get(
  "/:id/download",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const document = await documentService.getDocumentById(
        req.context!.tenantId!,
        req.params.id
      );

      const stream = await documentService.getDocumentStream(
        req.context!.tenantId!,
        req.params.id
      );

      // Set headers
      res.setHeader("Content-Type", document.mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(document.originalFileName)}"`
      );

      // Handle stream errors
      stream.on("error", (error) => {
        console.error("Stream error:", error);
        if (!res.headersSent) {
          next(error);
        }
      });

      // Stream file
      stream.pipe(res);

      // Audit log (don't await to avoid blocking the stream)
      auditService
        .log({
          action: "DOCUMENT_DOWNLOADED",
          tenantId: req.context!.tenantId!,
          userId: req.context!.user.id,
          metadata: {
            documentId: document.id,
            fileName: document.originalFileName,
          },
        })
        .catch((error) => {
          console.error("Error logging document download:", error);
        });
    } catch (error: any) {
      console.error("Error downloading document:", error);
      if (!res.headersSent) {
        next(error);
      }
    }
  }
);

// POST /api/v1/documents/:id/retry
router.post(
  "/:id/retry",
  requirePermission("documents:create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const document = await documentService.getDocumentById(
        req.context!.tenantId!,
        req.params.id
      );

      if (document.status !== "FAILED") {
        return res.status(400).json({
          error: {
            message: "Sadece başarısız belgeler yeniden işlenebilir.",
          },
        });
      }

      // Create a new processing job
      await documentJobService.createProcessingJob(req.context!.tenantId!, req.params.id);

      // Update document status back to UPLOADED
      await prisma.document.update({
        where: { id: req.params.id },
        data: {
          status: "UPLOADED",
          processingErrorMessage: null,
        },
      });

      // Audit log
      await auditService.log({
        action: "DOCUMENT_RETRY",
        tenantId: req.context!.tenantId!,
        userId: req.context!.user.id,
        metadata: {
          documentId: req.params.id,
        },
      });

      res.json({ data: { message: "Belge yeniden işleme için kuyruğa eklendi." } });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: { message: error.message } });
      }
      next(error);
    }
  }
);

// DELETE /api/v1/documents/:id
router.delete(
  "/:id",
  requireRole(TENANT_ROLES.TENANT_OWNER), // Only Accountant role can update
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    await documentService.deleteDocument(
      req.context!.tenantId!,
      req.params.id,
      req.context!.user.id
    );

    // Audit log
    await auditService.log({
      action: "DOCUMENT_DELETED",
      tenantId: req.context!.tenantId!,
      userId: req.context!.user.id,
      metadata: {
        documentId: req.params.id,
      },
    });

    res.json({ data: { message: "Belge silindi." } });
  }
);

export default router;

