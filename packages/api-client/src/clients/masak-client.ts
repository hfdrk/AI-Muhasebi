import { apiClient } from "../api-client";

export interface MasakDashboardStats {
  totalReports: number;
  pendingReports: number;
  submittedReports: number;
  draftReports: number;
  recentReports: MasakReportSummary[];
  upcomingDeadlines: MasakDeadline[];
  suspicionBreakdown: { type: string; count: number }[];
}

export interface MasakReportSummary {
  id: string;
  clientCompanyName: string;
  reportType: string;
  suspicionType: string;
  status: string;
  totalAmount: number;
  riskScore: number | null;
  deadline: string | null;
  createdAt: string;
}

export interface MasakDeadline {
  id: string;
  clientCompanyName: string;
  suspicionType: string;
  deadline: string;
  status: string;
}

export interface MasakScanResult {
  clientCompanyId: string;
  suspiciousIndicators: SuspiciousIndicator[];
  riskScore: number;
  summary: string;
}

export interface SuspiciousIndicator {
  type: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  relatedTransactions: string[];
  amount?: number;
}

export interface MasakReport {
  id: string;
  tenantId: string;
  clientCompanyId: string;
  reportType: string;
  status: string;
  suspicionType: string;
  suspicionDetails: string;
  totalAmount: number;
  currency: string;
  counterpartyName?: string;
  counterpartyTaxNo?: string;
  riskScore?: number;
  riskIndicators: any[];
  detectedAt: string;
  reportedAt?: string;
  deadline?: string;
  notes?: string;
  createdAt: string;
  clientCompany?: { name: string; taxNumber?: string };
  createdBy?: { name: string; email: string };
  reviewedBy?: { name: string; email: string };
}

export interface MasakReportCreateInput {
  clientCompanyId: string;
  reportType?: string;
  suspicionType: string;
  suspicionDetails: string;
  transactionIds?: string[];
  invoiceIds?: string[];
  totalAmount: number;
  currency?: string;
  counterpartyName?: string;
  counterpartyTaxNo?: string;
  riskScore?: number;
  notes?: string;
}

export const masakClient = {
  async getDashboard(): Promise<{ data: MasakDashboardStats }> {
    return apiClient.get("/api/v1/masak/dashboard");
  },

  async scanCompany(clientCompanyId: string): Promise<{ data: MasakScanResult }> {
    return apiClient.post(`/api/v1/masak/scan/${clientCompanyId}`);
  },

  async listReports(params?: {
    status?: string;
    clientCompanyId?: string;
    reportType?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: { reports: MasakReport[]; pagination: any } }> {
    return apiClient.get("/api/v1/masak/reports", { params });
  },

  async getReport(id: string): Promise<{ data: MasakReport }> {
    return apiClient.get(`/api/v1/masak/reports/${id}`);
  },

  async createReport(input: MasakReportCreateInput): Promise<{ data: MasakReport }> {
    return apiClient.post("/api/v1/masak/reports", input);
  },

  async updateReportStatus(
    id: string,
    status: string,
    notes?: string
  ): Promise<{ data: MasakReport }> {
    return apiClient.patch(`/api/v1/masak/reports/${id}/status`, { status, notes });
  },
};
