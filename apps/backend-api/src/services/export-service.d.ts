import type { BaseReportResult } from "./reporting-service";
/**
 * Export Service for converting report results to downloadable formats
 *
 * Supported formats:
 * - PDF: Generated via pdfkit with Turkish character support
 * - Excel: Currently exports as CSV; upgrade to exceljs for .xlsx if needed
 */
export declare class ExportService {
    /**
     * Export report result to PDF format
     *
     * @param reportResult - The report result to export (from ReportingService)
     * @returns Promise resolving to Buffer containing PDF data
     * @throws Error if PDF generation fails
     *
     * @example
     * ```typescript
     * const pdfBuffer = await exportService.exportToPdf(reportResult);
     * // Use pdfBuffer as file download or attachment
     * ```
     */
    exportToPdf(reportResult: BaseReportResult): Promise<Buffer>;
    /**
     * Export report result to Excel format (CSV)
     *
     * @param reportResult - The report result to export (from ReportingService)
     * @returns Promise resolving to Buffer containing CSV data
     * @throws Error if CSV generation fails
     *
     * @example
     * ```typescript
     * const csvBuffer = await exportService.exportToExcel(reportResult);
     * // Use csvBuffer as file download or attachment
     * ```
     */
    exportToExcel(reportResult: BaseReportResult): Promise<Buffer>;
    /**
     * Format date for display (YYYY-MM-DD)
     */
    private formatDate;
    /**
     * Format datetime for display
     */
    private formatDateTime;
    /**
     * Format header (convert snake_case to Title Case)
     */
    private formatHeader;
    /**
     * Escape CSV value (handle quotes and commas)
     */
    private escapeCsvValue;
}
export declare const exportService: ExportService;
//# sourceMappingURL=export-service.d.ts.map