import { apiClient } from "../api-client";

export interface ScheduledReportItem {
  id: string;
  tenantId: string;
  name: string;
  reportType: string;
  schedule: string;
  parameters?: any;
  recipients?: string[];
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const scheduledReportClient = {
  async list(): Promise<{ data: ScheduledReportItem[] }> {
    return apiClient.get("/api/v1/scheduled-reports");
  },
  async getById(id: string): Promise<{ data: ScheduledReportItem }> {
    return apiClient.get(`/api/v1/scheduled-reports/${id}`);
  },
  async create(input: Partial<ScheduledReportItem>): Promise<{ data: ScheduledReportItem }> {
    return apiClient.post("/api/v1/scheduled-reports", input);
  },
  async update(id: string, input: Partial<ScheduledReportItem>): Promise<{ data: ScheduledReportItem }> {
    return apiClient.put(`/api/v1/scheduled-reports/${id}`, input);
  },
  async delete(id: string): Promise<{ data: { success: boolean } }> {
    return apiClient.delete(`/api/v1/scheduled-reports/${id}`);
  },
};
