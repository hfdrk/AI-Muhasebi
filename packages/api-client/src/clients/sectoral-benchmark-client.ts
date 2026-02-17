import { apiClient } from "../api-client";

export const sectoralBenchmarkClient = {
  async getSectors(): Promise<{ data: any }> {
    return apiClient.get("/api/v1/sectoral-benchmark/sectors");
  },
  async getBenchmark(clientCompanyId: string): Promise<{ data: any }> {
    return apiClient.get(`/api/v1/sectoral-benchmark/${clientCompanyId}`);
  },
  async analyze(clientCompanyId: string, input: { sectorCode: string; period?: string }): Promise<{ data: any }> {
    return apiClient.post(`/api/v1/sectoral-benchmark/${clientCompanyId}/analyze`, input);
  },
};
