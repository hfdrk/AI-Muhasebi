export const RISK_CALCULATION_JOB_TYPE = "RISK_CALCULATION";

export interface RiskCalculationJobPayload {
  tenantId: string;
  clientCompanyId?: string; // Optional: if provided, only calculate for this company
}



