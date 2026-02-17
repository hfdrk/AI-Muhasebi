import { apiClient } from "../api-client";

export interface RiskAlert {
  id: string;
  tenantId: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  clientCompanyId?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export const riskAlertClient = {
  async list(params?: { status?: string; severity?: string; type?: string; page?: number; limit?: number }): Promise<{ data: { items: RiskAlert[]; pagination: any } }> {
    return apiClient.get("/api/v1/risk/alerts", { params: params as any });
  },
  async updateStatus(id: string, status: string): Promise<{ data: RiskAlert }> {
    return apiClient.patch(`/api/v1/risk/alerts/${id}/status`, { status });
  },
};
