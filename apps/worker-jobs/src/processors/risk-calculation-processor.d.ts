import type { RiskCalculationJobPayload } from "../jobs/risk-calculation-job";
export declare class RiskCalculationProcessor {
    /**
     * Process company risk calculation
     */
    processCompanyRiskCalculation(tenantId: string, clientCompanyId: string): Promise<void>;
    /**
     * Process document risk calculation
     */
    processDocumentRiskCalculation(tenantId: string, documentId: string): Promise<void>;
    /**
     * Process risk calculation job
     */
    processRiskCalculationJob(payload: RiskCalculationJobPayload): Promise<void>;
}
export declare const riskCalculationProcessor: RiskCalculationProcessor;
//# sourceMappingURL=risk-calculation-processor.d.ts.map