import { Readable } from "stream";
import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import { getStorage, getStorageConfig } from "@repo/config";
import { validateFileSize, validateMimeType, sanitizeFileName } from "@repo/shared-utils";
import type {
  Document,
  CreateDocumentInput,
  DocumentType,
  DocumentStatus,
} from "@repo/core-domain";
import type { PaginatedResult } from "./client-company-service";
import { documentJobService } from "./document-job-service";

export interface ListDocumentsFilters {
  clientCompanyId?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  hasRiskFlags?: boolean;
  riskFlagCode?: string;
  riskSeverity?: "low" | "medium" | "high";
  minRiskScore?: number;
  maxRiskScore?: number;
  page?: number;
  pageSize?: number;
}

export interface UploadDocumentInput {
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
  clientCompanyId: string;
  type?: DocumentType;
  relatedInvoiceId?: string | null;
  relatedTransactionId?: string | null;
}

export class DocumentService {
  private storage = getStorage();
  private storageConfig = getStorageConfig();

  async uploadDocument(
    tenantId: string,
    userId: string,
    input: UploadDocumentInput
  ): Promise<Document> {
    // Validate file size
    validateFileSize(input.file.size, this.storageConfig.maxFileSize);

    // Validate MIME type
    validateMimeType(input.file.mimetype, this.storageConfig.allowedMimeTypes);

    // Verify client company belongs to tenant
    const clientCompany = await prisma.clientCompany.findFirst({
      where: {
        id: input.clientCompanyId,
        tenantId,
      },
    });

    if (!clientCompany) {
      throw new ValidationError("Müşteri şirketi bulunamadı veya bu kiracıya ait değil.");
    }

    // Verify related invoice if provided
    if (input.relatedInvoiceId) {
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: input.relatedInvoiceId,
          tenantId,
          clientCompanyId: input.clientCompanyId,
        },
      });

      if (!invoice) {
        throw new ValidationError("İlgili fatura bulunamadı veya bu şirkete ait değil.");
      }
    }

    // Verify related transaction if provided
    if (input.relatedTransactionId) {
      const transaction = await prisma.transaction.findFirst({
        where: {
          id: input.relatedTransactionId,
          tenantId,
          clientCompanyId: input.clientCompanyId,
        },
      });

      if (!transaction) {
        throw new ValidationError("İlgili mali hareket bulunamadı veya bu şirkete ait değil.");
      }
    }

    // Generate unique storage key
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const sanitizedFileName = sanitizeFileName(input.file.originalname);
    const storageKey = `documents/${documentId}/${sanitizedFileName}`;

    // Upload to storage
    const fileStream = Readable.from(input.file.buffer);
    await this.storage.uploadObject(tenantId, storageKey, fileStream, {
      contentType: input.file.mimetype,
      contentLength: input.file.size,
    });

    // Create document record
    const document = await prisma.document.create({
      data: {
        tenantId,
        clientCompanyId: input.clientCompanyId,
        relatedInvoiceId: input.relatedInvoiceId ?? null,
        relatedTransactionId: input.relatedTransactionId ?? null,
        type: input.type || "OTHER",
        originalFileName: input.file.originalname,
        storagePath: storageKey,
        mimeType: input.file.mimetype,
        fileSizeBytes: BigInt(input.file.size),
        uploadUserId: userId,
        uploadSource: "manual",
        status: "UPLOADED",
      },
    });

    // Create processing job
    await documentJobService.createProcessingJob(tenantId, document.id);

    // Increment document usage after successful upload
    const { usageService } = await import("./usage-service");
    await usageService.incrementUsage(tenantId, "DOCUMENTS" as any, 1);

    // Check if this document fulfills any requirements
    try {
      const { documentRequirementService } = await import("./document-requirement-service");
      await documentRequirementService.checkDocumentFulfillsRequirements(
        tenantId,
        input.clientCompanyId,
        document.type,
        document.id
      );
    } catch (error) {
      // Don't fail document upload if requirement check fails
      console.error("[DocumentService] Error checking document requirements:", error);
    }

    return this.mapToDocument(document);
  }

  async listDocuments(
    tenantId: string,
    filters: ListDocumentsFilters = {}
  ): Promise<PaginatedResult<Document>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (filters.clientCompanyId) {
      where.clientCompanyId = filters.clientCompanyId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    // Risk flag filtering - simplified approach
    // Note: Complex JSON filtering will be done post-query for now
    // In production, consider using raw SQL or a more sophisticated approach

    // If filtering by risk severity, add it to the where clause
    if (filters.riskSeverity) {
      where.riskScore = {
        severity: filters.riskSeverity,
      };
    }

    // If filtering by risk score range, add it to the where clause
    if (filters.minRiskScore !== undefined || filters.maxRiskScore !== undefined) {
      where.riskScore = {
        ...where.riskScore,
        ...(filters.minRiskScore !== undefined && { score: { gte: filters.minRiskScore } }),
        ...(filters.maxRiskScore !== undefined && { score: { lte: filters.maxRiskScore } }),
      };
    }

    // Debug logging for risk severity filtering
    if (filters.riskSeverity) {
      console.log(`[DocumentService] Filtering by riskSeverity: ${filters.riskSeverity}`);
      console.log(`[DocumentService] Where clause:`, JSON.stringify(where, null, 2));
    }

    const [data, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          uploadUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          riskFeatures: {
            select: {
              riskFlags: true,
            },
          },
          riskScore: {
            select: {
              score: true,
              severity: true,
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ]);

    // Debug logging for results
    if (filters.riskSeverity) {
      console.log(`[DocumentService] Found ${data.length} documents, total: ${total}`);
    }

    let mappedData = data.map((item) => {
      const doc = this.mapToDocument(item);
      const riskFlags = item.riskFeatures?.riskFlags as any[] | undefined;
      const riskFlagCount = Array.isArray(riskFlags) ? riskFlags.length : 0;
      const riskScore = item.riskScore?.score ? Number(item.riskScore.score) : null;
      const riskSeverity = item.riskScore?.severity || null;
      
      return {
        ...doc,
        riskFlagCount,
        riskScore,
        riskSeverity,
      };
    });

    // Apply risk flag filters post-query (simplified approach)
    if (filters.hasRiskFlags !== undefined) {
      mappedData = mappedData.filter((doc: any) => {
        if (filters.hasRiskFlags) {
          return doc.riskFlagCount > 0;
        } else {
          return doc.riskFlagCount === 0;
        }
      });
    }

    // Note: Risk severity and score range filtering is now done at the database level
    // The post-query filtering below is kept for backward compatibility but should not be needed

    if (filters.riskFlagCode) {
      // Filter by risk flag code - would need to check actual flags
      // For now, we'll return all and let client filter
      // In production, implement proper JSON path filtering
    }

    // Calculate total based on filters
    // Note: For riskSeverity, minRiskScore, maxRiskScore - filtering is done at DB level,
    // so `total` from prisma.count() is already correct and should be used.
    // Only for hasRiskFlags (post-query filter) do we need to recalculate.
    let finalTotal = total;
    if (filters.hasRiskFlags !== undefined) {
      // hasRiskFlags is filtered post-query, so we need to count all matching documents
      // This requires fetching all documents to check their risk flags
      // For performance, we could optimize this with a separate count query in production
      const allMatchingDocs = await prisma.document.findMany({
        where: {
          tenantId,
          isDeleted: false,
          ...(filters.clientCompanyId && { clientCompanyId: filters.clientCompanyId }),
          ...(filters.type && { type: filters.type }),
          ...(filters.status && { status: filters.status }),
          ...(filters.riskSeverity && {
            riskScore: {
              severity: filters.riskSeverity,
            },
          }),
        },
        include: {
          riskFeatures: {
            select: {
              riskFlags: true,
            },
          },
        },
      });
      
      const filteredByFlags = allMatchingDocs.filter((doc: any) => {
        const riskFlags = doc.riskFeatures?.riskFlags as any[] | undefined;
        const riskFlagCount = Array.isArray(riskFlags) ? riskFlags.length : 0;
        if (filters.hasRiskFlags) {
          return riskFlagCount > 0;
        } else {
          return riskFlagCount === 0;
        }
      });
      
      finalTotal = filteredByFlags.length;
    }
    // For riskSeverity, minRiskScore, maxRiskScore - the total from prisma.count() is correct
    // and should NOT be overridden with mappedData.length (which is only the current page)

    return {
      data: mappedData,
      total: finalTotal,
      page,
      pageSize,
      totalPages: Math.ceil(finalTotal / pageSize),
    };
  }

  async getDocumentById(
    tenantId: string,
    documentId: string
  ): Promise<Document> {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
        isDeleted: false,
      },
      include: {
        uploadUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundError("Belge bulunamadı.");
    }

    return this.mapToDocument(document);
  }

  async getDocumentStream(tenantId: string, documentId: string): Promise<Readable> {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!document) {
      throw new NotFoundError("Belge bulunamadı.");
    }

    // Normalize storage path - handle old seed data format
    let storageKey = document.storagePath;
    
    // If path starts with /storage/, remove it (old seed data format)
    if (storageKey.startsWith("/storage/")) {
      storageKey = storageKey.replace("/storage/", "");
    }
    
    // If path starts with /, remove it (absolute path issue)
    if (storageKey.startsWith("/")) {
      storageKey = storageKey.substring(1);
    }

    // If path doesn't have documentId in it (old format), try to construct it
    // Old format: documents/document_005.pdf
    // New format: documents/doc_xxx/document_005.pdf
    if (!storageKey.includes(documentId) && storageKey.startsWith("documents/")) {
      // Try to find the file with the old format first
      try {
        return await this.storage.getObjectStream(tenantId, storageKey);
      } catch (error) {
        // If old format fails, try constructing new format
        const fileName = storageKey.split("/").pop() || document.originalFileName;
        storageKey = `documents/${documentId}/${fileName}`;
      }
    }

    return this.storage.getObjectStream(tenantId, storageKey);
  }

  async deleteDocument(tenantId: string, documentId: string, userId: string): Promise<void> {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!document) {
      throw new NotFoundError("Belge bulunamadı.");
    }

    // Soft delete
    await prisma.document.update({
      where: { id: documentId },
      data: { isDeleted: true },
    });

    // Note: We keep the file in storage for audit trail
    // In production, you might want to schedule cleanup jobs for deleted documents
  }

  private mapToDocument(item: any): Document {
    return {
      id: item.id,
      tenantId: item.tenantId,
      clientCompanyId: item.clientCompanyId,
      relatedInvoiceId: item.relatedInvoiceId,
      relatedTransactionId: item.relatedTransactionId,
      type: item.type as DocumentType,
      originalFileName: item.originalFileName,
      storagePath: item.storagePath,
      mimeType: item.mimeType,
      fileSizeBytes: typeof item.fileSizeBytes === "bigint" ? Number(item.fileSizeBytes) : item.fileSizeBytes,
      uploadUserId: item.uploadUserId,
      uploadSource: item.uploadSource as any,
      status: item.status as DocumentStatus,
      processingErrorMessage: item.processingErrorMessage,
      processedAt: item.processedAt,
      isDeleted: item.isDeleted,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export const documentService = new DocumentService();

