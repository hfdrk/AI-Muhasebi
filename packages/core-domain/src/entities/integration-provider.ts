export type IntegrationProviderType = "accounting" | "bank";

export interface IntegrationProvider {
  id: string;
  type: IntegrationProviderType;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  configSchema: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIntegrationProviderInput {
  type: IntegrationProviderType;
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  configSchema?: Record<string, unknown> | null;
}

export interface UpdateIntegrationProviderInput {
  type?: IntegrationProviderType;
  code?: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
  configSchema?: Record<string, unknown> | null;
}







