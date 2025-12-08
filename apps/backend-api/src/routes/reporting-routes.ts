import { z } from "zod";
import type { NextFunction } from "express";
import { ValidationError } from "@repo/shared-utils";
import { reportingService } from "../services/reporting-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import { prisma } from "../lib/prisma";
import { getConfig } from "@repo/config";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response } from "express";

import { Router, type Router as ExpressRouter } from "express";
const router: ExpressRouter = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// Feature flag middleware for reporting
const checkReportingEnabled = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const config = getConfig();
  if (!config.REPORTING_ENABLED) {
    return res.status(503).json({
      error: {
        message: "Raporlama özelliği bu ortamda devre dışı bırakılmıştır.",
      },
    });
  }
  next();
};

const generateReportSchema = z.object({
  report_code: z.string().min(1, "Rapor kodu gerekli."),
  client_company_id: z.string().optional(),
  filters: z.object({
    start_date: z.string().datetime("Geçerli bir başlangıç tarihi giriniz."),
    end_date: z.string().datetime("Geçerli bir bitiş tarihi giriniz."),
    limit: z.number().int().min(1).max(1000).optional(),
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

// GET /api/v1/reports/definitions
router.get(
  "/definitions",
  checkReportingEnabled,
  requirePermission("reports:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const definitions = await prisma.reportDefinition.findMany({
        where: {
          isActive: true,
        },
        select: {
          code: true,
          name: true,
          description: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      res.json({ data: definitions });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/reports/generate
router.post(
  "/generate",
  checkReportingEnabled,
  requirePermission("reports:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = generateReportSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;

      // Validate date filters
      validateDateFilters(body.filters);

      let result;

      switch (body.report_code) {
        case "COMPANY_FINANCIAL_SUMMARY":
          if (!body.client_company_id) {
            throw new ValidationError("Bu rapor için müşteri şirket seçilmesi zorunludur.");
          }
          result = await reportingService.generateCompanyFinancialSummary(
            tenantId,
            body.client_company_id,
            body.filters
          );
          break;

        case "COMPANY_RISK_SUMMARY":
          if (!body.client_company_id) {
            throw new ValidationError("Bu rapor için müşteri şirket seçilmesi zorunludur.");
          }
          result = await reportingService.generateCompanyRiskSummary(
            tenantId,
            body.client_company_id,
            body.filters
          );
          break;

        case "TENANT_PORTFOLIO":
          result = await reportingService.generateTenantPortfolioReport(
            tenantId,
            body.filters
          );
          break;

        case "DOCUMENT_ACTIVITY":
          result = await reportingService.generateDocumentActivityReport(
            tenantId,
            body.client_company_id || null,
            body.filters
          );
          break;

        default:
          throw new ValidationError("Geçersiz rapor türü.");
      }

      res.json({ data: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Check if the error is about missing date filters
        const missingDateError = error.issues.find(
          (issue) => issue.path.includes("start_date") || issue.path.includes("end_date")
        );
        if (missingDateError || (!req.body.filters?.start_date || !req.body.filters?.end_date)) {
          return next(new ValidationError("Başlangıç ve bitiş tarihleri zorunludur."));
        }
        const firstError = error.issues && error.issues.length > 0 
          ? error.issues[0].message 
          : "Geçersiz bilgiler.";
        return next(new ValidationError(firstError));
      }
      next(error);
    }
  }
);

export default router;

