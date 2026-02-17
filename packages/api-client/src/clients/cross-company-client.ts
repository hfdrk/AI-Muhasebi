import { apiClient } from "../api-client";

export const crossCompanyClient = {
  async scanTenant(): Promise<{ data: any }> {
    return apiClient.get("/api/v1/cross-company-matching/scan");
  },
  async scanCompany(clientCompanyId: string): Promise<{ data: any }> {
    return apiClient.get(`/api/v1/cross-company-matching/${clientCompanyId}`);
  },
};
