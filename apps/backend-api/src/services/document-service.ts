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
        },
      }),
      prisma.document.count({ where }),
    ]);

    let mappedData = data.map((item) => {
      const doc = this.mapToDocument(item);
      const riskFlags = item.riskFeatures?.riskFlags as any[] | undefined;
      const riskFlagCount = Array.isArray(riskFlags) ? riskFlags.length : 0;
      
      return {
        ...doc,
        riskFlagCount,
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

    if (filters.riskFlagCode) {
      // Filter by risk flag code - would need to check actual flags
      // For now, we'll return all and let client filter
      // In production, implement proper JSON path filtering
    }

    return {
      data: mappedData,
      total: filters.hasRiskFlags !== undefined ? mappedData.length : total,
      page,
      pageSize,
      totalPages: Math.ceil((filters.hasRiskFlags !== undefined ? mappedData.length : total) / pageSize),
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

    return this.storage.getObjectStream(tenantId, document.storagePath);
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

