import { apiClient } from "../api-client";

export const mobileClient = {
  async getDashboard(): Promise<{ data: any }> {
    return apiClient.get("/api/v1/mobile/dashboard");
  },
};
