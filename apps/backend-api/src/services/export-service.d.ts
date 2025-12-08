import type { BaseReportResult } from "./reporting-service";
/**
 * Export Service for converting report results to downloadable formats
 *
 * TODO: Consider adding support for:
 * - Real Excel library (exceljs) for proper .xlsx format
 * - Report template customization
 * - Branded PDF templates with company logos
 * - Multi-language support for report headers
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
     * Export report result to Excel format (currently CSV for MVP)
     *
     * TODO: Replace with real Excel library (e.g., exceljs) for proper .xlsx format support
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