export declare enum SubscriptionPlan {
    FREE = "FREE",
    PRO = "PRO",
    ENTERPRISE = "ENTERPRISE"
}
export declare enum SubscriptionStatus {
    ACTIVE = "ACTIVE",
    PAST_DUE = "PAST_DUE",
    CANCELLED = "CANCELLED"
}
export declare enum UsageMetricType {
    CLIENT_COMPANIES = "CLIENT_COMPANIES",
    DOCUMENTS = "DOCUMENTS",
    AI_ANALYSES = "AI_ANALYSES",
    USERS = "USERS",
    SCHEDULED_REPORTS = "SCHEDULED_REPORTS"
}
export interface TenantSubscription {
    id: string;
    tenantId: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    validUntil: Date | null;
    trialUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateTenantSubscriptionInput {
    tenantId: string;
    plan: SubscriptionPlan;
    status?: SubscriptionStatus;
    validUntil?: Date | null;
    trialUntil?: Date | null;
}
export interface UpdateTenantSubscriptionInput {
    plan?: SubscriptionPlan;
    status?: SubscriptionStatus;
    validUntil?: Date | null;
    trialUntil?: Date | null;
}
export interface TenantUsage {
    id: string;
    tenantId: string;
    metric: UsageMetricType;
    periodStart: Date;
    periodEnd: Date;
    value: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateTenantUsageInput {
    tenantId: string;
    metric: UsageMetricType;
    periodStart: Date;
    periodEnd: Date;
    value: number;
}
export interface UpdateTenantUsageInput {
    value: number;
}
export interface PlanConfig {
    maxClientCompanies: number;
    maxDocumentsPerMonth: number;
    maxAiAnalysesPerMonth: number;
    maxUsers: number;
    maxScheduledReports: number;
}
export interface UsageSummary {
    clientCompanies: {
        used: number;
        limit: number;
        remaining: number;
    };
    documents: {
        used: number;
        limit: number;
        remaining: number;
    };
    aiAnalyses: {
        used: number;
        limit: number;
        remaining: number;
    };
    users: {
        used: number;
        limit: number;
        remaining: number;
    };
    scheduledReports: {
        used: number;
        limit: number;
        remaining: number;
    };
}
export interface LimitCheckResult {
    allowed: boolean;
    remaining: number;
    limit: number;
}
//# sourceMappingURL=subscription.d.ts.map