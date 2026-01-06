import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";

/**
 * Tax Compliance Service
 * 
 * Handles Turkish tax compliance checks and validations.
 * Supports VAT, corporate tax, withholding tax, and social security contributions.
 */
export interface TaxComplianceStatus {
  compliant: boolean;
  issues: Array<{
    type: "vat" | "corporate_tax" | "withholding" | "social_security" | "deadline";
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    deadline?: Date;
    actionRequired: string;
  }>;
  nextDeadlines: Array<{
    type: string;
    description: string;
    deadline: Date;
    daysRemaining: number;
  }>;
}

export interface TaxDeadline {
  type: "vat" | "corporate_tax" | "withholding" | "social_security";
  period: string; // "2024-01" for monthly, "2024-Q1" for quarterly
  deadline: Date;
  status: "pending" | "submitted" | "overdue";
}

export class TaxComplianceService {
  /**
   * Check tax compliance status for a client company
   */
  async checkCompliance(
    tenantId: string,
    clientCompanyId: string
  ): Promise<TaxComplianceStatus> {
    // Verify company belongs to tenant
    const company = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });

    if (!company || company.tenantId !== tenantId) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    const issues: TaxComplianceStatus["issues"] = [];
    const nextDeadlines: TaxComplianceStatus["nextDeadlines"] = [];

    // Check VAT compliance
    const vatIssues = await this.checkVATCompliance(tenantId, clientCompanyId);
    issues.push(...vatIssues);

    // Check corporate tax compliance
    const corporateTaxIssues = await this.checkCorporateTaxCompliance(tenantId, clientCompanyId);
    issues.push(...corporateTaxIssues);

    // Check withholding tax
    const withholdingIssues = await this.checkWithholdingTaxCompliance(tenantId, clientCompanyId);
    issues.push(...withholdingIssues);

    // Check social security contributions
    const socialSecurityIssues = await this.checkSocialSecurityCompliance(tenantId, clientCompanyId);
    issues.push(...socialSecurityIssues);

    // Get upcoming deadlines
    const deadlines = this.getUpcomingDeadlines();
    for (const deadline of deadlines) {
      const daysRemaining = Math.ceil((deadline.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining >= 0 && daysRemaining <= 30) {
        nextDeadlines.push({
          type: deadline.type,
          description: this.getDeadlineDescription(deadline.type, deadline.period),
          deadline: deadline.deadline,
          daysRemaining,
        });
      }
    }

    const compliant = issues.filter((i) => i.severity === "high" || i.severity === "critical").length === 0;

    return {
      compliant,
      issues,
      nextDeadlines,
    };
  }

  /**
   * Check VAT compliance
   */
  private async checkVATCompliance(
    tenantId: string,
    clientCompanyId: string
  ): Promise<Array<{
    type: "vat";
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    deadline?: Date;
    actionRequired: string;
  }>> {
    const issues: Array<{
      type: "vat";
      severity: "low" | "medium" | "high" | "critical";
      title: string;
      description: string;
      deadline?: Date;
      actionRequired: string;
    }> = [];

    // Check for missing VAT declarations
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientCompanyId,
        issueDate: {
          gte: lastMonth,
        },
      },
    });

    if (invoices.length > 0) {
      // Check if VAT return was prepared (simplified - would need actual declaration tracking)
      const hasVATReturn = false; // Would check actual VAT return records

      if (!hasVATReturn) {
        const deadline = this.getVATDeadline(lastMonth);
        const isOverdue = new Date() > deadline;

        issues.push({
          type: "vat",
          severity: isOverdue ? "critical" : "high",
          title: "KDV Beyannamesi Eksik",
          description: `${lastMonth.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })} dönemi için KDV beyannamesi hazırlanmamış.`,
          deadline,
          actionRequired: "KDV beyannamesi hazırlanmalı ve GIB'e sunulmalı.",
        });
      }
    }

    return issues;
  }

  /**
   * Check corporate tax compliance
   */
  private async checkCorporateTaxCompliance(
    tenantId: string,
    clientCompanyId: string
  ): Promise<Array<{
    type: "corporate_tax";
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    deadline?: Date;
    actionRequired: string;
  }>> {
    const issues: Array<{
      type: "corporate_tax";
      severity: "low" | "medium" | "high" | "critical";
      title: string;
      description: string;
      deadline?: Date;
      actionRequired: string;
    }> = [];

    // Corporate tax is typically quarterly or annual
    // Check for missing declarations
    const currentYear = new Date().getFullYear();
    const hasAnnualReturn = false; // Would check actual return records

    if (!hasAnnualReturn) {
      const deadline = new Date(currentYear + 1, 3, 30); // April 30 of next year
      const isOverdue = new Date() > deadline;

      if (isOverdue) {
        issues.push({
          type: "corporate_tax",
          severity: "critical",
          title: "Kurumlar Vergisi Beyannamesi Eksik",
          description: `${currentYear} yılı için kurumlar vergisi beyannamesi sunulmamış.`,
          deadline,
          actionRequired: "Kurumlar vergisi beyannamesi acilen hazırlanmalı.",
        });
      }
    }

    return issues;
  }

  /**
   * Check withholding tax compliance
   */
  private async checkWithholdingTaxCompliance(
    tenantId: string,
    clientCompanyId: string
  ): Promise<Array<{
    type: "withholding";
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    deadline?: Date;
    actionRequired: string;
  }>> {
    const issues: Array<{
      type: "withholding";
      severity: "low" | "medium" | "high" | "critical";
      title: string;
      description: string;
      deadline?: Date;
      actionRequired: string;
    }> = [];

    // Withholding tax is typically monthly
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);

    const hasWithholdingReturn = false; // Would check actual return records

    if (!hasWithholdingReturn) {
      const deadline = this.getWithholdingTaxDeadline(lastMonth);
      const isOverdue = new Date() > deadline;

      issues.push({
        type: "withholding",
        severity: isOverdue ? "high" : "medium",
        title: "Stopaj Beyannamesi Eksik",
        description: `${lastMonth.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })} dönemi için stopaj beyannamesi hazırlanmamış.`,
        deadline,
        actionRequired: "Stopaj beyannamesi hazırlanmalı.",
      });
    }

    return issues;
  }

  /**
   * Check social security compliance
   */
  private async checkSocialSecurityCompliance(
    tenantId: string,
    clientCompanyId: string
  ): Promise<Array<{
    type: "social_security";
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    deadline?: Date;
    actionRequired: string;
  }>> {
    const issues: Array<{
      type: "social_security";
      severity: "low" | "medium" | "high" | "critical";
      title: string;
      description: string;
      deadline?: Date;
      actionRequired: string;
    }> = [];

    // Social security contributions are typically monthly
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);

    const hasSocialSecurityPayment = false; // Would check actual payment records

    if (!hasSocialSecurityPayment) {
      const deadline = this.getSocialSecurityDeadline(lastMonth);
      const isOverdue = new Date() > deadline;

      issues.push({
        type: "social_security",
        severity: isOverdue ? "critical" : "high",
        title: "SGK Prim Ödemesi Eksik",
        description: `${lastMonth.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })} dönemi için SGK prim ödemesi yapılmamış.`,
        deadline,
        actionRequired: "SGK prim ödemesi acilen yapılmalı.",
      });
    }

    return issues;
  }

  /**
   * Get VAT deadline for a month
   */
  private getVATDeadline(month: Date): Date {
    // VAT declarations are due on the 24th of the following month
    const deadline = new Date(month);
    deadline.setMonth(deadline.getMonth() + 1);
    deadline.setDate(24);
    return deadline;
  }

  /**
   * Get withholding tax deadline
   */
  private getWithholdingTaxDeadline(month: Date): Date {
    // Withholding tax is due on the 26th of the following month
    const deadline = new Date(month);
    deadline.setMonth(deadline.getMonth() + 1);
    deadline.setDate(26);
    return deadline;
  }

  /**
   * Get social security deadline
   */
  private getSocialSecurityDeadline(month: Date): Date {
    // Social security is due on the 15th of the following month
    const deadline = new Date(month);
    deadline.setMonth(deadline.getMonth() + 1);
    deadline.setDate(15);
    return deadline;
  }

  /**
   * Get upcoming tax deadlines
   */
  private getUpcomingDeadlines(): TaxDeadline[] {
    const deadlines: TaxDeadline[] = [];
    const now = new Date();

    // Get deadlines for next 3 months
    for (let i = 0; i < 3; i++) {
      const month = new Date(now);
      month.setMonth(month.getMonth() + i);
      month.setDate(1);

      const period = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

      deadlines.push({
        type: "vat",
        period,
        deadline: this.getVATDeadline(month),
        status: "pending",
      });

      deadlines.push({
        type: "withholding",
        period,
        deadline: this.getWithholdingTaxDeadline(month),
        status: "pending",
      });

      deadlines.push({
        type: "social_security",
        period,
        deadline: this.getSocialSecurityDeadline(month),
        status: "pending",
      });
    }

    // Sort by deadline
    return deadlines.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  }

  /**
   * Get deadline description
   */
  private getDeadlineDescription(type: string, period: string): string {
    const typeLabels: Record<string, string> = {
      vat: "KDV Beyannamesi",
      corporate_tax: "Kurumlar Vergisi",
      withholding: "Stopaj Beyannamesi",
      social_security: "SGK Prim Ödemesi",
    };

    return `${typeLabels[type] || type} - ${period}`;
  }
}

export const taxComplianceService = new TaxComplianceService();

