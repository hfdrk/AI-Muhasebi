import { apiClient } from "../api-client";

export interface BaBsDashboardStats {
  totalForms: number;
  draftForms: number;
  submittedForms: number;
  mismatchedForms: number;
  recentForms: BaBsFormSummary[];
}

export interface BaBsFormSummary {
  id: string;
  clientCompanyName: string;
  formType: string;
  period: string;
  status: string;
  totalAmount: number;
  lineCount: number;
  crossCheckStatus?: string;
  createdAt: string;
}

export interface BaBsForm {
  id: string;
  tenantId: string;
  clientCompanyId: string;
  formType: string;
  period: string;
  status: string;
  totalAmount: number;
  lineCount: number;
  crossCheckStatus?: string;
  crossCheckErrors: any[];
  submittedAt?: string;
  notes?: string;
  createdAt: string;
  clientCompany?: { name: string; taxNumber?: string };
  generatedBy?: { name: string; email: string };
  lines?: BaBsFormLine[];
}

export interface BaBsFormLine {
  id: string;
  formId: string;
  counterpartyName: string;
  counterpartyTaxNumber: string;
  counterpartyCountry: string;
  documentCount: number;
  totalAmount: number;
  crossCheckMatch?: boolean;
}

export interface CrossCheckResult {
  formId: string;
  crossCheckStatus: string;
  errors: any[];
  checkedLines: number;
}

export const babsClient = {
  async getDashboard(): Promise<{ data: BaBsDashboardStats }> {
    return apiClient.get("/api/v1/babs/dashboard");
  },

  async generateForm(input: {
    clientCompanyId: string;
    formType: "BA" | "BS";
    period: string;
  }): Promise<{ data: BaBsForm }> {
    return apiClient.post("/api/v1/babs/generate", input);
  },

  async listForms(params?: {
    clientCompanyId?: string;
    formType?: string;
    period?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: { forms: BaBsForm[]; pagination: any } }> {
    return apiClient.get("/api/v1/babs/forms", { params });
  },

  async getForm(id: string): Promise<{ data: BaBsForm }> {
    return apiClient.get(`/api/v1/babs/forms/${id}`);
  },

  async updateFormStatus(
    id: string,
    status: string,
    notes?: string
  ): Promise<{ data: BaBsForm }> {
    return apiClient.patch(`/api/v1/babs/forms/${id}/status`, { status, notes });
  },

  async crossCheck(id: string): Promise<{ data: CrossCheckResult }> {
    return apiClient.post(`/api/v1/babs/forms/${id}/cross-check`);
  },
};
