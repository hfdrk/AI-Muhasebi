import { describe, it, expect, beforeEach, vi } from "vitest";
import { ragService } from "../rag-service";
import { embeddingService } from "../embedding-service";

// Mock dependencies
vi.mock("../embedding-service", () => ({
  embeddingService: {
    generateEmbedding: vi.fn(),
  },
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    document: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@repo/config", () => ({
  getConfig: vi.fn(() => ({
    RAG_TOP_K: 5,
    RAG_MIN_SIMILARITY: 0.7,
  })),
}));

describe("RAGService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate query embedding", async () => {
    const mockEmbedding = [0.1, 0.2, 0.3];
    vi.mocked(embeddingService.generateEmbedding).mockResolvedValue(mockEmbedding);

    const embedding = await ragService.generateQueryEmbedding("test query");

    expect(embedding).toEqual(mockEmbedding);
    expect(embeddingService.generateEmbedding).toHaveBeenCalledWith("test query");
  });

  it("should retrieve context for question", async () => {
    const mockEmbedding = new Array(1536).fill(0.1);
    vi.mocked(embeddingService.generateEmbedding).mockResolvedValue(mockEmbedding);

    const { prisma } = await import("../../lib/prisma");
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([
      { document_id: "doc_1", similarity: 0.85 },
      { document_id: "doc_2", similarity: 0.75 },
    ]);

    vi.mocked(prisma.document.findUnique).mockResolvedValue({
      id: "doc_1",
      type: "INVOICE",
      clientCompanyId: "company_1",
      createdAt: new Date(),
      ocrResult: {
        rawText: "Sample invoice text",
      },
    } as any);

    const context = await ragService.retrieveContext("test question", "tenant_123", {
      topK: 2,
      includeMetadata: true,
    });

    expect(context.documents).toHaveLength(2);
    expect(context.queryEmbedding).toEqual(mockEmbedding);
    expect(context.totalResults).toBe(2);
  });

  it("should filter by client company", async () => {
    const mockEmbedding = new Array(1536).fill(0.1);
    vi.mocked(embeddingService.generateEmbedding).mockResolvedValue(mockEmbedding);

    const { prisma } = await import("../../lib/prisma");
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([]);

    await ragService.retrieveContext("test", "tenant_123", {
      filters: {
        clientCompanyId: "company_1",
      },
    });

    const queryCall = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0];
    expect(queryCall[0]).toContain("client_company_id");
  });
});

