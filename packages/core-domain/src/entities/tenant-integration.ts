export type TenantIntegrationStatus = "disconnected" | "connected" | "error";
export type SyncStatus = "success" | "error" | "in_progress" | null;

export interface TenantIntegration {
  id: string;
  tenantId: string;
  clientCompanyId: string | null;
  providerId: string;
  status: TenantIntegrationStatus;
  displayName: string;
  config: Record<string, unknown>;
  lastSyncAt: Date | null;
  lastSyncStatus: SyncStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantIntegrationInput {
  clientCompanyId?: string | null;
  providerId: string;
  displayName?: string;
  config: Record<string, unknown>;
}

export interface UpdateTenantIntegrationInput {
  displayName?: string;
  config?: Record<string, unknown>;
}








