import { Readable } from "stream";
import { prisma } from "../lib/prisma";
import { ValidationError } from "@repo/shared-utils";
import { getStorage, getStorageConfig } from "@repo/config";
import { sanitizeFileName } from "@repo/shared-utils";
import { zipExtractionService, type ExtractedFile } from "./zip-extraction-service";
import { documentJobService } from "./document-job-service";
import type { Document, DocumentType } from "@repo/core-domain";

export interface BatchUploadMetadata {
  clientCompanyId: string;
  type?: DocumentType; // Optional, will try to auto-detect if not provided
  relatedInvoiceId?: string | null;
  relatedTransactionId?: string | null;
}

export interface BatchUploadResult {
  batchId: string;
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
  documentIds: string[];
  errors: Array<{ fileName: string; error: string }>;
}

export class BatchUploadService {
  private storage = getStorage();
  private storageConfig = getStorageConfig();

  /**
   * Upload and process a zip file containing multiple documents
   */
  async uploadZipContents(
    tenantId: string,
    userId: string,
    zipBuffer: Buffer,
    zipFileName: string,
    metadata: BatchUploadMetadata
  ): Promise<BatchUploadResult> {
    // Validate zip file size
    if (zipBuffer.length > this.storageConfig.maxZipFileSize) {
      throw new ValidationError(
        `ZIP dosyası çok büyük (${(zipBuffer.length / (1024 * 1024)).toFixed(2)}MB). Maksimum ${this.storageConfig.maxZipFileSize / (1024 * 1024)}MB izin verilir.`
      );
    }

    // Verify client company belongs to tenant
    const clientCompany = await prisma.clientCompany.findFirst({
      where: {
        id: metadata.clientCompanyId,
        tenantId,
      },
    });

    if (!clientCompany) {
      throw new ValidationError("Müşteri şirketi bulunamadı veya bu kiracıya ait değil.");
    }

    // Extract zip file
    const extractionResult = await zipExtractionService.extractZipFile(zipBuffer);

    // Filter to only supported file types
    const supportedFiles = zipExtractionService.filterSupportedFiles(extractionResult.files);

    // Validate extracted files
    await zipExtractionService.validateExtractedFiles(supportedFiles);

    if (supportedFiles.length === 0) {
      throw new ValidationError("ZIP dosyası desteklenen dosya türü içermiyor.");
    }

    // Generate batch ID for tracking
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Upload each file and create document records
    const documentIds: string[] = [];
    const errors: Array<{ fileName: string; error: string }> = [];
    let successfulUploads = 0;
    let failedUploads = 0;

    for (const file of supportedFiles) {
      try {
        const document = await this.uploadSingleFile(
          tenantId,
          userId,
          file,
          metadata,
          batchId
        );
        documentIds.push(document.id);
        successfulUploads++;
      } catch (error: any) {
        failedUploads++;
        errors.push({
          fileName: file.name,
          error: error.message || "Bilinmeyen hata",
        });
        console.error(`Error uploading file ${file.name} from batch:`, error);
      }
    }

    return {
      batchId,
      totalFiles: extractionResult.fileCount,
      successfulUploads,
      failedUploads,
      documentIds,
      errors,
    };
  }

