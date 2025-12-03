import { apiClient } from "../api-client";
import type {
  DocumentRiskScore,
  ClientCompanyRiskScore,
  RiskAlert,
  RiskAlertStatus,
} from "@repo/core-domain";

export interface DocumentRiskScoreWithRules {
  riskScore: DocumentRiskScore;
  triggeredRules: Array<{
    code: string;
    description: string;
    severity: string;
    weight: number;
  }>;
}

export interface ClientCompanyRiskOverview {
  riskScore: ClientCompanyRiskScore | null;
  breakdown: {
    low: number;
    medium: number;
    high: number;
  };
  topTriggeredRules: Array<{
    code: string;
    description: string;
    count: number;
  }>;
}

export interface TenantRiskDashboard {
  highRiskClientCount: number;
  openCriticalAlertsCount: number;
  totalDocuments: number;
  highRiskDocumentsCount: number;
  clientRiskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface ListRiskAlertsParams {
  clientCompanyId?: string;
  severity?: string;
  status?: RiskAlertStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedRiskAlerts {
  data: RiskAlert[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const riskClient = {
  /**
   * Get document risk score with triggered rules
   */
  async getDocumentRiskScore(documentId: string): Promise<{ data: DocumentRiskScoreWithRules }> {
    return apiClient.get(`/api/v1/risk/documents/${documentId}`);
  },

  /**
   * Get client company risk overview
   */
  async getClientCompanyRiskScore(clientCompanyId: string): Promise<{ data: ClientCompanyRiskOverview }> {
    return apiClient.get(`/api/v1/risk/companies/${clientCompanyId}`);
  },

  /**
   * Get tenant risk dashboard
   */
  async getTenantRiskDashboard(): Promise<{ data: TenantRiskDashboard }> {
    return apiClient.get("/api/v1/risk/dashboard");
  },

  /**
   * List risk alerts
   */
  async listRiskAlerts(params?: ListRiskAlertsParams): Promise<{ data: PaginatedRiskAlerts }> {
    return apiClient.get("/api/v1/risk/alerts", { params });
  },

  /**
   * Update alert status
   */
  async updateAlertStatus(alertId: string, status: RiskAlertStatus): Promise<{ data: RiskAlert }> {
    return apiClient.patch(`/api/v1/risk/alerts/${alertId}/status`, { status });
  },
};

