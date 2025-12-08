import { Router } from "express";
import { z } from "zod";
import type { NextFunction } from "express";
import { ValidationError } from "@repo/shared-utils";
import { scheduledReportService } from "../services/scheduled-report-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import { getConfig } from "@repo/config";
import type { AuthenticatedRequest, Response } from "../types/request-context";

const router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// Feature flag middleware for scheduled reports (create/update)
const checkScheduledReportsEnabled = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const config = getConfig();
  if (!config.SCHEDULED_REPORTS_ENABLED) {
    return res.status(503).json({
      error: {
        message: "Zamanlanmış raporlar özelliği bu ortamda devre dışı bırakılmıştır.",
      },
    });
  }
  next();
};

const createScheduledReportSchema = z.object({
  name: z.string().min(1, "Rapor adı gerekli."),
  report_code: z.string().min(1, "Rapor kodu gerekli."),
  client_company_id: z.string().optional().nullable(),
  format: z.enum(["pdf", "excel"], {
    errorMap: () => ({ message: "Format 'pdf' veya 'excel' olmalıdır." }),
  }),
  schedule_cron: z.enum(["daily", "weekly", "monthly"], {
    errorMap: () => ({ message: "Zamanlama 'daily', 'weekly' veya 'monthly' olmalıdır." }),
  }),
  filters: z.record(z.string(), z.unknown()).optional().default({}),
  recipients: z.array(z.string().email("Geçerli bir e-posta adresi giriniz.")).min(1, "En az bir alıcı gerekli."),
  is_active: z.boolean().default(true),
});

const updateScheduledReportSchema = z.object({
  name: z.string().min(1, "Rapor adı gerekli.").optional(),
  client_company_id: z.string().optional().nullable(),
  format: z.enum(["pdf", "excel"]).optional(),
  schedule_cron: z.enum(["daily", "weekly", "monthly"]).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  recipients: z.array(z.string().email("Geçerli bir e-posta adresi giriniz.")).min(1, "En az bir alıcı gerekli.").optional(),
  is_active: z.boolean().optional(),
});

// GET /api/v1/scheduled-reports
router.get(
  "/",
  requirePermission("reports:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.context!.tenantId!;
      const reports = await scheduledReportService.listScheduledReports(tenantId);

      res.json({
        data: reports.map((report) => ({
          id: report.id,
          name: report.name,
          reportCode: report.reportCode,
          format: report.format,
          scheduleCron: report.scheduleCron,
          recipients: report.recipients,
          isActive: report.isActive,
          lastRunAt: report.lastRunAt,
          lastRunStatus: report.lastRunStatus,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          clientCompany: report.clientCompany,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/scheduled-reports/:id
router.get(
  "/:id",
  requirePermission("reports:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.context!.tenantId!;
      const { id } = req.params;

      const report = await scheduledReportService.getScheduledReportById(id, tenantId);

      res.json({
        data: {
          id: report.id,
          name: report.name,
          reportCode: report.reportCode,
          format: report.format,
          scheduleCron: report.scheduleCron,
          recipients: report.recipients,
          isActive: report.isActive,
          lastRunAt: report.lastRunAt,
          lastRunStatus: report.lastRunStatus,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          clientCompany: report.clientCompany,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/scheduled-reports
router.post(
  "/",
  checkScheduledReportsEnabled,
  requirePermission("reports:create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      console.log("[POST /scheduled-reports] Received request body:", JSON.stringify(req.body, null, 2));
      const body = createScheduledReportSchema.parse(req.body);
      console.log("[POST /scheduled-reports] Parsed body:", JSON.stringify(body, null, 2));
      const tenantId = req.context!.tenantId!;
      const userId = req.context!.userId!;
      console.log("[POST /scheduled-reports] Tenant ID:", tenantId, "User ID:", userId);

      const report = await scheduledReportService.createScheduledReport({
        tenantId,
        createdByUserId: userId,
        reportCode: body.report_code,
        clientCompanyId: body.client_company_id || null,
        name: body.name,
        format: body.format,
        scheduleCron: body.schedule_cron,
        filters: body.filters || {},
        recipients: body.recipients,
        isActive: body.is_active,
      });

      res.status(201).json({
        data: {
          id: report.id,
          name: report.name,
          reportCode: report.reportCode,
          format: report.format,
          scheduleCron: report.scheduleCron,
          recipients: report.recipients,
          isActive: report.isActive,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          clientCompany: report.clientCompany,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors?.[0];
        return next(new ValidationError(firstError?.message || "Geçersiz bilgiler."));
      }
      // Log the actual error for debugging
      console.error("[POST /scheduled-reports] Error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      next(error);
    }
  }
);

// PUT /api/v1/scheduled-reports/:id
router.put(
  "/:id",
  checkScheduledReportsEnabled,
  requirePermission("reports:create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = updateScheduledReportSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;
      const { id } = req.params;

      const report = await scheduledReportService.updateScheduledReport(id, tenantId, {
        name: body.name,
        clientCompanyId: body.client_company_id,
        format: body.format,
        scheduleCron: body.schedule_cron,
        filters: body.filters,
        recipients: body.recipients,
        isActive: body.is_active,
      });

      res.json({
        data: {
          id: report.id,
          name: report.name,
          reportCode: report.reportCode,
          format: report.format,
          scheduleCron: report.scheduleCron,
          recipients: report.recipients,
          isActive: report.isActive,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          clientCompany: report.clientCompany,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors?.[0];
        return next(new ValidationError(firstError?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

// DELETE /api/v1/scheduled-reports/:id
router.delete(
  "/:id",
  requirePermission("reports:create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.context!.tenantId!;
      const { id } = req.params;

      await scheduledReportService.deactivateScheduledReport(id, tenantId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;

