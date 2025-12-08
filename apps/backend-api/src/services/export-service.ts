import PDFDocument from "pdfkit";
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
export class ExportService {
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
  async exportToPdf(reportResult: BaseReportResult): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", (error) => reject(new Error(`PDF generation failed: ${error.message}`)));

        // Title
        doc.fontSize(16).text(reportResult.title, { align: "center" });
        doc.moveDown();

        // Period and generated at
        doc.fontSize(10);
        doc.text(`Dönem: ${this.formatDate(reportResult.period.start_date)} - ${this.formatDate(reportResult.period.end_date)}`);
        doc.text(`Oluşturulma: ${this.formatDateTime(reportResult.generated_at)}`);
        doc.moveDown();

        // Table of rows
        if (reportResult.rows && reportResult.rows.length > 0) {
          doc.fontSize(12).text("Detaylar", { underline: true });
          doc.moveDown(0.5);

          // Extract column headers from first row
          const firstRow = reportResult.rows[0];
          const headers = Object.keys(firstRow);
          const columnWidth = (doc.page.width - 100) / headers.length;

          // Header row
          doc.fontSize(10).font("Helvetica-Bold");
          let x = 50;
          for (const header of headers) {
            doc.text(this.formatHeader(header), x, doc.y, {
              width: columnWidth,
              align: "left",
            });
            x += columnWidth;
          }
          doc.moveDown();

          // Data rows
          doc.font("Helvetica");
          for (const row of reportResult.rows) {
            x = 50;
            for (const header of headers) {
              const value = row[header as keyof typeof row];
              doc.text(String(value ?? ""), x, doc.y, {
                width: columnWidth,
                align: "left",
              });
              x += columnWidth;
            }
            doc.moveDown();

            // Add new page if needed
            if (doc.y > doc.page.height - 50) {
              doc.addPage();
            }
          }
          doc.moveDown();
        }

        // Totals section
        if (reportResult.totals) {
          doc.fontSize(12).font("Helvetica-Bold").text("Toplamlar", { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10).font("Helvetica");

          const totalsObj = reportResult.totals as Record<string, any>;
          for (const [key, value] of Object.entries(totalsObj)) {
            if (value !== null && value !== undefined) {
              if (typeof value === "object" && !Array.isArray(value)) {
                // Nested object
                doc.text(`${this.formatHeader(key)}:`, { continued: false });
                for (const [nestedKey, nestedValue] of Object.entries(value)) {
                  doc.text(`  ${this.formatHeader(nestedKey)}: ${nestedValue}`, { indent: 20 });
                }
              } else if (Array.isArray(value)) {
                doc.text(`${this.formatHeader(key)}: ${value.join(", ")}`);
              } else {
                doc.text(`${this.formatHeader(key)}: ${value}`);
              }
            }
          }
        }

        doc.end();
      } catch (error: any) {
        reject(new Error(`PDF export failed: ${error.message || "Unknown error"}`));
      }
    });
  }

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
  async exportToExcel(reportResult: BaseReportResult): Promise<Buffer> {
    try {
      const lines: string[] = [];

      // Title and metadata
      lines.push(`"${reportResult.title}"`);
      lines.push(`"Dönem","${this.formatDate(reportResult.period.start_date)}","${this.formatDate(reportResult.period.end_date)}"`);
      lines.push(`"Oluşturulma","${this.formatDateTime(reportResult.generated_at)}"`);
      lines.push(""); // Empty line

      // Table of rows
      if (reportResult.rows && reportResult.rows.length > 0) {
        // Extract headers from first row
        const headers = Object.keys(reportResult.rows[0]);
        
        // Header row
        lines.push(headers.map((h) => this.escapeCsvValue(this.formatHeader(h))).join(","));

        // Data rows
        for (const row of reportResult.rows) {
          const values = headers.map((header) => {
            const value = row[header as keyof typeof row];
            return this.escapeCsvValue(value !== null && value !== undefined ? String(value) : "");
          });
          lines.push(values.join(","));
        }
        lines.push(""); // Empty line
      }

      // Totals section
      if (reportResult.totals) {
        lines.push('"Toplamlar"');
        const totalsObj = reportResult.totals as Record<string, any>;
        for (const [key, value] of Object.entries(totalsObj)) {
          if (value !== null && value !== undefined) {
            if (typeof value === "object" && !Array.isArray(value)) {
              // Nested object - flatten
              for (const [nestedKey, nestedValue] of Object.entries(value)) {
                lines.push(`"${this.formatHeader(key)} - ${this.formatHeader(nestedKey)}","${nestedValue}"`);
              }
            } else if (Array.isArray(value)) {
              lines.push(`"${this.formatHeader(key)}","${value.join(", ")}"`);
            } else {
              lines.push(`"${this.formatHeader(key)}","${value}"`);
            }
          }
        }
      }

      const csvContent = lines.join("\n");
      return Buffer.from(csvContent, "utf-8");
    } catch (error: any) {
      throw new Error(`CSV export failed: ${error.message || "Unknown error"}`);
    }
  }

  /**
   * Format date for display (YYYY-MM-DD)
   */
  private formatDate(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toISOString().split("T")[0];
    } catch {
      return isoString;
    }
  }

  /**
   * Format datetime for display
   */
  private formatDateTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("tr-TR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  }

  /**
   * Format header (convert snake_case to Title Case)
   */
  private formatHeader(key: string): string {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Escape CSV value (handle quotes and commas)
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

export const exportService = new ExportService();

