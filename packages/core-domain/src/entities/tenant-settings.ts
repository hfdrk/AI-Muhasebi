export interface RiskThresholds {
  high: number;
  critical: number;
}

export type DefaultReportPeriod =
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_YEAR"
  | "LAST_YEAR";

export interface TenantSettings {
  id: string;
  tenantId: string;
  displayName: string | null;
  logoUrl: string | null;
  locale: string;
  timezone: string;
  emailFromName: string | null;
  riskThresholds: RiskThresholds;
  defaultReportPeriod: DefaultReportPeriod;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateTenantSettingsInput {
  displayName?: string | null;
  logoUrl?: string | null;
  locale?: string;
  timezone?: string;
  emailFromName?: string | null;
  riskThresholds?: RiskThresholds;
  defaultReportPeriod?: DefaultReportPeriod;
}


