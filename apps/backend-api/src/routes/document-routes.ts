import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { documentService } from "../services/document-service";
import { documentJobService } from "../services/document-job-service";
import { auditService } from "../services/audit-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission, requireRole } from "../middleware/rbac-middleware";
import { TENANT_ROLES } from "@repo/core-domain";
import { getStorageConfig } from "@repo/config";
import type { AuthenticatedRequest, Response } from "../types/request-context";

const router = Router();

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

// POST /api/v1/documents/upload
router.post(
  "/upload",
  requirePermission("documents:create"),
  upload.single("file"),
  async (req: AuthenticatedRequest, res: Response) => {
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
        return res.status(400).json({
          error: {
            message: error.errors[0].message,
          },
        });
      }
      throw error;
    }
  }
);

// GET /api/v1/documents
router.get(
  "/",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    const schema = z.object({
      clientCompanyId: z.string().optional(),
      type: z.enum(["INVOICE", "BANK_STATEMENT", "RECEIPT", "OTHER"]).optional(),
      status: z.enum(["UPLOADED", "PROCESSING", "PROCESSED", "FAILED"]).optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
      pageSize: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
    });

    const filters = schema.parse(req.query);

    const result = await documentService.listDocuments(req.context!.tenantId!, {
      clientCompanyId: filters.clientCompanyId,
      type: filters.type,
      status: filters.status,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
      page: filters.page,
      pageSize: filters.pageSize,
    });

    res.json({ data: result });
  }
);

// GET /api/v1/documents/:id
router.get(
  "/:id",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    const document = await documentService.getDocumentById(
      req.context!.tenantId!,
      req.params.id
    );

    res.json({ data: document });
  }
);

// GET /api/v1/documents/:id/download
router.get(
  "/:id/download",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response) => {
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
          res.status(500).json({ error: { message: "Dosya okunurken bir hata oluştu." } });
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
        res.status(error.statusCode || 500).json({
          error: {
            message: error.message || "Dosya indirilemedi.",
          },
        });
      }
    }
  }
);

// POST /api/v1/documents/:id/retry
router.post(
  "/:id/retry",
  requirePermission("documents:create"),
  async (req: AuthenticatedRequest, res: Response) => {
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
      throw error;
    }
  }
);

// DELETE /api/v1/documents/:id
router.delete(
  "/:id",
  requireRole(TENANT_ROLES.TenantOwner, TENANT_ROLES.Accountant),
  async (req: AuthenticatedRequest, res: Response) => {
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

