import { prisma } from "../lib/prisma";

export interface OnboardingState {
  hasClientCompanies: boolean;
  hasInvoices: boolean;
  hasUploadedDocuments: boolean;
  hasGeneratedReports: boolean;
}

export class OnboardingService {
  /**
   * Get onboarding state for a tenant
   * Checks if tenant has basic data to determine if onboarding is needed
   */
  async getOnboardingState(tenantId: string): Promise<OnboardingState> {
    // Check client companies count
    const clientCompaniesCount = await prisma.clientCompany.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    // Check invoices count
    const invoicesCount = await prisma.invoice.count({
      where: {
        tenantId,
      },
    });

    // Check documents with UPLOADED status count
    const uploadedDocumentsCount = await prisma.document.count({
      where: {
        tenantId,
        status: "UPLOADED",
        isDeleted: false,
      },
    });

    // Check reports count (scheduled reports or report execution logs)
    const scheduledReportsCount = await prisma.scheduledReport.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    const reportExecutionLogsCount = await prisma.reportExecutionLog.count({
      where: {
        tenantId,
      },
    });

    return {
      hasClientCompanies: clientCompaniesCount > 0,
      hasInvoices: invoicesCount > 0,
      hasUploadedDocuments: uploadedDocumentsCount > 0,
      hasGeneratedReports: scheduledReportsCount > 0 || reportExecutionLogsCount > 0,
    };
  }
}

export const onboardingService = new OnboardingService();


