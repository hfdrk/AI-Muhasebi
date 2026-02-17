import { apiClient } from "../api-client";

export const documentAiClient = {
  async searchByRisk(params?: { riskLevel?: string; page?: number; limit?: number }): Promise<{ data: any }> {
    return apiClient.get("/api/v1/documents/search-by-risk", { params: params as any });
  },
  async getAiAnalysis(documentId: string): Promise<{ data: any }> {
    return apiClient.get(`/api/v1/documents/${documentId}/ai-analysis`);
  },
};
