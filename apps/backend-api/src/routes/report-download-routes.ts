import { Router } from "express";
import { z } from "zod";
import type { NextFunction } from "express";
import { ValidationError } from "@repo/shared-utils";
import { reportingService } from "../services/reporting-service";
import { exportService } from "../services/export-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import { getConfig } from "@repo/config";
import type { AuthenticatedRequest, Response } from "../types/request-context";

const router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

const downloadReportSchema = z.object({
  report_code: z.string().min(1, "Rapor kodu gerekli."),
  client_company_id: z.string().optional().nullable(),
  filters: z.object({
    start_date: z.string().datetime("Geçerli bir başlangıç tarihi giriniz."),
    end_date: z.string().datetime("Geçerli bir bitiş tarihi giriniz."),
    limit: z.number().int().min(1).max(1000).optional(),
  }),
  format: z.enum(["pdf", "excel"], {
    errorMap: () => ({ message: "Format 'pdf' veya 'excel' olmalıdır." }),
  }),
});

/**
 * Validate date filters
 */
function validateDateFilters(filters: { start_date: string; end_date: string }): void {
  if (!filters.start_date || !filters.end_date) {
    throw new ValidationError("Başlangıç ve bitiş tarihleri zorunludur.");
  }

  const startDate = new Date(filters.start_date);
  const endDate = new Date(filters.end_date);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new ValidationError("Geçerli tarih formatı giriniz.");
  }

  if (startDate > endDate) {
    throw new ValidationError("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
  }

  // Check if date range is > 5 years (1825 days)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 1825) {
    throw new ValidationError("Tarih aralığı çok geniş. Lütfen daha dar bir aralık seçin.");
  }
}

// POST /api/v1/reports/download
router.post(
  "/download",
  requirePermission("reports:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = downloadReportSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;

      // Validate date filters
      validateDateFilters(body.filters);

      // Generate report using ReportingService
      let reportResult;

      switch (body.report_code) {
        case "COMPANY_FINANCIAL_SUMMARY":
          if (!body.client_company_id) {
            throw new ValidationError("Bu rapor için müşteri şirket seçilmesi zorunludur.");
          }
          reportResult = await reportingService.generateCompanyFinancialSummary(
            tenantId,
            body.client_company_id,
            body.filters
          );
          break;

        case "COMPANY_RISK_SUMMARY":
          if (!body.client_company_id) {
            throw new ValidationError("Bu rapor için müşteri şirket seçilmesi zorunludur.");
          }
          reportResult = await reportingService.generateCompanyRiskSummary(
            tenantId,
            body.client_company_id,
            body.filters
          );
          break;

        case "TENANT_PORTFOLIO":
          reportResult = await reportingService.generateTenantPortfolioReport(
            tenantId,
            body.filters
          );
          break;

        case "DOCUMENT_ACTIVITY":
          reportResult = await reportingService.generateDocumentActivityReport(
            tenantId,
            body.client_company_id || null,
            body.filters
          );
          break;

        default:
          throw new ValidationError("Geçersiz rapor türü.");
      }

      // Check feature flags for export formats
      const config = getConfig();
      if (body.format === "pdf" && !config.PDF_EXPORT_ENABLED) {
        return res.status(503).json({
          error: {
            message: "Bu dışa aktarma formatı şu anda devre dışı.",
          },
        });
      }
      if (body.format === "excel" && !config.EXCEL_EXPORT_ENABLED) {
        return res.status(503).json({
          error: {
            message: "Bu dışa aktarma formatı şu anda devre dışı.",
          },
        });
      }

      // Export based on format
      let buffer: Buffer;
      let contentType: string;
      let fileExtension: string;

      if (body.format === "pdf") {
        buffer = await exportService.exportToPdf(reportResult);
        contentType = "application/pdf";
        fileExtension = "pdf";
      } else {
        // excel -> CSV for MVP
        buffer = await exportService.exportToExcel(reportResult);
        contentType = "text/csv; charset=utf-8";
        fileExtension = "csv";
      }

      // Generate filename
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const filename = `report_${body.report_code.toLowerCase()}_${dateStr}.${fileExtension}`;

      // Set headers and send file
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length.toString());

      res.send(buffer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors?.[0];
        return next(new ValidationError(firstError?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

export default router;

