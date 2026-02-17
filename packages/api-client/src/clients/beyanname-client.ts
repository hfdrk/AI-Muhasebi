import { apiClient } from "../api-client";

export interface BeyannameDashboardStats {
  totalBeyanname: number;
  draftBeyanname: number;
  submittedBeyanname: number;
  overdueBeyanname: number;
  upcomingDue: BeyannameDeadline[];
  byType: { type: string; count: number }[];
}

export interface BeyannameDeadline {
  id: string;
  clientCompanyName: string;
  type: string;
  period: string;
  dueDate: string;
  status: string;
  netPayable?: number;
}

export interface Beyanname {
  id: string;
  tenantId: string;
  clientCompanyId: string;
  type: string;
  period: string;
  status: string;
  dueDate: string;
  calculatedAmount?: number;
  deductibleAmount?: number;
  netPayable?: number;
  carryForward?: number;
  calculationData: Record<string, any>;
  submittedAt?: string;
  notes?: string;
  createdAt: string;
  clientCompany?: { name: string; taxNumber?: string };
  preparedBy?: { name: string; email: string };
  reviewedBy?: { name: string; email: string };
}

export interface BeyannameCreateInput {
  clientCompanyId: string;
  type: string;
  period: string;
  dueDate: string;
  notes?: string;
}

export const beyannameClient = {
  async getDashboard(): Promise<{ data: BeyannameDashboardStats }> {
    return apiClient.get("/api/v1/beyanname/dashboard");
  },

  async createBeyanname(input: BeyannameCreateInput): Promise<{ data: Beyanname }> {
    return apiClient.post("/api/v1/beyanname", input);
  },

  async listBeyannameler(params?: {
    clientCompanyId?: string;
    type?: string;
    status?: string;
    period?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: { beyannameler: Beyanname[]; pagination: any } }> {
    return apiClient.get("/api/v1/beyanname", { params });
  },

  async getBeyanname(id: string): Promise<{ data: Beyanname }> {
    return apiClient.get(`/api/v1/beyanname/${id}`);
  },

  async calculateBeyanname(id: string): Promise<{ data: Beyanname }> {
    return apiClient.post(`/api/v1/beyanname/${id}/calculate`);
  },

  async updateBeyannameStatus(
    id: string,
    status: string,
    notes?: string
  ): Promise<{ data: Beyanname }> {
    return apiClient.patch(`/api/v1/beyanname/${id}/status`, { status, notes });
  },
};
