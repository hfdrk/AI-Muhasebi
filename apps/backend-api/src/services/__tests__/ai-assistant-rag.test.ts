import { describe, it, expect, beforeEach, vi } from "vitest";
import { aiAssistantService } from "../ai-assistant-service";
import { ragService } from "../rag-service";

// Mock dependencies
vi.mock("../rag-service", () => ({
  ragService: {
    retrieveContext: vi.fn(),
  },
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    riskAlert: {
      findMany: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
    },
    clientCompany: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@repo/shared-utils", () => ({
  createLLMClient: vi.fn(() => ({
    generateText: vi.fn().mockResolvedValue("Test AI response"),
  })),
  hasRealAIProvider: vi.fn(() => true),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../audit-service", () => ({
  auditService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("AIAssistantService with RAG", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use RAG to retrieve context for questions", async () => {
    const mockRAGContext = {
      documents: [
        {
          id: "doc_1",
          documentId: "doc_1",
          similarity: 0.85,
          text: "Sample document text about invoices",
          metadata: {
            type: "INVOICE",
            clientCompanyId: "company_1",
          },
        },
      ],
      queryEmbedding: [0.1, 0.2, 0.3],
      totalResults: 1,
    };

    vi.mocked(ragService.retrieveContext).mockResolvedValue(mockRAGContext);

    const { prisma } = await import("../lib/prisma");
    vi.mocked(prisma.riskAlert.findMany).mockResolvedValue([]);
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
    vi.mocked(prisma.clientCompany.findMany).mockResolvedValue([]);

    const response = await aiAssistantService.generateChatResponse({
      tenantId: "tenant_123",
      userId: "user_123",
      question: "What are the risk factors in my invoices?",
      type: "RISK",
    });

    expect(ragService.retrieveContext).toHaveBeenCalled();
    expect(response).toBeDefined();
    expect(typeof response).toBe("string");
  });

  it("should fallback to keyword search if RAG fails", async () => {
    vi.mocked(ragService.retrieveContext).mockRejectedValue(new Error("RAG error"));

    const { prisma } = await import("../lib/prisma");
    vi.mocked(prisma.riskAlert.findMany).mockResolvedValue([
      {
        id: "alert_1",
        title: "High Risk Alert",
        severity: "high",
        message: "Test alert",
        clientCompany: { id: "company_1", name: "Test Company" },
      },
    ] as any);
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
    vi.mocked(prisma.clientCompany.findMany).mockResolvedValue([]);

    const response = await aiAssistantService.generateChatResponse({
      tenantId: "tenant_123",
      userId: "user_123",
      question: "What are the risk alerts?",
      type: "RISK",
    });

    // Should still work with keyword fallback
    expect(response).toBeDefined();
    expect(prisma.riskAlert.findMany).toHaveBeenCalled();
  });
});

