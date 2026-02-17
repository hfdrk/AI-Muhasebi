import { apiClient } from "../api-client";

export interface MasakRedFlagReport {
  clientCompanyId: string;
  riskLevel: string;
  flags: MasakRedFlag[];
  summary: string;
  assessedAt: string;
}

export interface MasakRedFlag {
  type: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  details?: any;
}

export const masakRedFlagClient = {
  async assess(clientCompanyId: string): Promise<{ data: MasakRedFlagReport }> {
    return apiClient.get(`/api/v1/masak-red-flags/${clientCompanyId}`);
  },
};
