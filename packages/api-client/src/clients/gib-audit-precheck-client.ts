import { apiClient } from "../api-client";

export const gibAuditPrecheckClient = {
  async runPrecheck(clientCompanyId: string): Promise<{ data: any }> {
    return apiClient.get(`/api/v1/gib-audit-precheck/${clientCompanyId}`);
  },
  async analyzeWithPeriod(clientCompanyId: string, input: { period: string; year: number }): Promise<{ data: any }> {
    return apiClient.post(`/api/v1/gib-audit-precheck/${clientCompanyId}/analyze`, input);
  },
};
