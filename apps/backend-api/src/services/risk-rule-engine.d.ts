import type { DocumentRiskScore, ClientCompanyRiskScore } from "@repo/core-domain";
import type { DocumentRiskFeatures } from "@repo/core-domain";
export interface DocumentEvaluationContext {
    riskFeatures: DocumentRiskFeatures;
    invoice?: any;
    transaction?: any;
}
export interface CompanyEvaluationContext {
    documentRiskScores: DocumentRiskScore[];
    highRiskDocumentCount: number;
    totalInvoiceCount: number;
    highRiskInvoiceCount: number;
    duplicateInvoiceNumbers: string[];
}
export declare class RiskRuleEngine {
    /**
     * Evaluate risk for a document
     */
    evaluateDocument(tenantId: string, documentId: string, riskFeatures?: DocumentRiskFeatures): Promise<DocumentRiskScore>;
    /**
     * Evaluate risk for a client company
     */
    evaluateClientCompany(tenantId: string, clientCompanyId: string): Promise<ClientCompanyRiskScore>;
    /**
     * Evaluate a document rule condition
     */
    private evaluateRuleCondition;
    /**
     * Evaluate a company rule condition
     */
    private evaluateCompanyRuleCondition;
    /**
     * Build company evaluation context
     */
    private buildCompanyContext;
    /**
     * Map score to severity
     */
    private mapScoreToSeverity;
    private mapToDocumentRiskScore;
    private mapToClientCompanyRiskScore;
}
export declare const riskRuleEngine: RiskRuleEngine;
//# sourceMappingURL=risk-rule-engine.d.ts.map