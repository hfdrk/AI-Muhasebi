import { apiClient } from "../api-client";

export interface TenantUserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export const tenantUsersClient = {
  async listUsers(tenantId: string): Promise<{ data: TenantUserInfo[] }> {
    return apiClient.get(`/api/v1/tenants/${tenantId}/users`);
  },
  async inviteUser(tenantId: string, input: { email: string; role: string; name?: string }): Promise<{ data: any }> {
    return apiClient.post(`/api/v1/tenants/${tenantId}/users/invite`, input);
  },
  async acceptInvitation(tenantId: string, userId: string): Promise<{ data: any }> {
    return apiClient.post(`/api/v1/tenants/${tenantId}/users/${userId}/accept-invitation`, {});
  },
  async changeRole(tenantId: string, userId: string, role: string): Promise<{ data: any }> {
    return apiClient.patch(`/api/v1/tenants/${tenantId}/users/${userId}/role`, { role });
  },
  async updateStatus(tenantId: string, userId: string, status: string): Promise<{ data: any }> {
    return apiClient.patch(`/api/v1/tenants/${tenantId}/users/${userId}/status`, { status });
  },
};
