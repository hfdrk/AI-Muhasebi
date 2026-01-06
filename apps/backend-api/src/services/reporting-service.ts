import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError, logger } from "@repo/shared-utils";
import { aiAssistantService } from "./ai-assistant-service";

export interface ReportPeriod {
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
}

export interface BaseReportResult<Row = any, Totals = any> {
  title: string;
  period: ReportPeriod;
  generated_at: string; // ISO datetime string
  rows: Row[];
  totals?: Totals;
  meta?: {
    row_count: number;
    row_limit_applied: boolean;
  };
  suggestions?: string[]; // AI-based improvement suggestions
}

export class ReportingService {
  /**
   * Validate that a client company belongs to the given tenant
   */
  private async validateClientCompany(
    tenantId: string,
    clientCompanyId: string
  ): Promise<void> {
    const company = await prisma.clientCompany.findFirst({
      where: {
        id: clientCompanyId,
        tenantId,
      },
    });

    if (!company) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }
  }

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
  async generateCompanyFinancialSummary(
    tenantId: string,
    clientCompanyId: string,
    filters: { start_date: string; end_date: string; limit?: number }
  ): Promise<BaseReportResult> {
    await this.validateClientCompany(tenantId, clientCompanyId);

    const startDate = new Date(filters.start_date);
    const endDate = new Date(filters.end_date);

    // Query invoices in the date range
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientCompanyId,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate totals
    let totalSales = 0;
    let totalPurchases = 0;
    const invoiceCountsByStatus: Record<string, number> = {
      taslak: 0,
      kesildi: 0,
      iptal: 0,
      muhasebeleştirilmiş: 0,
    };

    for (const invoice of invoices) {
      const amount = Number(invoice.totalAmount);
      if (invoice.type === "SATIŞ") {
        totalSales += amount;
      } else if (invoice.type === "ALIŞ") {
        totalPurchases += amount;
      }

      const status = invoice.status as keyof typeof invoiceCountsByStatus;
      if (invoiceCountsByStatus[status] !== undefined) {
        invoiceCountsByStatus[status]++;
      }
    }

    // Query transactions for ledger totals
    const transactions = await prisma.transaction.findMany({
      where: {
        tenantId,
        clientCompanyId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        lines: {
          include: {
            ledgerAccount: true,
          },
        },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    for (const transaction of transactions) {
      for (const line of transaction.lines) {
        const accountType = line.ledgerAccount.type;
        const debit = Number(line.debitAmount);
        const credit = Number(line.creditAmount);

        if (accountType === "income") {
          totalIncome += credit;
        } else if (accountType === "expense") {
          totalExpense += debit;
        }
      }
    }

    // Build rows - monthly breakdown
    const rows: Array<{
      period: string;
      sales: number;
      purchases: number;
      invoice_count: number;
    }> = [];

    // Group invoices by month
    const monthlyData = new Map<string, { sales: number; purchases: number; count: number }>();

    for (const invoice of invoices) {
      const monthKey = invoice.issueDate.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { sales: 0, purchases: 0, count: 0 });
      }
      const data = monthlyData.get(monthKey)!;
      data.count++;
      const amount = Number(invoice.totalAmount);
      if (invoice.type === "SATIŞ") {
        data.sales += amount;
      } else if (invoice.type === "ALIŞ") {
        data.purchases += amount;
      }
    }

    for (const [month, data] of monthlyData.entries()) {
      rows.push({
        period: month,
        sales: data.sales,
        purchases: data.purchases,
        invoice_count: data.count,
      });
    }

    return {
      title: "Müşteri Finansal Özeti",
      period: {
        start_date: filters.start_date,
        end_date: filters.end_date,
      },
      generated_at: new Date().toISOString(),
      rows,
      totals: {
        totalSales,
        totalPurchases,
        invoiceCountsByStatus,
        ledgerTotals: {
          totalIncome,
          totalExpense,
          netIncome: totalIncome - totalExpense,
        },
      },
      suggestions: await this.generateImprovementSuggestions(tenantId, clientCompanyId, {
        totalSales,
        totalPurchases,
        invoiceCountsByStatus,
      }),
    };
  }

  /**
   * Generate risk summary report for a client company
   * 
   * @param tenantId - The tenant ID to scope the report
   * @param clientCompanyId - The client company ID to generate the report for
   * @param filters - Date range filters with start_date and end_date (ISO date strings)
   * @returns Promise resolving to BaseReportResult with risk summary data including latest risk score, high-risk documents, and open alerts
   * @throws NotFoundError if client company is not found or doesn't belong to tenant
   */
  async generateCompanyRiskSummary(
    tenantId: string,
    clientCompanyId: string,
    filters: { start_date: string; end_date: string; limit?: number }
  ): Promise<BaseReportResult> {
    await this.validateClientCompany(tenantId, clientCompanyId);

    const startDate = new Date(filters.start_date);
    const endDate = new Date(filters.end_date);

    // Get latest risk score for the company
    const latestRiskScore = await prisma.clientCompanyRiskScore.findFirst({
      where: {
        tenantId,
        clientCompanyId,
      },
      orderBy: {
        generatedAt: "desc",
      },
    });

    // Query documents with risk scores - filter in memory for high severity
    const documentsWithRiskScores = await prisma.document.findMany({
      where: {
        tenantId,
        clientCompanyId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        riskScore: {
          isNot: null,
        },
      },
      include: {
        riskScore: true,
      },
    });

    // Filter to only high severity documents
    const highRiskDocuments = documentsWithRiskScores.filter(
      (doc) => doc.riskScore && doc.riskScore.severity === "high"
    );

    // Query open risk alerts grouped by severity
    const openAlerts = await prisma.riskAlert.findMany({
      where: {
        tenantId,
        clientCompanyId,
        status: "open",
      },
    });

    const openAlertsBySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const alert of openAlerts) {
      const severity = alert.severity as keyof typeof openAlertsBySeverity;
      if (openAlertsBySeverity[severity] !== undefined) {
        openAlertsBySeverity[severity]++;
      }
    }

    // Get triggered risk rules from latest risk score
    const triggeredRules: string[] = [];
    if (latestRiskScore) {
      const ruleCodes = latestRiskScore.triggeredRuleCodes;
      if (Array.isArray(ruleCodes)) {
        triggeredRules.push(...ruleCodes.map(String));
      }
    }

    // Build rows - document risk breakdown
    const rows: Array<{
      document_id: string;
      document_type: string;
      risk_score: number;
      severity: string;
      triggered_rules: string[];
    }> = [];

    for (const doc of highRiskDocuments) {
      if (doc.riskScore) {
        rows.push({
          document_id: doc.id,
          document_type: doc.type,
          risk_score: Number(doc.riskScore.score),
          severity: doc.riskScore.severity,
          triggered_rules: Array.isArray(doc.riskScore.triggeredRuleCodes)
            ? doc.riskScore.triggeredRuleCodes.map(String)
            : [],
        });
      }
    }

    // Generate improvement suggestions
    const suggestions = await this.generateRiskImprovementSuggestions(
      tenantId,
      clientCompanyId,
      {
        latestRiskScore: latestRiskScore ? Number(latestRiskScore.score) : null,
        highRiskDocumentCount: highRiskDocuments.length,
        triggeredRules,
        openAlertsBySeverity,
      }
    );

    return {
      title: "Müşteri Risk Özeti",
      period: {
        start_date: filters.start_date,
        end_date: filters.end_date,
      },
      generated_at: new Date().toISOString(),
      rows,
      totals: {
        latestRiskScore: latestRiskScore ? Number(latestRiskScore.score) : null,
        latestSeverity: latestRiskScore?.severity || null,
        highRiskDocumentCount: highRiskDocuments.length,
        triggeredRules,
        openAlertsBySeverity,
      },
      suggestions,
    };
  }

  /**
   * Generate portfolio report for all companies in a tenant
   * 
   * @param tenantId - The tenant ID to scope the report
   * @param filters - Date range filters with start_date and end_date (ISO date strings)
   * @returns Promise resolving to BaseReportResult with portfolio data including all companies with their risk scores, document counts, and alerts
   */
  async generateTenantPortfolioReport(
    tenantId: string,
    filters: { start_date: string; end_date: string; limit?: number }
  ): Promise<BaseReportResult> {
    const startDate = new Date(filters.start_date);
    const endDate = new Date(filters.end_date);

    // Apply limit (default 1000, max 1000)
    const limit = Math.min(filters.limit || 1000, 1000);
    const limitApplied = (filters.limit || 1000) > 1000;

    // Get all client companies for the tenant
    const companies = await prisma.clientCompany.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      take: limit,
      include: {
        riskScores: {
          orderBy: {
            generatedAt: "desc",
          },
          take: 1,
        },
        documents: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        riskAlerts: {
          where: {
            status: "open",
          },
        },
      },
    });

    const rows: Array<{
      company_id: string;
      company_name: string;
      tax_number: string;
      latest_risk_score: number | null;
      latest_risk_severity: string | null;
      document_count: number;
      high_risk_invoice_count: number;
      open_alert_count: number;
    }> = [];

    let totalDocuments = 0;
    let totalHighRiskInvoices = 0;
    let totalOpenAlerts = 0;

    for (const company of companies) {
      const latestRiskScore = company.riskScores[0] || null;

      // Count high-risk invoices (invoices with related documents that have high risk scores)
      const highRiskInvoiceCount = await prisma.invoice.count({
        where: {
          tenantId,
          clientCompanyId: company.id,
          issueDate: {
            gte: startDate,
            lte: endDate,
          },
          relatedDocuments: {
            some: {
              riskScore: {
                severity: "high",
              },
            },
          },
        },
      });

      const documentCount = company.documents.length;
      const openAlertCount = company.riskAlerts.length;

      totalDocuments += documentCount;
      totalHighRiskInvoices += highRiskInvoiceCount;
      totalOpenAlerts += openAlertCount;

      rows.push({
        company_id: company.id,
        company_name: company.name,
        tax_number: company.taxNumber,
        latest_risk_score: latestRiskScore ? Number(latestRiskScore.score) : null,
        latest_risk_severity: latestRiskScore?.severity || null,
        document_count: documentCount,
        high_risk_invoice_count: highRiskInvoiceCount,
        open_alert_count: openAlertCount,
      });
    }

    return {
      title: "Kiracı Portföy Raporu",
      period: {
        start_date: filters.start_date,
        end_date: filters.end_date,
      },
      generated_at: new Date().toISOString(),
      rows,
      totals: {
        totalCompanies: companies.length,
        totalDocuments,
        totalHighRiskInvoices,
        totalOpenAlerts,
      },
      meta: {
        row_count: rows.length,
        row_limit_applied: limitApplied,
      },
    };
  }

  /**
   * Generate document activity report
   * 
   * @param tenantId - The tenant ID to scope the report
   * @param clientCompanyId - Optional client company ID to filter by company, or null for all companies
   * @param filters - Date range filters with start_date and end_date (ISO date strings)
   * @returns Promise resolving to BaseReportResult with document activity data including documents by type, processing status, and invoice statistics
   * @throws NotFoundError if clientCompanyId is provided but company is not found or doesn't belong to tenant
   */
  async generateDocumentActivityReport(
    tenantId: string,
    clientCompanyId: string | null,
    filters: { start_date: string; end_date: string; limit?: number }
  ): Promise<BaseReportResult> {
    if (clientCompanyId) {
      await this.validateClientCompany(tenantId, clientCompanyId);
    }

    const startDate = new Date(filters.start_date);
    const endDate = new Date(filters.end_date);

    // Query documents in the date range
    const where: any = {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (clientCompanyId) {
      where.clientCompanyId = clientCompanyId;
    }

    // Apply limit (default 1000, max 1000)
    const limit = Math.min(filters.limit || 1000, 1000);
    const limitApplied = (filters.limit || 1000) > 1000;

    const documents = await prisma.document.findMany({
      where,
      take: limit,
    });

    // Group by document type
    const documentsByType: Record<string, number> = {
      INVOICE: 0,
      BANK_STATEMENT: 0,
      RECEIPT: 0,
      OTHER: 0,
    };

    // Group by processing status
    const processingStatusCounts: Record<string, number> = {
      UPLOADED: 0,
      PROCESSING: 0,
      PROCESSED: 0,
      FAILED: 0,
    };

    for (const doc of documents) {
      const type = doc.type as keyof typeof documentsByType;
      if (documentsByType[type] !== undefined) {
        documentsByType[type]++;
      }

      const status = doc.status as keyof typeof processingStatusCounts;
      if (processingStatusCounts[status] !== undefined) {
        processingStatusCounts[status]++;
      }
    }

    // Query invoices in period, group by status
    const invoiceWhere: any = {
      tenantId,
      issueDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (clientCompanyId) {
      invoiceWhere.clientCompanyId = clientCompanyId;
    }

    const invoices = await prisma.invoice.findMany({
      where: invoiceWhere,
    });

    const invoiceCountsByStatus: Record<string, number> = {
      taslak: 0,
      kesildi: 0,
      iptal: 0,
      muhasebeleştirilmiş: 0,
    };

    let totalInvoiceAmount = 0;
    let totalTaxAmount = 0;
    let totalNetAmount = 0;

    for (const invoice of invoices) {
      const status = invoice.status as keyof typeof invoiceCountsByStatus;
      if (invoiceCountsByStatus[status] !== undefined) {
        invoiceCountsByStatus[status]++;
      }

      totalInvoiceAmount += Number(invoice.totalAmount);
      totalTaxAmount += Number(invoice.taxAmount);
      totalNetAmount += invoice.netAmount ? Number(invoice.netAmount) : 0;
    }

    // Build rows - activity breakdown by month
    const rows: Array<{
      period: string;
      documents_uploaded: number;
      documents_processed: number;
      invoices_created: number;
    }> = [];

    const monthlyData = new Map<string, { docs: number; processed: number; invoices: number }>();

    for (const doc of documents) {
      const monthKey = doc.createdAt.toISOString().substring(0, 7);
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { docs: 0, processed: 0, invoices: 0 });
      }
      const data = monthlyData.get(monthKey)!;
      data.docs++;
      if (doc.status === "PROCESSED") {
        data.processed++;
      }
    }

    for (const invoice of invoices) {
      const monthKey = invoice.issueDate.toISOString().substring(0, 7);
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { docs: 0, processed: 0, invoices: 0 });
      }
      const data = monthlyData.get(monthKey)!;
      data.invoices++;
    }

    for (const [month, data] of monthlyData.entries()) {
      rows.push({
        period: month,
        documents_uploaded: data.docs,
        documents_processed: data.processed,
        invoices_created: data.invoices,
      });
    }

    return {
      title: "Döküman Aktivite Raporu",
      period: {
        start_date: filters.start_date,
        end_date: filters.end_date,
      },
      generated_at: new Date().toISOString(),
      rows,
      totals: {
        documentsByType,
        processingStatusCounts,
        invoiceCountsByStatus,
        invoiceTotals: {
          totalAmount: totalInvoiceAmount,
          totalTaxAmount,
          totalNetAmount,
        },
      },
      meta: {
        row_count: rows.length,
        row_limit_applied: limitApplied,
      },
    };
  }

  /**
   * Generate AI-based improvement suggestions for financial reports
   */
  private async generateImprovementSuggestions(
    tenantId: string,
    clientCompanyId: string,
    data: {
      totalSales: number;
      totalPurchases: number;
      invoiceCountsByStatus: Record<string, number>;
    }
  ): Promise<string[]> {
    try {
      const prompt = `Aşağıdaki finansal verilere dayanarak iyileştirme önerileri sun:

Satış Toplamı: ${data.totalSales.toFixed(2)} TRY
Alış Toplamı: ${data.totalPurchases.toFixed(2)} TRY
Net Tutar: ${(data.totalSales - data.totalPurchases).toFixed(2)} TRY

Fatura Durumları:
- Taslak: ${data.invoiceCountsByStatus.taslak || 0}
- Kesildi: ${data.invoiceCountsByStatus.kesildi || 0}
- İptal: ${data.invoiceCountsByStatus.iptal || 0}
- Muhasebeleştirilmiş: ${data.invoiceCountsByStatus.muhasebeleştirilmiş || 0}

Lütfen 3-5 adet kısa ve öz iyileştirme önerisi sun. Her öneri bir satır olmalı.`;

      const response = await aiAssistantService.generateText(prompt);
      
      // Parse suggestions (assuming they're separated by newlines or bullets)
      const suggestions = response
        .split(/\n|•|[-*]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.match(/^(Lütfen|Aşağıdaki|Satış|Alış|Fatura)/i))
        .slice(0, 5);

      return suggestions.length > 0 ? suggestions : [
        "Düzenli fatura takibi yapın",
        "Eksik belgeleri tamamlayın",
        "Risk skorlarını düzenli kontrol edin",
      ];
    } catch (error) {
      logger.error("[ReportingService] Error generating suggestions:", { error });
      // Return default suggestions on error
      return [
        "Düzenli fatura takibi yapın",
        "Eksik belgeleri tamamlayın",
        "Risk skorlarını düzenli kontrol edin",
      ];
    }
  }

  /**
   * Generate AI-based improvement suggestions for risk reports
   */
  private async generateRiskImprovementSuggestions(
    tenantId: string,
    clientCompanyId: string,
    data: {
      latestRiskScore: number | null;
      highRiskDocumentCount: number;
      triggeredRules: string[];
      openAlertsBySeverity: Record<string, number>;
    }
  ): Promise<string[]> {
    try {
      const prompt = `Aşağıdaki risk verilerine dayanarak risk azaltma önerileri sun:

Mevcut Risk Skoru: ${data.latestRiskScore?.toFixed(1) || "N/A"}/100
Yüksek Riskli Belge Sayısı: ${data.highRiskDocumentCount}
Tetiklenen Risk Kuralları: ${data.triggeredRules.join(", ") || "Yok"}

Açık Uyarılar:
- Yüksek: ${data.openAlertsBySeverity.high || 0}
- Orta: ${data.openAlertsBySeverity.medium || 0}
- Düşük: ${data.openAlertsBySeverity.low || 0}

Lütfen 3-5 adet kısa ve öz risk azaltma önerisi sun. Her öneri bir satır olmalı.`;

      const response = await aiAssistantService.generateText(prompt);
      
      // Parse suggestions
      const suggestions = response
        .split(/\n|•|[-*]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.match(/^(Lütfen|Aşağıdaki|Mevcut|Yüksek|Tetiklenen|Açık)/i))
        .slice(0, 5);

      return suggestions.length > 0 ? suggestions : [
        "Yüksek riskli belgeleri inceleyin",
        "Tetiklenen risk kurallarını gözden geçirin",
        "Açık uyarıları çözün",
      ];
    } catch (error) {
      logger.error("[ReportingService] Error generating risk suggestions:", { error });
      // Return default suggestions on error
      return [
        "Yüksek riskli belgeleri inceleyin",
        "Tetiklenen risk kurallarını gözden geçirin",
        "Açık uyarıları çözün",
      ];
    }
  }

  /**
   * Generate audit preparation report
   * Includes missing documents list, compliance check, and risk summary
   */
  async generateAuditPreparationReport(
    tenantId: string,
    clientCompanyId: string,
    filters: { start_date: string; end_date: string }
  ): Promise<BaseReportResult> {
    await this.validateClientCompany(tenantId, clientCompanyId);

    const startDate = new Date(filters.start_date);
    const endDate = new Date(filters.end_date);

    // Get missing documents
    const missingDocuments = await prisma.documentRequirement.findMany({
      where: {
        tenantId,
        clientCompanyId,
        status: {
          in: ["pending", "overdue"],
        },
        requiredByDate: {
          lte: endDate,
        },
      },
      include: {
        clientCompany: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        requiredByDate: "asc",
      },
    });

    // Get high-risk documents
    const highRiskDocuments = await prisma.document.findMany({
      where: {
        tenantId,
        clientCompanyId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        riskScore: {
          severity: "high",
        },
      },
      include: {
        riskScore: {
          select: {
            score: true,
            severity: true,
            triggeredRuleCodes: true,
          },
        },
      },
    });

    // Get open risk alerts
    const openAlerts = await prisma.riskAlert.findMany({
      where: {
        tenantId,
        clientCompanyId,
        status: "open",
      },
      orderBy: {
        severity: "desc",
      },
    });

    // Get latest risk score
    const latestRiskScore = await prisma.clientCompanyRiskScore.findFirst({
      where: {
        tenantId,
        clientCompanyId,
      },
      orderBy: {
        generatedAt: "desc",
      },
    });

    // Build rows
    const rows: Array<{
      category: string;
      item: string;
      status: string;
      priority: string;
      description: string;
    }> = [];

    // Add missing documents
    for (const req of missingDocuments) {
      rows.push({
        category: "Eksik Belgeler",
        item: req.documentType,
        status: req.status === "overdue" ? "Vadesi Geçti" : "Beklemede",
        priority: req.status === "overdue" ? "Yüksek" : "Orta",
        description: `Gerekli tarih: ${new Date(req.requiredByDate).toLocaleDateString("tr-TR")}`,
      });
    }

    // Add high-risk documents
    for (const doc of highRiskDocuments) {
      rows.push({
        category: "Yüksek Riskli Belgeler",
        item: doc.originalFileName,
        status: "Yüksek Risk",
        priority: "Yüksek",
        description: `Risk skoru: ${doc.riskScore?.score || "N/A"}`,
      });
    }

    // Add open alerts
    for (const alert of openAlerts) {
      rows.push({
        category: "Risk Uyarıları",
        item: alert.title,
        status: alert.severity === "high" ? "Yüksek" : alert.severity === "medium" ? "Orta" : "Düşük",
        priority: alert.severity === "high" ? "Yüksek" : alert.severity === "medium" ? "Orta" : "Düşük",
        description: alert.message,
      });
    }

    // Compliance check summary
    const complianceIssues = {
      missingDocuments: missingDocuments.length,
      overdueDocuments: missingDocuments.filter((r) => r.status === "overdue").length,
      highRiskDocuments: highRiskDocuments.length,
      openAlerts: openAlerts.length,
      highSeverityAlerts: openAlerts.filter((a) => a.severity === "high").length,
    };

    return {
      title: "Denetim Hazırlık Raporu",
      period: {
        start_date: filters.start_date,
        end_date: filters.end_date,
      },
      generated_at: new Date().toISOString(),
      rows,
      totals: {
        latestRiskScore: latestRiskScore ? Number(latestRiskScore.score) : null,
        latestSeverity: latestRiskScore?.severity || null,
        complianceIssues,
        summary: {
          totalIssues: rows.length,
          criticalIssues: rows.filter((r) => r.priority === "Yüksek").length,
          requiresAttention: complianceIssues.overdueDocuments > 0 || complianceIssues.highSeverityAlerts > 0,
        },
      },
      suggestions: [
        "Eksik belgeleri tamamlayın",
        "Yüksek riskli belgeleri inceleyin",
        "Açık risk uyarılarını çözün",
        "Denetim öncesi tüm belgelerin eksiksiz olduğundan emin olun",
      ],
    };
  }
}

export const reportingService = new ReportingService();

