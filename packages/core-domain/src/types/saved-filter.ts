export const SAVED_FILTER_TARGETS = {
  CLIENT_COMPANIES: "CLIENT_COMPANIES",
  INVOICES: "INVOICES",
  DOCUMENTS: "DOCUMENTS",
  RISK_ALERTS: "RISK_ALERTS",
  REPORTS: "REPORTS",
} as const;

export type SavedFilterTarget = typeof SAVED_FILTER_TARGETS[keyof typeof SAVED_FILTER_TARGETS];

export interface SavedFilter {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  target: SavedFilterTarget;
  filters: Record<string, any>;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

