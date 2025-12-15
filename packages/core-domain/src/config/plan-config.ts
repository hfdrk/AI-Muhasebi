import type { PlanConfig } from "../entities/subscription";
import { SubscriptionPlan } from "../entities/subscription";

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  [SubscriptionPlan.FREE]: {
    maxClientCompanies: 3,
    maxDocumentsPerMonth: 100,
    maxAiAnalysesPerMonth: 50,
    maxUsers: 3,
    maxScheduledReports: 1,
  },
  [SubscriptionPlan.PRO]: {
    maxClientCompanies: 50,
    maxDocumentsPerMonth: 1000,
    maxAiAnalysesPerMonth: 500,
    maxUsers: 20,
    maxScheduledReports: 10,
  },
  [SubscriptionPlan.ENTERPRISE]: {
    maxClientCompanies: 10000,
    maxDocumentsPerMonth: 100000,
    maxAiAnalysesPerMonth: 50000,
    maxUsers: 1000,
    maxScheduledReports: 1000,
  },
};

export function getPlanConfig(plan: SubscriptionPlan): PlanConfig {
  return PLAN_CONFIGS[plan];
}





