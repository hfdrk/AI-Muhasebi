export type RiskRuleScope = "document" | "company";
import type { RiskSeverity } from "../types/risk-severity";
export type { RiskSeverity };
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
//# sourceMappingURL=risk-rule.d.ts.map