  /**
   * Upload a single file from the batch
   */
  private async uploadSingleFile(
    tenantId: string,
    userId: string,
    file: ExtractedFile,
    metadata: BatchUploadMetadata,
    batchId: string
  ): Promise<Document> {
    // Generate unique storage key
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const sanitizedFileName = sanitizeFileName(file.name);
    const storageKey = `documents/${documentId}/${sanitizedFileName}`;

    // Upload to storage
    const fileStream = Readable.from(file.buffer);
    await this.storage.uploadObject(tenantId, storageKey, fileStream, {
      contentType: file.mimeType,
      contentLength: file.size,
    });

    // Auto-detect document type if not provided
    let documentType: DocumentType = metadata.type || this.autoDetectDocumentType(file);

    // Create document record
    const document = await prisma.document.create({
      data: {
        tenantId,
        clientCompanyId: metadata.clientCompanyId,
        relatedInvoiceId: metadata.relatedInvoiceId ?? null,
        relatedTransactionId: metadata.relatedTransactionId ?? null,
        type: documentType,
        originalFileName: file.name,
        storagePath: storageKey,
        mimeType: file.mimeType,
        fileSizeBytes: BigInt(file.size),
        uploadUserId: userId,
        uploadSource: "zip_batch",
        status: "UPLOADED",
      },
    });

    // Create processing job
    await documentJobService.createProcessingJob(tenantId, document.id);

    // Increment document usage
    const { usageService } = await import("./usage-service");
    await usageService.incrementUsage(tenantId, "DOCUMENTS" as any, 1);

    // Map to Document domain entity
    return this.mapToDocument(document);
  }

  /**
   * Auto-detect document type from file name and MIME type
   */
  private autoDetectDocumentType(file: ExtractedFile): DocumentType {
    const fileName = file.name.toLowerCase();
    const mimeType = file.mimeType.toLowerCase();

    // Check MIME type first
    if (mimeType.includes("pdf")) {
      // Try to detect from filename
      if (fileName.includes("fatura") || fileName.includes("invoice")) {
        return "INVOICE";
      }
      if (fileName.includes("ekstre") || fileName.includes("statement") || fileName.includes("extract")) {
        return "BANK_STATEMENT";
      }
      if (fileName.includes("dekont") || fileName.includes("receipt")) {
        return "RECEIPT";
      }
    }

    // Default to OTHER if can't determine
    return "OTHER";
  }

  /**
   * Map Prisma document to domain entity
   */
  private mapToDocument(document: any): Document {
    return {
      id: document.id,
      tenantId: document.tenantId,
      clientCompanyId: document.clientCompanyId,
      relatedInvoiceId: document.relatedInvoiceId,
      relatedTransactionId: document.relatedTransactionId,
      type: document.type as DocumentType,
      originalFileName: document.originalFileName,
      storagePath: document.storagePath,
      mimeType: document.mimeType,
      fileSizeBytes: typeof document.fileSizeBytes === "bigint" ? Number(document.fileSizeBytes) : document.fileSizeBytes,
      uploadUserId: document.uploadUserId,
      uploadSource: document.uploadSource as any,
      status: document.status as any,
      processingErrorMessage: document.processingErrorMessage,
      processedAt: document.processedAt,
      isDeleted: document.isDeleted,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  /**
   * Get batch upload status
   */
  async getBatchStatus(
    tenantId: string,
    batchId: string
  ): Promise<{
    batchId: string;
    totalFiles: number;
    processed: number;
    failed: number;
    documents: Array<{
      id: string;
      fileName: string;
      status: string;
      error?: string;
    }>;
  }> {
    // Find all documents uploaded in this batch
    const documents = await prisma.document.findMany({
      where: {
        tenantId,
        uploadSource: "zip_batch",
        // Note: We'd need to store batchId in metadata or a separate table
        // For now, we'll use a simpler approach: find documents uploaded around the same time
        // This is a limitation - ideally we'd add a batchId field to Document table
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Reasonable limit
    });

    // Filter by approximate batch time (within 5 minutes)
    // This is a workaround - proper implementation would use a batchId field
    const batchDocuments = documents.filter((doc) => {
      // Extract timestamp from batchId if possible, or use recent documents
      return true; // Simplified for now
    });

    const processed = batchDocuments.filter((d) => d.status === "PROCESSED").length;
    const failed = batchDocuments.filter((d) => d.status === "FAILED").length;

    return {
      batchId,
      totalFiles: batchDocuments.length,
      processed,
      failed,
      documents: batchDocuments.map((doc) => ({
        id: doc.id,
        fileName: doc.originalFileName,
        status: doc.status,
        error: doc.processingErrorMessage || undefined,
      })),
    };
  }
}

export const batchUploadService = new BatchUploadService();

