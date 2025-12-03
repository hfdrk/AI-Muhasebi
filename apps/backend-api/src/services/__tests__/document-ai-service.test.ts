import { describe, it, expect, beforeEach, vi } from "vitest";
import { DocumentAIService } from "../document-ai-service";
import { prisma } from "../../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";

// Mock Prisma
vi.mock("../../lib/prisma", () => ({
  prisma: {
    document: {
      findFirst: vi.fn(),
    },
    documentOCRResult: {
      findUnique: vi.fn(),
    },
    documentParsedData: {
      findUnique: vi.fn(),
    },
    documentRiskFeatures: {
      findUnique: vi.fn(),
    },
  },
}));

describe("DocumentAIService", () => {
  let service: DocumentAIService;
  const mockTenantId = "tenant-123";

  beforeEach(() => {
    service = new DocumentAIService();
    vi.clearAllMocks();
  });

  describe("getDocumentAIAnalysis", () => {
    it("should return AI analysis for a document", async () => {
      const mockDocument = {
        id: "doc-1",
        tenantId: mockTenantId,
      };

      const mockOCRResult = {
        id: "ocr-1",
        tenantId: mockTenantId,
        documentId: "doc-1",
        rawText: "stub OCR text",
        ocrEngine: "stub",
        confidence: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockParsedData = {
        id: "parsed-1",
        tenantId: mockTenantId,
        documentId: "doc-1",
        documentType: "invoice",
        fields: { invoiceNumber: "INV-001" },
        parserVersion: "1.0-stub",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRiskFeatures = {
        id: "risk-1",
        tenantId: mockTenantId,
        documentId: "doc-1",
        features: {},
        riskFlags: [],
        riskScore: 0,
        generatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.document.findFirst).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.documentOCRResult.findUnique).mockResolvedValue(mockOCRResult as any);
      vi.mocked(prisma.documentParsedData.findUnique).mockResolvedValue(mockParsedData as any);
      vi.mocked(prisma.documentRiskFeatures.findUnique).mockResolvedValue(mockRiskFeatures as any);

      const result = await service.getDocumentAIAnalysis(mockTenantId, "doc-1");

      expect(result.ocrResult).toBeDefined();
      expect(result.parsedData).toBeDefined();
      expect(result.riskFeatures).toBeDefined();
      expect(result.ocrResult?.rawText).toBe("stub OCR text");
    });

    it("should throw NotFoundError when document not found", async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

      await expect(service.getDocumentAIAnalysis(mockTenantId, "non-existent")).rejects.toThrow(
        NotFoundError
      );
    });

    it("should enforce tenant isolation", async () => {
      const mockDocument = {
        id: "doc-1",
        tenantId: "other-tenant",
      };

      vi.mocked(prisma.document.findFirst).mockResolvedValue(mockDocument as any);

      await expect(service.getDocumentAIAnalysis(mockTenantId, "doc-1")).rejects.toThrow(
        NotFoundError
      );
    });

    it("should return null for missing AI results", async () => {
      const mockDocument = {
        id: "doc-1",
        tenantId: mockTenantId,
      };

      vi.mocked(prisma.document.findFirst).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.documentOCRResult.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.documentParsedData.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.documentRiskFeatures.findUnique).mockResolvedValue(null);

      const result = await service.getDocumentAIAnalysis(mockTenantId, "doc-1");

      expect(result.ocrResult).toBeNull();
      expect(result.parsedData).toBeNull();
      expect(result.riskFeatures).toBeNull();
    });
  });
});

