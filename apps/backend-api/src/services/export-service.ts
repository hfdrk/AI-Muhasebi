import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import type { BaseReportResult } from "./reporting-service";

/**
 * Export Service for converting report results to downloadable formats
 * 
 * Supports:
 * - PDF export with PDFKit
 * - Excel export with ExcelJS (.xlsx format)
 * 
 * Future enhancements:
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
   * Export report result to Excel format (.xlsx)
   * 
   * @param reportResult - The report result to export (from ReportingService)
   * @returns Promise resolving to Buffer containing Excel data
   * @throws Error if Excel generation fails
   * 
   * @example
   * ```typescript
   * const excelBuffer = await exportService.exportToExcel(reportResult);
   * // Use excelBuffer as file download or attachment
   * ```
   */
  async exportToExcel(reportResult: BaseReportResult): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Rapor");

      // Set column widths
      worksheet.columns = [];

      // Title row
      const titleRow = worksheet.addRow([reportResult.title]);
      titleRow.font = { size: 16, bold: true };
      titleRow.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(1, 1, 1, 10); // Merge cells for title
      worksheet.addRow([]); // Empty row

      // Metadata rows
      worksheet.addRow([
        "Dönem:",
        `${this.formatDate(reportResult.period.start_date)} - ${this.formatDate(reportResult.period.end_date)}`,
      ]);
      worksheet.addRow([
        "Oluşturulma:",
        this.formatDateTime(reportResult.generated_at),
      ]);
      worksheet.addRow([]); // Empty row

      // Table of rows
      if (reportResult.rows && reportResult.rows.length > 0) {
        // Extract headers from first row
        const headers = Object.keys(reportResult.rows[0]);

        // Header row
        const headerRow = worksheet.addRow(headers.map((h) => this.formatHeader(h)));
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
        headerRow.alignment = { horizontal: "center", vertical: "middle" };

        // Set column widths based on headers
        headers.forEach((header, index) => {
          worksheet.getColumn(index + 1).width = Math.max(header.length, 15);
        });

        // Data rows
        for (const row of reportResult.rows) {
          const values = headers.map((header) => {
            const value = row[header as keyof typeof row];
            // Handle different value types
            if (value === null || value === undefined) {
              return "";
            }
            if (typeof value === "number") {
              return value;
            }
            if (typeof value === "boolean") {
              return value ? "Evet" : "Hayır";
            }
            if (value instanceof Date) {
              return value.toLocaleDateString("tr-TR");
            }
            return String(value);
          });
          worksheet.addRow(values);
        }

        worksheet.addRow([]); // Empty row
      }

      // Totals section
      if (reportResult.totals) {
        const totalsRow = worksheet.addRow(["Toplamlar"]);
        totalsRow.font = { bold: true };
        totalsRow.alignment = { horizontal: "left", vertical: "middle" };

        const totalsObj = reportResult.totals as Record<string, any>;
        for (const [key, value] of Object.entries(totalsObj)) {
          if (value !== null && value !== undefined) {
            if (typeof value === "object" && !Array.isArray(value)) {
              // Nested object - flatten
              for (const [nestedKey, nestedValue] of Object.entries(value)) {
                worksheet.addRow([
                  `${this.formatHeader(key)} - ${this.formatHeader(nestedKey)}`,
                  nestedValue,
                ]);
              }
            } else if (Array.isArray(value)) {
              worksheet.addRow([this.formatHeader(key), value.join(", ")]);
            } else {
              worksheet.addRow([this.formatHeader(key), value]);
            }
          }
        }
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error: any) {
      throw new Error(`Excel export failed: ${error.message || "Unknown error"}`);
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

}

export const exportService = new ExportService();

