import { apiClient } from "../api-client";

export const reportDownloadClient = {
  async getDefinitions(): Promise<{ data: any }> {
    return apiClient.get("/api/v1/reports/definitions");
  },
  async generate(input: { reportType: string; parameters?: any; format?: string }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/reports/generate", input);
  },
};
