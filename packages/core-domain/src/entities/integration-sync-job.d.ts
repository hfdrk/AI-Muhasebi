export type IntegrationSyncJobType = "pull_invoices" | "pull_bank_transactions";
export type IntegrationSyncJobStatus = "pending" | "in_progress" | "success" | "failed";
export interface IntegrationSyncJob {
    id: string;
    tenantId: string;
    clientCompanyId: string | null;
    tenantIntegrationId: string;
    jobType: IntegrationSyncJobType;
    status: IntegrationSyncJobStatus;
    startedAt: Date | null;
    finishedAt: Date | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateIntegrationSyncJobInput {
    tenantIntegrationId: string;
    jobType: IntegrationSyncJobType;
    clientCompanyId?: string | null;
}
//# sourceMappingURL=integration-sync-job.d.ts.map