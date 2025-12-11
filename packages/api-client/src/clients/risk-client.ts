import { apiClient } from "../api-client";
import type {
  DocumentRiskScore,
  ClientCompanyRiskScore,
  RiskAlert,
  RiskAlertStatus,
} from "@repo/core-domain";

export interface DocumentRiskScoreWithRules {
  riskScore: DocumentRiskScore | null;
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
  comparisons?: {
    previousPeriod: {
      highRiskClientCount: number;
      openCriticalAlertsCount: number;
      highRiskDocumentsCount: number;
    };
  };
  trends?: {
    riskScoreTrend: "increasing" | "decreasing" | "stable";
    alertTrend: "increasing" | "decreasing" | "stable";
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

/**
 * Get document risk score with triggered rules
 */
export async function getDocumentRiskScore(documentId: string): Promise<{ data: DocumentRiskScoreWithRules }> {
  return apiClient.get(`/api/v1/risk/documents/${documentId}`);
}

/**
 * Get client company risk overview
 */
export async function getClientCompanyRiskScore(clientCompanyId: string): Promise<{ data: ClientCompanyRiskOverview }> {
  return apiClient.get(`/api/v1/risk/companies/${clientCompanyId}`);
}

/**
 * Get tenant risk dashboard
 */
export async function getTenantRiskDashboard(): Promise<{ data: TenantRiskDashboard }> {
  return apiClient.get("/api/v1/risk/dashboard");
}

/**
 * List risk alerts
 */
export async function listRiskAlerts(params?: ListRiskAlertsParams): Promise<{ data: PaginatedRiskAlerts }> {
  return apiClient.get("/api/v1/risk/alerts", { params });
}

/**
 * Update alert status
 */
export async function updateAlertStatus(alertId: string, status: RiskAlertStatus): Promise<{ data: RiskAlert }> {
  return apiClient.patch(`/api/v1/risk/alerts/${alertId}/status`, { status });
}

/**
 * Get recent risk alerts for dashboard
 */
export async function getRecentRiskAlerts(limit: number = 5): Promise<{ data: RiskAlert[] }> {
  return apiClient.get(`/api/v1/risk/dashboard/recent-alerts`, { params: { limit } });
}

/**
 * Get risk trends for dashboard
 */
export async function getRiskTrends(period: "7d" | "30d" | "90d" | "1y" = "30d"): Promise<{
  data: {
    riskScoreTrend: {
      dates: string[];
      scores: number[];
      averageScore: number;
      trend: "increasing" | "decreasing" | "stable";
    };
    alertFrequencyTrend: {
      dates: string[];
      counts: number[];
      totalAlerts: number;
    };
    riskDistributionTrend: {
      dates: string[];
      low: number[];
      medium: number[];
      high: number[];
    };
  };
}> {
  return apiClient.get("/api/v1/risk/dashboard/trends", { params: { period } });
}

/**
 * Get risk breakdown
 */
export async function getRiskBreakdown(): Promise<{
  data: {
    totalRiskScore: number;
    categoryBreakdown: {
      fraud: { score: number; percentage: number };
      compliance: { score: number; percentage: number };
      financial: { score: number; percentage: number };
      operational: { score: number; percentage: number };
    };
    topRiskFactors: Array<{
      name: string;
      contribution: number;
      ruleCode: string;
      severity: string;
    }>;
    triggeredRules: Array<{
      code: string;
      description: string;
      weight: number;
      severity: string;
      count: number;
    }>;
  };
}> {
  return apiClient.get("/api/v1/risk/dashboard/breakdown");
}

/**
 * Get risk recommendations
 */
export async function getRiskRecommendations(): Promise<{
  data: Array<{
    id: string;
    type: "urgent" | "preventive" | "optimization";
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    actionUrl: string;
    actionLabel: string;
    relatedMetric: string;
    impact: string;
  }>;
}> {
  return apiClient.get("/api/v1/risk/dashboard/recommendations");
}

/**
 * Get risk heat map
 */
export async function getRiskHeatMap(): Promise<{
  data: {
    clients: Array<{
      id: string;
      name: string;
      riskScore: number;
      severity: "low" | "medium" | "high";
      alertCount: number;
      documentCount: number;
    }>;
    riskMatrix: {
      low: { low: number; medium: number; high: number };
      medium: { low: number; medium: number; high: number };
      high: { low: number; medium: number; high: number };
    };
    totalClients: number;
    averageRiskScore: number;
  };
}> {
  return apiClient.get("/api/v1/risk/dashboard/heatmap");
}

/**
 * Get risk forecast
 */
export async function getRiskForecast(days: number = 30): Promise<{
  data: {
    predictedScores: Array<{
      date: string;
      score: number;
      confidence: number;
    }>;
    earlyWarnings: Array<{
      type: string;
      message: string;
      probability: number;
      recommendedAction: string;
    }>;
    riskVelocity: {
      current: number;
      predicted: number;
      trend: "accelerating" | "decelerating" | "stable";
    };
  };
}> {
  return apiClient.get("/api/v1/risk/dashboard/forecast", { params: { days } });
}

/**
 * Export risk dashboard
 */
export async function exportRiskDashboard(format: "csv" | "json" = "json"): Promise<Blob> {
  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
  const url = `${API_URL}/api/v1/risk/dashboard/export?format=${format}`;
  
  // Get authentication token from localStorage
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Export failed" } }));
    throw new Error(error.error?.message || "Export failed");
  }

  return response.blob();
}

/**
 * Get export data for PDF generation
 */
export async function getRiskExportData(): Promise<{
  data: {
    dashboard: any;
    breakdown: any;
    recommendations: any;
    trends: any;
  };
}> {
  return apiClient.get("/api/v1/risk/dashboard/export-data");
}

// Export as object for backward compatibility
export const riskClient = {
  getDocumentRiskScore,
  getClientCompanyRiskScore,
  getTenantRiskDashboard,
  listRiskAlerts,
  updateAlertStatus,
  getRecentRiskAlerts,
  getRiskTrends,
  getRiskBreakdown,
  getRiskRecommendations,
  getRiskHeatMap,
  getRiskForecast,
  exportRiskDashboard,
  getRiskExportData,
};

