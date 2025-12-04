export type RiskSeverity = "low" | "medium" | "high";
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