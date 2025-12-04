export type RiskSeverity = "low" | "medium" | "high" | "critical";
export interface RiskFlag {
    code: string;
    severity: RiskSeverity;
    description: string;
    value?: boolean | string | number;
}
export interface RiskFeatureMap {
    hasMissingFields?: boolean;
    amountMismatch?: boolean;
    dateInconsistency?: boolean;
    negativeAmount?: boolean;
    duplicateInvoiceNumber?: boolean;
    highAmount?: boolean;
    [key: string]: boolean | number | string | undefined;
}
export interface DocumentRiskFeatures {
    id: string;
    tenantId: string;
    documentId: string;
    features: RiskFeatureMap;
    riskFlags: RiskFlag[];
    riskScore: number | null;
    generatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateDocumentRiskFeaturesInput {
    tenantId: string;
    documentId: string;
    features: RiskFeatureMap;
    riskFlags: RiskFlag[];
    riskScore?: number | null;
    generatedAt?: Date;
}
//# sourceMappingURL=document-risk-features.d.ts.map