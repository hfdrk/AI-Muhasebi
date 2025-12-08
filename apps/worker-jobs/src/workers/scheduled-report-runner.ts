import { prisma } from "../lib/prisma";
import { emailService } from "../services/email-service";
import { getConfig } from "@repo/config";

// Use dynamic imports to load services from backend-api at runtime
// This avoids module resolution issues in the monorepo
async function getReportingService() {
  try {
    const module = await import("../../../backend-api/src/services/reporting-service.js");
    return module.reportingService;
  } catch (error1) {
    try {
      const module = await import("../../../backend-api/src/services/reporting-service");
      return module.reportingService;
    } catch (error2) {
      throw new Error(`Failed to load ReportingService: ${error1.message}, ${error2.message}`);
    }
  }
}

async function getExportService() {
  try {
    const module = await import("../../../backend-api/src/services/export-service.js");
    return module.exportService;
  } catch (error1) {
    try {
      const module = await import("../../../backend-api/src/services/export-service");
      return module.exportService;
    } catch (error2) {
      throw new Error(`Failed to load ExportService: ${error1.message}, ${error2.message}`);
    }
  }
}

async function getNotificationService() {
  try {
    const module = await import("../../../backend-api/src/services/notification-service.js");
    return module.notificationService;
  } catch (error1) {
    try {
      const module = await import("../../../backend-api/src/services/notification-service");
      return module.notificationService;
    } catch (error2) {
      throw new Error(`Failed to load NotificationService: ${error1.message}, ${error2.message}`);
    }
  }
}

async function getEmailService() {
  try {
    const module = await import("../../../backend-api/src/services/email-service.js");
    return module.emailService;
  } catch (error1) {
    try {
      const module = await import("../../../backend-api/src/services/email-service");
      return module.emailService;
    } catch (error2) {
      throw new Error(`Failed to load EmailService: ${error1.message}, ${error2.message}`);
    }
  }
}

/**
 * Check if a scheduled report is due to run
 * Prevents duplicate runs within the same minute
 */
function isReportDue(scheduleCron: string, lastRunAt: Date | null): boolean {
  const now = new Date();

  if (!lastRunAt) {
    return true; // Never run before, so it's due
  }

  // Prevent duplicate runs within the same minute (60 seconds)
  const secondsSinceLastRun = (now.getTime() - lastRunAt.getTime()) / 1000;
  if (secondsSinceLastRun < 60) {
    return false; // Too soon, prevent duplicate runs
  }

  const daysSinceLastRun = (now.getTime() - lastRunAt.getTime()) / (1000 * 60 * 60 * 24);

  switch (scheduleCron) {
    case "daily":
      // Daily: must be at least 24 hours (1 day) since last run
      return daysSinceLastRun >= 1;
    case "weekly":
      // Weekly: must be at least 7 days since last run
      return daysSinceLastRun >= 7;
    case "monthly":
      // Monthly: must be at least 30 days since last run
      return daysSinceLastRun >= 30;
    default:
      return false;
  }
}

/**
 * Get Turkish subject for report
 */
function getReportSubject(reportCode: string, reportName: string): string {
  const reportNameMap: Record<string, string> = {
    COMPANY_FINANCIAL_SUMMARY: "Finansal Özet Raporu",
    COMPANY_RISK_SUMMARY: "Risk Özeti Raporu",
    TENANT_PORTFOLIO: "Portföy Raporu",
    DOCUMENT_ACTIVITY: "Döküman Aktivite Raporu",
  };

  const reportTitle = reportNameMap[reportCode] || reportName;
  return `[Sistem] ${reportTitle}`;
}

/**
 * Get Turkish email body for report
 */
function getReportBody(reportName: string, period?: { start_date: string; end_date: string }): string {
  let body = `Ek'te ${reportName} için oluşturulan dönemsel raporu bulabilirsiniz.`;

  if (period) {
    const startDate = new Date(period.start_date).toLocaleDateString("tr-TR");
    const endDate = new Date(period.end_date).toLocaleDateString("tr-TR");
    body += `\n\nDönem: ${startDate} - ${endDate}`;
  }

  return body;
}

/**
 * Generate filename for report attachment
 */
function getReportFilename(reportCode: string, format: string): string {
  const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const extension = format === "pdf" ? "pdf" : "csv";
  return `report_${reportCode.toLowerCase()}_${dateStr}.${extension}`;
}

