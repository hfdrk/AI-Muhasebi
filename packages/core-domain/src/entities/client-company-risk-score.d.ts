import type { RiskSeverity } from "../types/risk-severity";
export type { RiskSeverity };
export interface ClientCompanyRiskScore {
    id: string;
    tenantId: string;
    clientCompanyId: string;
    score: number;
    severity: RiskSeverity;
    triggeredRuleCodes: string[];
    generatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateClientCompanyRiskScoreInput {
    tenantId: string;
    clientCompanyId: string;
    score: number;
    severity: RiskSeverity;
    triggeredRuleCodes: string[];
    generatedAt?: Date;
}
//# sourceMappingURL=client-company-risk-score.d.ts.map