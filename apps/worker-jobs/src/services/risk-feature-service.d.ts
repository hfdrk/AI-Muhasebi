import type { ParsedDocumentResult, RiskFeatureMap, RiskFlag } from "@repo/core-domain";
/**
 * Risk Feature Service
 *
 * Generates risk features and flags from parsed document data.
 * These features will be used for anomaly detection and risk scoring.
 */
export interface RiskFeaturesResult {
    features: RiskFeatureMap;
    riskFlags: RiskFlag[];
    riskScore: number | null;
}
export declare class RiskFeatureService {
    /**
     * Generate risk features from parsed document data
     * @param parsedData - Parsed document data
     * @param documentId - Document ID
     * @param tenantId - Tenant ID for duplicate checking
     * @returns Promise resolving to risk features
     */
    generateRiskFeatures(parsedData: ParsedDocumentResult, documentId: string, tenantId: string): Promise<RiskFeaturesResult>;
    private checkInvoiceRisks;
    private checkBankStatementRisks;
    private checkDuplicateInvoiceNumber;
    private parseTurkishDate;
    private calculateRiskScore;
}
export declare const riskFeatureService: RiskFeatureService;
//# sourceMappingURL=risk-feature-service.d.ts.map