import { describe, it, expect, beforeEach, vi } from "vitest";
import { embeddingService } from "../embedding-service";
import { createEmbeddingClient } from "@repo/shared-utils";

// Mock the embedding client
vi.mock("@repo/shared-utils", () => ({
  createEmbeddingClient: vi.fn(),
  hasRealEmbeddingProvider: vi.fn(() => true),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Prisma
vi.mock("../../lib/prisma", () => ({
  prisma: {
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  },
}));

describe("EmbeddingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate embedding for text", async () => {
    const mockClient = {
      generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      getDimensions: vi.fn().mockReturnValue(1536),
      getModel: vi.fn().mockReturnValue("text-embedding-3-small"),
    };

    vi.mocked(createEmbeddingClient).mockReturnValue(mockClient as any);

    const embedding = await embeddingService.generateEmbedding("test text");

    expect(embedding).toEqual([0.1, 0.2, 0.3]);
    expect(mockClient.generateEmbedding).toHaveBeenCalledWith("test text");
  });

  it("should store document embedding", async () => {
    const { prisma } = await import("../../lib/prisma");
    const mockExecuteRaw = vi.mocked(prisma.$executeRawUnsafe);

    await embeddingService.storeDocumentEmbedding(
      "tenant_123",
      "doc_123",
      [0.1, 0.2, 0.3],
      "text-embedding-3-small"
    );

    expect(mockExecuteRaw).toHaveBeenCalled();
    const callArgs = mockExecuteRaw.mock.calls[0];
    expect(callArgs[0]).toContain("INSERT INTO document_embeddings");
    expect(callArgs[1]).toBe("embedding_doc_123");
    expect(callArgs[2]).toBe("tenant_123");
    expect(callArgs[3]).toBe("doc_123");
  });

  it("should handle embedding generation errors gracefully", async () => {
    const mockClient = {
      generateEmbedding: vi.fn().mockRejectedValue(new Error("API error")),
      getDimensions: vi.fn().mockReturnValue(1536),
      getModel: vi.fn().mockReturnValue("text-embedding-3-small"),
    };

    vi.mocked(createEmbeddingClient).mockReturnValue(mockClient as any);

    await expect(embeddingService.generateEmbedding("test")).rejects.toThrow();
  });
});

