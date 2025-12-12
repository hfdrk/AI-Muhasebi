export type RiskAlertType = "RISK_THRESHOLD_EXCEEDED" | "ANOMALY_DETECTED";
export type RiskAlertSeverity = "low" | "medium" | "high" | "critical";
export type RiskAlertStatus = "open" | "in_progress" | "closed" | "ignored";

export interface RiskAlert {
  id: string;
  tenantId: string;
  clientCompanyId: string | null;
  documentId: string | null;
  type: RiskAlertType;
  title: string;
  message: string;
  severity: RiskAlertSeverity;
  status: RiskAlertStatus;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRiskAlertInput {
  tenantId: string;
  clientCompanyId?: string | null;
  documentId?: string | null;
  type: RiskAlertType;
  title: string;
  message: string;
  severity: RiskAlertSeverity;
  status?: RiskAlertStatus;
}

export interface UpdateRiskAlertInput {
  status?: RiskAlertStatus;
  resolvedByUserId?: string | null;
}







