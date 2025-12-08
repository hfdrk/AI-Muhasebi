export interface AnomalyFlag {
    type: "EXPENSE_SPIKE" | "LARGE_TRANSACTION" | "UNUSUAL_ACCOUNT";
    description: string;
    severity: "low" | "medium" | "high";
    value: number;
    threshold: number;
    accountCode?: string;
    accountName?: string;
}
export interface AnomalyDetectionResult {
    anomalies: AnomalyFlag[];
    hasAnomalies: boolean;
}
export declare class AnomalyDetectorService {
    private readonly ANOMALY_THRESHOLD_FACTOR;
    /**
     * Detect anomalies for a client company
     */
    detectAnomalies(tenantId: string, clientCompanyId: string): Promise<AnomalyDetectionResult>;
    /**
     * Group transactions by month and account
     */
    private groupByMonthAndAccount;
    /**
     * Calculate average transaction amount
     */
    private calculateAverageTransactionAmount;
    /**
     * Get common accounts (accounts used in at least 50% of historical months)
     */
    private getCommonAccounts;
    /**
     * Determine anomaly severity based on how much it exceeds threshold
     */
    private determineAnomalySeverity;
}
export declare const anomalyDetectorService: AnomalyDetectorService;
//# sourceMappingURL=anomaly-detector-service.d.ts.map