import { describe, it, expect, beforeEach, vi } from "vitest";
import { DocumentProcessor } from "../document-processor";
import { prisma } from "../../lib/prisma";
import { getStorage } from "@repo/config";
import { Readable } from "stream";

// Mock Prisma
vi.mock("../../lib/prisma", () => ({
  prisma: {
    document: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    documentProcessingJob: {
      findUnique: vi.fn(),
    },
    documentOCRResult: {
      upsert: vi.fn(),
    },
    documentParsedData: {
      upsert: vi.fn(),
    },
    documentRiskFeatures: {
      upsert: vi.fn(),
    },
  },
}));

// Mock storage
vi.mock("@repo/config", () => ({
  getStorage: vi.fn(() => ({
    getObjectStream: vi.fn().mockResolvedValue(Readable.from("test file content")),
  })),
}));

// Mock OCR service
vi.mock("../../services/ocr-service", () => ({
  ocrService: {
    runOCR: vi.fn().mockResolvedValue({
      rawText: "stub OCR text",
      engineName: "stub",
      confidence: null,
    }),
  },
}));

// Mock parser service
vi.mock("../../services/document-parser-service", () => ({
  documentParserService: {
    parseDocument: vi.fn().mockResolvedValue({
      documentType: "invoice",
      fields: { invoiceNumber: "INV-001" },
      parserVersion: "1.0-stub",
    }),
  },
}));

// Mock risk feature service
vi.mock("../../services/risk-feature-service", () => ({
  riskFeatureService: {
    generateRiskFeatures: vi.fn().mockResolvedValue({
      features: {},
      riskFlags: [],
      riskScore: 0,
    }),
  },
}));

// Mock document job service
vi.mock("../../services/document-job-service", () => ({
  documentJobService: {
    markJobSuccess: vi.fn(),
  },
}));

describe("DocumentProcessor", () => {
  let processor: DocumentProcessor;
  const mockTenantId = "tenant-123";

  beforeEach(() => {
    processor = new DocumentProcessor();
    vi.clearAllMocks();
  });

  describe("processDocument", () => {
    it("should process a document and extract data", async () => {
      const mockDocument = {
        id: "doc-1",
        tenantId: mockTenantId,
        clientCompanyId: "client-1",
        type: "INVOICE",
        originalFileName: "invoice.pdf",
        storagePath: "documents/doc-1/invoice.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: BigInt(1024),
        uploadUserId: "user-1",
        uploadSource: "manual",
        status: "UPLOADED",
        processingErrorMessage: null,
        processedAt: null,
        isDeleted: false,
        relatedInvoiceId: null,
        relatedTransactionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockJob = {
        id: "job-1",
        documentId: "doc-1",
      };

      vi.mocked(prisma.document.findFirst).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.documentProcessingJob.findUnique).mockResolvedValue(mockJob as any);

      const { documentJobService } = await import("../../services/document-job-service");

      await processor.processDocument(mockTenantId, "doc-1");

      expect(prisma.document.findFirst).toHaveBeenCalledWith({
        where: {
          id: "doc-1",
          tenantId: mockTenantId,
          isDeleted: false,
        },
      });

      const { ocrService } = await import("../../services/ocr-service");
      const { documentParserService } = await import("../../services/document-parser-service");
      const { riskFeatureService } = await import("../../services/risk-feature-service");
      const { documentJobService } = await import("../../services/document-job-service");

      expect(ocrService.runOCR).toHaveBeenCalled();
      expect(documentParserService.parseDocument).toHaveBeenCalled();
      expect(riskFeatureService.generateRiskFeatures).toHaveBeenCalled();
      expect(documentJobService.markJobSuccess).toHaveBeenCalled();
    });

    it("should throw error when document not found", async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

      await expect(processor.processDocument(mockTenantId, "non-existent")).rejects.toThrow(
        "Document not found"
      );
    });

    it("should process full pipeline: OCR → Parse → Risk Features", async () => {
      const mockDocument = {
        id: "doc-1",
        tenantId: mockTenantId,
        clientCompanyId: "client-1",
        type: "INVOICE",
        originalFileName: "invoice.pdf",
        storagePath: "documents/doc-1/invoice.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: BigInt(1024),
        uploadUserId: "user-1",
        uploadSource: "manual",
        status: "UPLOADED",
        processingErrorMessage: null,
        processedAt: null,
        isDeleted: false,
        relatedInvoiceId: null,
        relatedTransactionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockJob = {
        id: "job-1",
        documentId: "doc-1",
      };

      vi.mocked(prisma.document.findFirst).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.documentProcessingJob.findUnique).mockResolvedValue(mockJob as any);

      await processor.processDocument(mockTenantId, "doc-1");

      const { ocrService } = await import("../../services/ocr-service");
      const { documentParserService } = await import("../../services/document-parser-service");
      const { riskFeatureService } = await import("../../services/risk-feature-service");

      // Verify all three layers were called
      expect(ocrService.runOCR).toHaveBeenCalled();
      expect(documentParserService.parseDocument).toHaveBeenCalled();
      expect(riskFeatureService.generateRiskFeatures).toHaveBeenCalled();
    });
  });
});

