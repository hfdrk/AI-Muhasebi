import { apiClient } from "../api-client";

export interface ReportExecutionLogEntry {
  id: string;
  scheduledReportId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  resultUrl?: string;
}

export const reportExecutionLogClient = {
  async list(params?: { page?: number; limit?: number }): Promise<{ data: ReportExecutionLogEntry[] }> {
    return apiClient.get("/api/v1/report-execution-logs", { params: params as any });
  },
  async getByScheduledReport(scheduledReportId: string): Promise<{ data: ReportExecutionLogEntry[] }> {
    return apiClient.get(`/api/v1/report-execution-logs/scheduled/${scheduledReportId}`);
  },
};
