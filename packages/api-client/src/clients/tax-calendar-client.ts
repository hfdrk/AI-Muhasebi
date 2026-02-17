import { apiClient } from "../api-client";

export interface TaxDeadline {
  id: string;
  type: string;
  title: string;
  dueDate: string;
  status: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string;
}

export const taxCalendarClient = {
  async getDeadlines(params?: { year?: number; month?: number }): Promise<{ data: TaxDeadline[] }> {
    return apiClient.get("/api/v1/tax-calendar/deadlines", { params: params as any });
  },
  async getCritical(): Promise<{ data: TaxDeadline[] }> {
    return apiClient.get("/api/v1/tax-calendar/critical");
  },
  async getSummary(): Promise<{ data: any }> {
    return apiClient.get("/api/v1/tax-calendar/summary");
  },
  async markCompleted(input: { deadlineId: string; notes?: string }): Promise<{ data: any }> {
    return apiClient.post("/api/v1/tax-calendar/complete", input);
  },
  async getHistory(params?: { page?: number; limit?: number }): Promise<{ data: any }> {
    return apiClient.get("/api/v1/tax-calendar/history", { params: params as any });
  },
  async getTypes(): Promise<{ data: any }> {
    return apiClient.get("/api/v1/tax-calendar/types");
  },
};
