export type IntegrationSyncLogLevel = "info" | "warning" | "error";

export interface IntegrationSyncLog {
  id: string;
  tenantId: string;
  tenantIntegrationId: string;
  level: IntegrationSyncLogLevel;
  message: string;
  context: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CreateIntegrationSyncLogInput {
  tenantIntegrationId: string;
  level: IntegrationSyncLogLevel;
  message: string;
  context?: Record<string, unknown> | null;
}



