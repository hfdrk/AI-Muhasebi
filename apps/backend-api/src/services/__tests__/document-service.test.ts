import { describe, it, expect, beforeEach, vi } from "vitest";
import { DocumentService } from "../document-service";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import { prisma } from "../../lib/prisma";
import { getStorage } from "@repo/config";

// Mock Prisma
vi.mock("../../lib/prisma", () => ({
  prisma: {
    clientCompany: {
      findFirst: vi.fn(),
    },
    invoice: {
      findFirst: vi.fn(),
    },
    transaction: {
      findFirst: vi.fn(),
    },
    document: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    documentProcessingJob: {
      create: vi.fn(),
    },
  },
}));

// Mock storage
vi.mock("@repo/config", () => ({
  getStorage: vi.fn(() => ({
    uploadObject: vi.fn().mockResolvedValue("documents/doc-123/file.pdf"),
    getObjectStream: vi.fn(),
    deleteObject: vi.fn(),
    getObjectUrl: vi.fn(),
  })),
  getStorageConfig: vi.fn(() => ({
    maxFileSize: 20971520, // 20MB
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  })),
}));

describe("DocumentService", () => {
  let service: DocumentService;
  const mockTenantId = "tenant-123";
  const mockUserId = "user-123";

  beforeEach(() => {
    service = new DocumentService();
    vi.clearAllMocks();
  });

  describe("uploadDocument", () => {
    it("should upload a document successfully", async () => {
      const mockFile = {
        buffer: Buffer.from("test file content"),
        originalname: "test.pdf",
        mimetype: "application/pdf",
        size: 1024,
      };

      vi.mocked(prisma.clientCompany.findFirst).mockResolvedValue({
        id: "client-1",
        tenantId: mockTenantId,
      } as any);

      vi.mocked(prisma.document.create).mockResolvedValue({
        id: "doc-1",
        tenantId: mockTenantId,
        clientCompanyId: "client-1",
        type: "OTHER",
        originalFileName: "test.pdf",
        storagePath: "documents/doc-1/test.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: BigInt(1024),
        uploadUserId: mockUserId,
        uploadSource: "manual",
        status: "UPLOADED",
        processingErrorMessage: null,
        processedAt: null,
        isDeleted: false,
        relatedInvoiceId: null,
        relatedTransactionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.documentProcessingJob.create).mockResolvedValue({
        id: "job-1",
        tenantId: mockTenantId,
        documentId: "doc-1",
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.uploadDocument(mockTenantId, mockUserId, {
        file: mockFile,
        clientCompanyId: "client-1",
        type: "OTHER",
      });

      expect(result.id).toBe("doc-1");
      expect(result.status).toBe("UPLOADED");
      expect(prisma.document.create).toHaveBeenCalled();
    });

    it("should throw ValidationError when client company doesn't belong to tenant", async () => {
      const mockFile = {
        buffer: Buffer.from("test"),
        originalname: "test.pdf",
        mimetype: "application/pdf",
        size: 1024,
      };

      vi.mocked(prisma.clientCompany.findFirst).mockResolvedValue(null);

      await expect(
        service.uploadDocument(mockTenantId, mockUserId, {
          file: mockFile,
          clientCompanyId: "client-1",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when file size exceeds limit", async () => {
      const mockFile = {
        buffer: Buffer.from("test"),
        originalname: "test.pdf",
        mimetype: "application/pdf",
        size: 30 * 1024 * 1024, // 30MB, exceeds 20MB limit
      };

      await expect(
        service.uploadDocument(mockTenantId, mockUserId, {
          file: mockFile,
          clientCompanyId: "client-1",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("listDocuments", () => {
    it("should return paginated list of documents for a tenant", async () => {
      const mockDocuments = [
        {
          id: "doc-1",
          tenantId: mockTenantId,
          clientCompanyId: "client-1",
          type: "OTHER",
          originalFileName: "test.pdf",
          storagePath: "documents/doc-1/test.pdf",
          mimeType: "application/pdf",
          fileSizeBytes: BigInt(1024),
          uploadUserId: mockUserId,
          uploadSource: "manual",
          status: "UPLOADED",
          processingErrorMessage: null,
          processedAt: null,
          isDeleted: false,
          relatedInvoiceId: null,
          relatedTransactionId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          uploadUser: {
            id: mockUserId,
            fullName: "Test User",
            email: "test@example.com",
          },
        },
      ];

      vi.mocked(prisma.document.findMany).mockResolvedValue(mockDocuments as any);
      vi.mocked(prisma.document.count).mockResolvedValue(1);

      const result = await service.listDocuments(mockTenantId, {
        clientCompanyId: "client-1",
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            clientCompanyId: "client-1",
            isDeleted: false,
          },
        })
      );
    });
  });

  describe("getDocumentById", () => {
    it("should return document with extracted data when found", async () => {
      const mockDocument = {
        id: "doc-1",
        tenantId: mockTenantId,
        clientCompanyId: "client-1",
        type: "OTHER",
        originalFileName: "test.pdf",
        storagePath: "documents/doc-1/test.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: BigInt(1024),
        uploadUserId: mockUserId,
        uploadSource: "manual",
        status: "PROCESSED",
        processingErrorMessage: null,
        processedAt: new Date(),
        isDeleted: false,
        relatedInvoiceId: null,
        relatedTransactionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Note: extractedData removed, using new AI analysis structure
        uploadUser: {
          id: mockUserId,
          fullName: "Test User",
          email: "test@example.com",
        },
      };

      vi.mocked(prisma.document.findFirst).mockResolvedValue(mockDocument as any);

      const result = await service.getDocumentById(mockTenantId, "doc-1");

      expect(result.id).toBe("doc-1");
      // Note: extractedData removed, using new AI analysis structure
      // expect(result.extractedData?.detectedType).toBe("invoice");
    });

    it("should throw NotFoundError when document not found", async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

      await expect(service.getDocumentById(mockTenantId, "non-existent")).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteDocument", () => {
    it("should soft delete a document", async () => {
      const mockDocument = {
        id: "doc-1",
        tenantId: mockTenantId,
        isDeleted: false,
      };

      vi.mocked(prisma.document.findFirst).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...mockDocument,
        isDeleted: true,
      } as any);

      await service.deleteDocument(mockTenantId, "doc-1", mockUserId);

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: "doc-1" },
        data: { isDeleted: true },
      });
    });
  });
});

