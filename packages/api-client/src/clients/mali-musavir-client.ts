import { apiClient } from "../api-client";

export interface MaliMusavirDashboard {
  profile: MaliMusavirProfile | null;
  clientCount: number;
  masak: { total: number; pending: number; overdue: number };
  kurgan: { total: number; newSignals: number; critical: number };
  babs: { total: number; draft: number; mismatched: number };
  beyanname: { total: number; draft: number; overdue: number };
  upcomingDeadlines: MaliMusavirDeadline[];
}

export interface MaliMusavirProfile {
  id: string;
  tenantId: string;
  licenseType: string;
  licenseNumber: string;
  turmobNumber?: string;
  chamberName?: string;
  specializations: string[];
  insuranceProvider?: string;
  insuranceAmount?: number;
  insuranceExpiry?: string;
  insurancePolicyNo?: string;
  cpdHoursCompleted: number;
  cpdPeriodStart?: string;
  masakTrainingDate?: string;
  totalActiveClients: number;
  createdAt: string;
  updatedAt: string;
}

export interface MaliMusavirDeadline {
  type: "masak" | "beyanname";
  id: string;
  clientCompanyName: string;
  description: string;
  dueDate: string;
}

export interface MaliMusavirProfileInput {
  licenseType: "SMMM" | "YMM";
  licenseNumber: string;
  turmobNumber?: string;
  chamberName?: string;
  specializations?: string[];
  insuranceProvider?: string;
  insuranceAmount?: number;
  insuranceExpiry?: string;
  insurancePolicyNo?: string;
}

export const maliMusavirClient = {
  async getDashboard(): Promise<{ data: MaliMusavirDashboard }> {
    return apiClient.get("/api/v1/mali-musavir/dashboard");
  },

  async getProfile(): Promise<{ data: MaliMusavirProfile | null }> {
    return apiClient.get("/api/v1/mali-musavir/profile");
  },

  async upsertProfile(input: MaliMusavirProfileInput): Promise<{ data: MaliMusavirProfile }> {
    return apiClient.put("/api/v1/mali-musavir/profile", input);
  },

  async updateCpdHours(hours: number): Promise<{ data: MaliMusavirProfile }> {
    return apiClient.patch("/api/v1/mali-musavir/cpd-hours", { hours });
  },

  async updateMasakTraining(trainingDate: string): Promise<{ data: MaliMusavirProfile }> {
    return apiClient.patch("/api/v1/mali-musavir/masak-training", { trainingDate });
  },
};
