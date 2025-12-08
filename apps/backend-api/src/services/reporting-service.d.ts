export interface ReportPeriod {
    start_date: string;
    end_date: string;
}
export interface BaseReportResult<Row = any, Totals = any> {
    title: string;
    period: ReportPeriod;
    generated_at: string;
    rows: Row[];
    totals?: Totals;
    meta?: {
        row_count: number;
        row_limit_applied: boolean;
    };
}
export declare class ReportingService {
    /**
     * Validate that a client company belongs to the given tenant
     */
    private validateClientCompany;
    /**
     * Generate financial summary report for a client company
     *
     * @param tenantId - The tenant ID to scope the report
     * @param clientCompanyId - The client company ID to generate the report for
     * @param filters - Date range filters with start_date and end_date (ISO date strings)
     * @returns Promise resolving to BaseReportResult with financial summary data
     * @throws NotFoundError if client company is not found or doesn't belong to tenant
     *
     * @example
     * ```typescript
     * const result = await reportingService.generateCompanyFinancialSummary(
     *   tenantId,
     *   companyId,
     *   { start_date: "2024-01-01T00:00:00Z", end_date: "2024-12-31T23:59:59Z" }
     * );
     * ```
     */
    generateCompanyFinancialSummary(tenantId: string, clientCompanyId: string, filters: {
        start_date: string;
        end_date: string;
        limit?: number;
    }): Promise<BaseReportResult>;
    /**
     * Generate risk summary report for a client company
     *
     * @param tenantId - The tenant ID to scope the report
     * @param clientCompanyId - The client company ID to generate the report for
     * @param filters - Date range filters with start_date and end_date (ISO date strings)
     * @returns Promise resolving to BaseReportResult with risk summary data including latest risk score, high-risk documents, and open alerts
     * @throws NotFoundError if client company is not found or doesn't belong to tenant
     */
    generateCompanyRiskSummary(tenantId: string, clientCompanyId: string, filters: {
        start_date: string;
        end_date: string;
        limit?: number;
    }): Promise<BaseReportResult>;
    /**
     * Generate portfolio report for all companies in a tenant
     *
     * @param tenantId - The tenant ID to scope the report
     * @param filters - Date range filters with start_date and end_date (ISO date strings)
     * @returns Promise resolving to BaseReportResult with portfolio data including all companies with their risk scores, document counts, and alerts
     */
    generateTenantPortfolioReport(tenantId: string, filters: {
        start_date: string;
        end_date: string;
        limit?: number;
    }): Promise<BaseReportResult>;
    /**
     * Generate document activity report
     *
     * @param tenantId - The tenant ID to scope the report
     * @param clientCompanyId - Optional client company ID to filter by company, or null for all companies
     * @param filters - Date range filters with start_date and end_date (ISO date strings)
     * @returns Promise resolving to BaseReportResult with document activity data including documents by type, processing status, and invoice statistics
     * @throws NotFoundError if clientCompanyId is provided but company is not found or doesn't belong to tenant
     */
    generateDocumentActivityReport(tenantId: string, clientCompanyId: string | null, filters: {
        start_date: string;
        end_date: string;
        limit?: number;
    }): Promise<BaseReportResult>;
}
export declare const reportingService: ReportingService;
//# sourceMappingURL=reporting-service.d.ts.map