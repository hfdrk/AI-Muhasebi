import { apiClient } from "../api-client";

export interface KurganDashboardStats {
  totalSignals: number;
  newSignals: number;
  investigatingSignals: number;
  criticalSignals: number;
  recentSignals: KurganSignalSummary[];
  signalsByType: { type: string; count: number }[];
  signalsBySeverity: { severity: string; count: number }[];
}

export interface KurganSignalSummary {
  id: string;
  clientCompanyName: string;
  signalType: string;
  severity: string;
  status: string;
  title: string;
  riskScore: number;
  createdAt: string;
}

export interface KurganSignal {
  id: string;
  tenantId: string;
  clientCompanyId: string;
  signalType: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  dataSource: string;
  affectedPeriod?: string;
  riskScore: number;
  financialImpact?: number;
  relatedInvoiceIds: string[];
  relatedDocumentIds: string[];
  recommendedAction?: string;
  responseNotes?: string;
  respondedAt?: string;
  createdAt: string;
  clientCompany?: { name: string };
}

export interface KurganAnalysisResult {
  clientCompanyId: string;
  signals: any[];
  summary: string;
}

export const kurganClient = {
  async getDashboard(): Promise<{ data: KurganDashboardStats }> {
    return apiClient.get("/api/v1/kurgan/dashboard");
  },

  async analyzeCompany(clientCompanyId: string): Promise<{ data: KurganAnalysisResult }> {
    return apiClient.post(`/api/v1/kurgan/analyze/${clientCompanyId}`);
  },

  async listSignals(params?: {
    clientCompanyId?: string;
    status?: string;
    severity?: string;
    signalType?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: { signals: KurganSignal[]; pagination: any } }> {
    return apiClient.get("/api/v1/kurgan/signals", { params });
  },

  async updateSignalStatus(
    id: string,
    status: string,
    responseNotes?: string
  ): Promise<{ data: KurganSignal }> {
    return apiClient.patch(`/api/v1/kurgan/signals/${id}/status`, { status, responseNotes });
  },
};
