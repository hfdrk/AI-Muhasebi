export type RiskRuleScope = "document" | "company";

export type RiskSeverity = "low" | "medium" | "high";

export interface RiskRule {
  id: string;
  tenantId: string | null;
  scope: RiskRuleScope;
  code: string;
  description: string;
  weight: number;
  isActive: boolean;
  defaultSeverity: RiskSeverity;
  config: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRiskRuleInput {
  tenantId?: string | null;
  scope: RiskRuleScope;
  code: string;
  description: string;
  weight: number;
  isActive?: boolean;
  defaultSeverity: RiskSeverity;
  config?: Record<string, unknown> | null;
}

export interface UpdateRiskRuleInput {
  description?: string;
  weight?: number;
  isActive?: boolean;
  defaultSeverity?: RiskSeverity;
  config?: Record<string, unknown> | null;
}

