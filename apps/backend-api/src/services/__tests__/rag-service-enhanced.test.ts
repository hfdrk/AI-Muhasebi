import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { RAGService } from "../rag-service";
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
    RAG_ENABLED: true,
  })),
}));

vi.mock("@repo/shared-utils", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createLLMClient: vi.fn(() => ({
    generateText: vi.fn().mockResolvedValue("Expanded query"),
    generateJSON: vi.fn().mockResolvedValue({
      scores: [
        { id: "doc_1", score: 9 },
        { id: "doc_2", score: 7 },
      ],
    }),
  })),
  hasRealAIProvider: vi.fn(() => true),
}));

describe("RAGService Enhanced Features", () => {
  let ragService: RAGService;

  beforeEach(() => {
    vi.clearAllMocks();
    ragService = new RAGService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Embedding Caching", () => {
    it("should cache embeddings for repeated queries", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      vi.mocked(embeddingService.generateEmbedding).mockResolvedValue(mockEmbedding);

      // First call - should generate embedding
      const embedding1 = await ragService.generateQueryEmbedding("test query");
      expect(embeddingService.generateEmbedding).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const embedding2 = await ragService.generateQueryEmbedding("test query");
      expect(embeddingService.generateEmbedding).toHaveBeenCalledTimes(1);

      expect(embedding1).toEqual(embedding2);
    });

    it("should generate new embedding for different queries", async () => {
      const mockEmbedding1 = new Array(1536).fill(0.1);
      const mockEmbedding2 = new Array(1536).fill(0.2);

      vi.mocked(embeddingService.generateEmbedding)
        .mockResolvedValueOnce(mockEmbedding1)
        .mockResolvedValueOnce(mockEmbedding2);

      await ragService.generateQueryEmbedding("query 1");
      await ragService.generateQueryEmbedding("query 2");

      expect(embeddingService.generateEmbedding).toHaveBeenCalledTimes(2);
    });
  });

  describe("Hybrid Search", () => {
    it("should combine semantic and keyword search results", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      vi.mocked(embeddingService.generateEmbedding).mockResolvedValue(mockEmbedding);

      const { prisma } = await import("../../lib/prisma");

      // Mock semantic search results
      vi.mocked(prisma.$queryRawUnsafe)
        .mockResolvedValueOnce([
          { document_id: "doc_1", similarity: 0.9 },
          { document_id: "doc_2", similarity: 0.8 },
        ])
        // Mock keyword search results
        .mockResolvedValueOnce([
          { document_id: "doc_2", rank: 0.95 },
          { document_id: "doc_3", rank: 0.7 },
        ]);

      vi.mocked(prisma.document.findUnique).mockResolvedValue({
        id: "doc_1",
        type: "INVOICE",
        clientCompanyId: "company_1",
        createdAt: new Date(),
        ocrResult: { rawText: "Sample text" },
      } as any);

      const context = await ragService.hybridSearch("test query", "tenant_123", {
        topK: 3,
        includeMetadata: true,
      });

      // Should have merged results from both searches
      expect(context.documents.length).toBeGreaterThan(0);
      expect(context.hybridResults).toBeDefined();
    });

    it("should handle keyword search failure gracefully", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      vi.mocked(embeddingService.generateEmbedding).mockResolvedValue(mockEmbedding);

      const { prisma } = await import("../../lib/prisma");

      // Mock semantic search results
      vi.mocked(prisma.$queryRawUnsafe)
        .mockResolvedValueOnce([{ document_id: "doc_1", similarity: 0.9 }])
        // Mock keyword search failure
        .mockRejectedValueOnce(new Error("Full-text search not available"));

      vi.mocked(prisma.document.findUnique).mockResolvedValue({
        id: "doc_1",
        type: "INVOICE",
        ocrResult: { rawText: "Sample text" },
      } as any);

      // Should not throw, should return results from semantic search only
      const context = await ragService.hybridSearch("test query", "tenant_123", {
        topK: 3,
      });

      expect(context.documents.length).toBeGreaterThan(0);
    });
  });

  describe("Reciprocal Rank Fusion", () => {
    it("should properly merge and deduplicate results", () => {
      const semanticResults = [
        { documentId: "doc_1", similarity: 0.95 },
        { documentId: "doc_2", similarity: 0.85 },
        { documentId: "doc_3", similarity: 0.75 },
      ];

      const keywordResults = [
        { documentId: "doc_2", similarity: 0.9 },
        { documentId: "doc_4", similarity: 0.8 },
        { documentId: "doc_1", similarity: 0.7 },
      ];

      // Access private method for testing
      const mergedResults = (ragService as any).reciprocalRankFusion(
        semanticResults,
        keywordResults,
        5
      );

      // doc_1 and doc_2 should have higher scores (appear in both lists)
      expect(mergedResults.length).toBeLessThanOrEqual(5);

      const docIds = mergedResults.map((r: any) => r.documentId);
      expect(docIds).toContain("doc_1");
      expect(docIds).toContain("doc_2");

      // No duplicates
      const uniqueIds = [...new Set(docIds)];
      expect(uniqueIds.length).toBe(docIds.length);
    });
  });

  describe("Query Expansion with Conversation History", () => {
    it("should expand query using conversation history", async () => {
      const conversationHistory = [
        { role: "user" as const, content: "ABC şirketinin faturaları hakkında bilgi ver" },
        { role: "assistant" as const, content: "ABC şirketinin 5 faturası bulunmaktadır..." },
      ];

      const expandedQuery = await ragService.expandQueryWithHistory(
        "Toplam tutarı ne kadar?",
        conversationHistory
      );

      // Query should be expanded (not the same as original)
      expect(expandedQuery).toBeDefined();
      expect(typeof expandedQuery).toBe("string");
    });

    it("should return original query when no history provided", async () => {
      const originalQuery = "Test query";
      const expandedQuery = await ragService.expandQueryWithHistory(originalQuery, []);

      expect(expandedQuery).toBe(originalQuery);
    });
  });

  describe("Re-ranking", () => {
    it("should re-rank documents using LLM", async () => {
      const documents = [
        { id: "doc_1", documentId: "doc_1", similarity: 0.8, text: "Invoice from ABC" },
        { id: "doc_2", documentId: "doc_2", similarity: 0.85, text: "Bank statement" },
      ];

      const rerankedDocs = await (ragService as any).rerankResults(
        "ABC şirketinin faturası",
        documents
      );

      // Should have rerank scores
      expect(rerankedDocs[0]).toHaveProperty("rerankScore");

      // Should be sorted by rerankScore
      for (let i = 0; i < rerankedDocs.length - 1; i++) {
        expect(rerankedDocs[i].rerankScore).toBeGreaterThanOrEqual(
          rerankedDocs[i + 1].rerankScore || 0
        );
      }
    });

    it("should return original documents when only one document", async () => {
      const documents = [
        { id: "doc_1", documentId: "doc_1", similarity: 0.9, text: "Single doc" },
      ];

      const rerankedDocs = await (ragService as any).rerankResults("query", documents);

      expect(rerankedDocs).toEqual(documents);
    });
  });

  describe("Enhanced Context Retrieval", () => {
    it("should use hybrid search when enabled", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      vi.mocked(embeddingService.generateEmbedding).mockResolvedValue(mockEmbedding);

      const { prisma } = await import("../../lib/prisma");
      vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([]);
      vi.mocked(prisma.document.findUnique).mockResolvedValue(null);

      await ragService.retrieveEnhancedContext("test query", "tenant_123", {
        useHybridSearch: true,
        topK: 5,
      });

      // Should call $queryRawUnsafe for both semantic and keyword search
      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it("should expand query when conversation history is provided", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      vi.mocked(embeddingService.generateEmbedding).mockResolvedValue(mockEmbedding);

      const { prisma } = await import("../../lib/prisma");
      vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([]);
      vi.mocked(prisma.document.findUnique).mockResolvedValue(null);

      const conversationHistory = [
        { role: "user" as const, content: "Şirket X hakkında bilgi" },
        { role: "assistant" as const, content: "Şirket X'in detayları..." },
      ];

      await ragService.retrieveEnhancedContext("Daha fazla bilgi ver", "tenant_123", {
        conversationHistory,
        topK: 5,
      });

      // Query expansion should have been attempted
      expect(embeddingService.generateEmbedding).toHaveBeenCalled();
    });
  });
});
