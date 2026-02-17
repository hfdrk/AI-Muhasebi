import { apiClient } from "../api-client";

export const aiClient = {
  async chat(input: { message: string; context?: string }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/ai/chat", input);
  },
  async dailyRiskSummary(input: { clientCompanyId?: string }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/ai/summaries/daily-risk", input);
  },
  async portfolioSummary(): Promise<{ data: any }> {
    return apiClient.post("/api/v1/ai/summaries/portfolio", {});
  },
  async ragSearch(input: { query: string; topK?: number }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/ai/rag/search", input);
  },
  async enhancedChat(input: { message: string; conversationId?: string }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/ai/chat/enhanced", input);
  },
  async hybridSearch(input: { query: string; topK?: number }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/ai/rag/hybrid-search", input);
  },
  async generateEmbeddings(input: { documentId: string }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/ai/embeddings/generate", input);
  },
  async batchRegenerateEmbeddings(): Promise<{ data: any }> {
    return apiClient.post("/api/v1/ai/embeddings/batch-regenerate", {});
  },
};
