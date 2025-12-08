import type { RiskAlert, CreateRiskAlertInput, RiskAlertStatus } from "@repo/core-domain";
export declare class RiskAlertService {
    private mapToRiskAlert;
    /**
     * Create a new risk alert
     */
    createAlert(input: CreateRiskAlertInput): Promise<RiskAlert>;
    /**
     * List risk alerts with filters
     */
    listAlerts(tenantId: string, filters?: {
        clientCompanyId?: string;
        severity?: string;
        status?: RiskAlertStatus;
        dateFrom?: Date;
        dateTo?: Date;
        page?: number;
        pageSize?: number;
    }): Promise<{
        data: RiskAlert[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    /**
     * Update alert status
     */
    updateAlertStatus(tenantId: string, alertId: string, status: RiskAlertStatus, userId: string): Promise<RiskAlert>;
}
export declare const riskAlertService: RiskAlertService;
//# sourceMappingURL=risk-alert-service.d.ts.map