export class ScheduledReportRunner {
  /**
   * Run once - check for due scheduled reports and process them
   * 
   * This method should be called periodically (e.g., every 5 minutes) to process
   * scheduled reports that are due to run. It finds all active scheduled reports,
   * filters those that are due based on their schedule_cron and lastRunAt,
   * and processes each one by generating the report, exporting it, and sending emails.
   * 
   * @returns Promise that resolves when all due reports have been processed
   * 
   * @example
   * ```typescript
   * // In a worker loop
   * setInterval(async () => {
   *   await scheduledReportRunner.runOnce();
   * }, 5 * 60 * 1000); // Every 5 minutes
   * ```
   */
  async runOnce(): Promise<void> {
    try {
      // Check if scheduled reports are enabled
      const config = getConfig();
      if (!config.SCHEDULED_REPORTS_ENABLED) {
        console.log("[ScheduledReportRunner] Scheduled reports are disabled via SCHEDULED_REPORTS_ENABLED flag. Skipping.");
        return;
      }

      // Find all active scheduled reports
      const scheduledReports = await prisma.scheduledReport.findMany({
        where: {
          isActive: true,
        },
        include: {
          clientCompany: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (scheduledReports.length === 0) {
        return;
      }

      const now = new Date();
      const dueReports = scheduledReports.filter((report) =>
        isReportDue(report.scheduleCron, report.lastRunAt)
      );

      if (dueReports.length === 0) {
        return;
      }

      console.log(`[ScheduledReportRunner] Found ${dueReports.length} due report(s) to process`, {
        tenantIds: [...new Set(dueReports.map(r => r.tenantId))],
        reportCodes: [...new Set(dueReports.map(r => r.reportCode))],
      });

      // Load services
      const reportingService = await getReportingService();
      const exportService = await getExportService();

      // Process each due report
      for (const report of dueReports) {
        await this.processScheduledReport(report, reportingService, exportService);
      }
    } catch (error: any) {
      // Never throw unhandled errors from worker loop
      console.error("[ScheduledReportRunner] Error in runOnce:", error.message, error.stack);
    }
  }

  /**
   * Process a single scheduled report
   */
  private async processScheduledReport(
    report: any,
    reportingService: any,
    exportService: any
  ): Promise<void> {
    let executionLogId: string | null = null;

    try {
      // Create execution log (status will be updated to success/failed)
      const executionLog = await prisma.reportExecutionLog.create({
        data: {
          tenantId: report.tenantId,
          scheduledReportId: report.id,
          reportCode: report.reportCode,
          startedAt: new Date(),
          status: "success", // Temporary, will be updated
          message: null,
        },
      });

      executionLogId = executionLog.id;

      console.log(`[ScheduledReportRunner] Processing scheduled report`, {
        reportId: report.id,
        reportName: report.name,
        reportCode: report.reportCode,
        tenantId: report.tenantId,
        format: report.format,
        scheduleCron: report.scheduleCron,
      });

      // Check if report definition exists
      const reportDefinition = await prisma.reportDefinition.findUnique({
        where: { code: report.reportCode },
      });

      if (!reportDefinition || !reportDefinition.isActive) {
        throw new Error("Rapor tanımı bulunamadı.");
      }

      // Extract and validate filters from report
      let filters: any = {};
      try {
        if (report.filters) {
          if (typeof report.filters === "string") {
            filters = JSON.parse(report.filters);
          } else if (typeof report.filters === "object") {
            filters = report.filters;
          } else {
            throw new Error("Invalid filters format");
          }
        }
      } catch (parseError: any) {
        throw new Error("Geçersiz filtre yapılandırması.");
      }
      
      // Ensure filters have date range
      if (!filters.start_date || !filters.end_date) {
        // Default to last 30 days if not specified
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        filters.start_date = startDate.toISOString();
        filters.end_date = endDate.toISOString();
      }

      // Generate report based on report code
      let reportResult: any;

      switch (report.reportCode) {
        case "COMPANY_FINANCIAL_SUMMARY":
          if (!report.clientCompanyId) {
            throw new Error("COMPANY_FINANCIAL_SUMMARY requires client_company_id");
          }
          reportResult = await reportingService.generateCompanyFinancialSummary(
            report.tenantId,
            report.clientCompanyId,
            filters
          );
          break;

        case "COMPANY_RISK_SUMMARY":
          if (!report.clientCompanyId) {
            throw new Error("COMPANY_RISK_SUMMARY requires client_company_id");
          }
          reportResult = await reportingService.generateCompanyRiskSummary(
            report.tenantId,
            report.clientCompanyId,
            filters
          );
          break;

        case "TENANT_PORTFOLIO":
          reportResult = await reportingService.generateTenantPortfolioReport(
            report.tenantId,
            filters
          );
          break;

        case "DOCUMENT_ACTIVITY":
          reportResult = await reportingService.generateDocumentActivityReport(
            report.tenantId,
            report.clientCompanyId || null,
            filters
          );
          break;

        default:
          throw new Error(`Unknown report code: ${report.reportCode}`);
      }

      // Export report
      let buffer: Buffer;
      let contentType: string;

      if (report.format === "pdf") {
        buffer = await exportService.exportToPdf(reportResult);
        contentType = "application/pdf";
      } else {
        buffer = await exportService.exportToExcel(reportResult);
        contentType = "text/csv; charset=utf-8";
      }

      // Get recipients
      const recipients = (report.recipients as string[]) || [];
      if (recipients.length === 0) {
        throw new Error("No recipients specified for scheduled report");
      }

      // Prepare email
      const subject = getReportSubject(report.reportCode, report.name);
      const body = getReportBody(report.name, reportResult.period);
      const filename = getReportFilename(report.reportCode, report.format);

      // Send email
      await emailService.sendEmail({
        to: recipients,
        subject,
        body,
        attachments: [
          {
            filename,
            content: buffer,
            contentType,
          },
        ],
      });

      // Update execution log as success
      await prisma.reportExecutionLog.update({
        where: { id: executionLogId },
        data: {
          finishedAt: new Date(),
          status: "success",
          message: "Rapor başarıyla oluşturuldu ve e-posta ile gönderildi.",
        },
      });

      // Update scheduled report
      await prisma.scheduledReport.update({
        where: { id: report.id },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: "success",
        },
      });

      console.log(`[ScheduledReportRunner] Successfully processed scheduled report`, {
        reportId: report.id,
        reportName: report.name,
        executionLogId,
        recipientsCount: recipients.length,
      });
    } catch (error: any) {
      // Use standardized error message
      let errorMessage = "Rapor çalıştırma sırasında bir hata oluştu.";
      
      // Use specific error messages for known cases
      if (error.message === "Rapor tanımı bulunamadı." || error.message === "Geçersiz filtre yapılandırması.") {
        errorMessage = error.message;
      } else if (error.message) {
        // For other errors, use a generic message but log the actual error
        errorMessage = "Rapor çalıştırma sırasında bir hata oluştu.";
      }
      
      const safeMessage = errorMessage.length > 200 ? errorMessage.substring(0, 200) : errorMessage;

      console.error(`[ScheduledReportRunner] Failed to process scheduled report`, {
        reportId: report.id,
        reportName: report.name,
        error: errorMessage,
        executionLogId,
      });

      // Update execution log as failed
      if (executionLogId) {
        try {
          await prisma.reportExecutionLog.update({
            where: { id: executionLogId },
            data: {
              finishedAt: new Date(),
              status: "failed",
              message: safeMessage,
            },
          });
        } catch (updateError: any) {
          console.error(`[ScheduledReportRunner] Failed to update execution log:`, updateError.message);
        }
      }

      // Update scheduled report
      try {
        await prisma.scheduledReport.update({
          where: { id: report.id },
          data: {
            lastRunAt: new Date(),
            lastRunStatus: "failed",
          },
        });
      } catch (updateError: any) {
        console.error(`[ScheduledReportRunner] Failed to update scheduled report:`, updateError.message);
      }

      // Create notification for scheduled report failure
      try {
        const notificationService = await getNotificationService();
        const emailService = await getEmailService();

        const notification = await notificationService.createNotification({
          tenantId: report.tenantId,
          userId: null, // Tenant-wide notification
          type: "SCHEDULED_REPORT",
          title: "Zamanlanmış rapor çalıştırma hatası",
          message: `${report.name} raporu çalıştırılırken bir hata oluştu.`,
          meta: {
            scheduledReportId: report.id,
            executionLogId: executionLogId,
          },
        });

        // Send email notification (stub) - for MVP, send to tenant owners
        try {
          const tenantMembers = await prisma.userTenantMembership.findMany({
            where: {
              tenantId: report.tenantId,
              status: "active",
              role: "TenantOwner",
            },
            include: {
              user: {
                select: { email: true },
              },
            },
          });

          const recipientEmails = tenantMembers
            .map((m) => m.user.email)
            .filter((email): email is string => email !== null);

          if (recipientEmails.length > 0) {
            await emailService.sendNotificationEmail(
              recipientEmails,
              "SCHEDULED_REPORT",
              notification.title,
              notification.message
            );
          }
        } catch (emailError: any) {
          // Don't fail notification creation if email fails
          console.error("[ScheduledReportRunner] Failed to send notification email:", emailError);
        }
      } catch (notificationError: any) {
        // Don't fail report processing if notification fails
        console.error("[ScheduledReportRunner] Failed to create notification:", notificationError);
      }
    }
  }
}

export const scheduledReportRunner = new ScheduledReportRunner();

