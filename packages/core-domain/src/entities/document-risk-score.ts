import type { RiskSeverity } from "../types/risk-severity";
export type { RiskSeverity };

export interface DocumentRiskScore {
  id: string;
  tenantId: string;
  documentId: string;
  score: number; // 0-100
  severity: RiskSeverity;
  triggeredRuleCodes: string[];
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentRiskScoreInput {
  tenantId: string;
  documentId: string;
  score: number;
  severity: RiskSeverity;
  triggeredRuleCodes: string[];
  generatedAt?: Date;
}




