import { prisma } from "../lib/prisma";
import { notificationService } from "./notification-service";
import type { ParsedContractFields } from "@repo/core-domain";

export interface ContractAnalysisResult {
  contractId: string;
  documentId: string;
  clientCompanyId: string;
  clientCompanyName: string;
  contractNumber?: string | null;
  expirationDate?: string | null; // ISO string format for JSON serialization
  daysUntilExpiration: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  contractValue?: number | null;
  currency?: string | null;
  contractType?: string | null;
  renewalTerms?: string | null;
}

export interface ContractExpirationCheckResult {
  checked: number;
  expiringSoon: number;
  expired: number;
  alertsCreated: number;
}

/**
 * Service for analyzing contracts and managing expiration alerts
 */
export class ContractAnalysisService {
  /**
   * Parse date string - supports multiple formats
   * Formats: ISO (YYYY-MM-DD), DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
   */
  private parseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;

    try {
      // Try ISO format first (YYYY-MM-DD or full ISO string)
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }

      // Try YYYY-MM-DD format explicitly
      const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10) - 1; // Month is 0-indexed
        const day = parseInt(isoMatch[3], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // Try DD.MM.YYYY or DD/MM/YYYY format
      const parts = dateStr.split(/[.\/]/);
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    } catch (error) {
      console.error(`[ContractAnalysisService] Error parsing date: ${dateStr}`, error);
    }

    return null;
  }

  /**
   * Check if a notification for this contract was already sent recently
   */
  private async hasRecentNotification(
    tenantId: string,
    contractId: string,
    hours: number = 24
  ): Promise<boolean> {
    // Fetch recent notifications and check meta field in JavaScript
    // This is more reliable than Prisma JSON filtering which can be version-dependent
    const recentNotifications = await prisma.notification.findMany({
      where: {
        tenantId,
        type: "SYSTEM",
        createdAt: {
          gte: new Date(Date.now() - hours * 60 * 60 * 1000),
        },
      },
      select: {
        meta: true,
      },
      take: 100, // Limit to recent 100 notifications for performance
    });

    // Check if any notification has matching contractId in meta
    for (const notification of recentNotifications) {
      const meta = notification.meta as any;
      if (meta && meta.contractId === contractId) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get tenant owner emails for notifications
   */
  private async getTenantOwnerEmails(tenantId: string): Promise<string[]> {
    const tenantMembers = await prisma.userTenantMembership.findMany({
      where: {
        tenantId,
        status: "active",
        role: "TenantOwner",
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    return tenantMembers
      .map((m) => m.user.email)
      .filter((email): email is string => email !== null);
  }

  /**
   * Get all contracts for a tenant with optional filters
   */
  async getContracts(
    tenantId: string,
    filters?: {
      clientCompanyId?: string;
      contractType?: string;
      status?: "all" | "expiring" | "expired" | "active";
      minValue?: number;
      maxValue?: number;
    }
  ): Promise<ContractAnalysisResult[]> {
    // Build where clause with filters
    const whereClause: any = {
      tenantId,
      documentType: "contract",
    };

    // Note: clientCompanyId filter is applied after fetching (in the results loop)
    // because Prisma doesn't easily support nested filtering on included relations

    const contracts = await prisma.documentParsedData.findMany({
      where: whereClause,
      include: {
        document: {
          include: {
            clientCompany: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const results: ContractAnalysisResult[] = [];

    for (const contract of contracts) {
      const fields = contract.fields as ParsedContractFields;
      const expirationDateStr = fields.expirationDate || fields.endDate;
      const expirationDate = this.parseDate(expirationDateStr);

      const now = new Date();
      let daysUntilExpiration: number | null = null;
      let isExpired = false;
      let isExpiringSoon = false;

      if (expirationDate) {
        const diffTime = expirationDate.getTime() - now.getTime();
        daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        isExpired = daysUntilExpiration < 0;
        isExpiringSoon = daysUntilExpiration >= 0 && daysUntilExpiration <= 90; // Within 90 days
      }

      const result: ContractAnalysisResult = {
        contractId: contract.id,
        documentId: contract.documentId,
        clientCompanyId: contract.document.clientCompanyId || "",
        clientCompanyName: contract.document.clientCompany?.name || "Bilinmeyen Müşteri",
        contractNumber: fields.contractNumber || null,
        expirationDate: expirationDate ? expirationDate.toISOString() : null,
        daysUntilExpiration,
        isExpired,
        isExpiringSoon,
        contractValue: fields.value || null,
        currency: fields.currency || null,
        contractType: fields.contractType || null,
        renewalTerms: fields.renewalTerms || null,
      };

      // Apply filters
      if (filters) {
        // Filter by client company ID
        if (filters.clientCompanyId && result.clientCompanyId !== filters.clientCompanyId) {
          continue;
        }

        // Filter by contract type
        if (filters.contractType && result.contractType !== filters.contractType) {
          continue;
        }

        // Filter by status
        if (filters.status) {
          if (filters.status === "expired" && !result.isExpired) continue;
          if (filters.status === "expiring" && (!result.isExpiringSoon || result.isExpired)) continue;
          if (filters.status === "active" && (result.isExpired || result.isExpiringSoon)) continue;
        }

        // Filter by value range
        if (filters.minValue !== undefined && (result.contractValue || 0) < filters.minValue) {
          continue;
        }
        if (filters.maxValue !== undefined && (result.contractValue || 0) > filters.maxValue) {
          continue;
        }
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Get contracts expiring within specified days
   */
  async getExpiringContracts(
    tenantId: string,
    days: number = 90
  ): Promise<ContractAnalysisResult[]> {
    const allContracts = await this.getContracts(tenantId);
    return allContracts.filter(
      (contract) =>
        contract.expirationDate &&
        contract.daysUntilExpiration !== null &&
        contract.daysUntilExpiration >= 0 &&
        contract.daysUntilExpiration <= days
    );
  }

  /**
   * Get expired contracts
   */
  async getExpiredContracts(tenantId: string): Promise<ContractAnalysisResult[]> {
    const allContracts = await this.getContracts(tenantId);
    return allContracts.filter((contract) => contract.isExpired);
  }

  /**
   * Check for expiring contracts and create alerts
   * Should be called periodically (e.g., daily cron job)
   */
  async checkContractExpirations(
    tenantId: string
  ): Promise<ContractExpirationCheckResult> {
    const allContracts = await this.getContracts(tenantId);

    let expiringSoon = 0;
    let expired = 0;
    let alertsCreated = 0;

    for (const contract of allContracts) {
      if (!contract.expirationDate || contract.daysUntilExpiration === null) {
        continue;
      }

      const daysUntilExpiration = contract.daysUntilExpiration;

      // Check if expired
      if (daysUntilExpiration < 0) {
        expired++;
        
        // Check if notification was already sent recently (prevent duplicates)
        const hasRecent = await this.hasRecentNotification(tenantId, contract.contractId, 24);
        if (hasRecent) {
          continue; // Skip if notification already sent within last 24 hours
        }

        // Create alert for expired contract
        try {
          const notification = await notificationService.createNotification({
            tenantId,
            userId: null,
            type: "SYSTEM",
            title: "Sözleşme Süresi Doldu",
            message: `${contract.clientCompanyName} için sözleşme ${contract.contractNumber || ""} süresi doldu (${Math.abs(daysUntilExpiration)} gün önce).`,
            meta: {
              contractId: contract.contractId,
              documentId: contract.documentId,
              clientCompanyId: contract.clientCompanyId,
              contractNumber: contract.contractNumber,
              expirationDate: contract.expirationDate ? (typeof contract.expirationDate === 'string' ? contract.expirationDate : contract.expirationDate.toISOString()) : null,
            },
          });

          // Send email notification
          try {
            const { emailService } = await import("./email-service");
            const recipientEmails = await this.getTenantOwnerEmails(tenantId);
            
            if (recipientEmails.length > 0) {
              await emailService.sendNotificationEmail(
                recipientEmails,
                "CONTRACT_EXPIRATION",
                notification.title,
                notification.message,
                `Sözleşme Detayları:\n- Müşteri: ${contract.clientCompanyName}\n- Sözleşme No: ${contract.contractNumber || "Yok"}\n- Bitiş Tarihi: ${contract.expirationDate ? new Date(contract.expirationDate).toLocaleDateString("tr-TR") : "Bilinmiyor"}\n- Süre Dolalı: ${Math.abs(daysUntilExpiration)} gün önce`,
                tenantId
              );
            }
          } catch (emailError: any) {
            // Don't fail notification creation if email fails
            console.error(
              `[ContractAnalysisService] Failed to send email notification for expired contract: ${contract.contractId}`,
              emailError
            );
          }

          alertsCreated++;
        } catch (error) {
          console.error(
            `[ContractAnalysisService] Error creating notification for expired contract: ${contract.contractId}`,
            error
          );
        }
      }
      // Check if expiring soon (within 90 days)
      else if (daysUntilExpiration <= 90) {
        expiringSoon++;

        // Check if notification was already sent recently (prevent duplicates)
        // Use different time windows based on urgency
        const hoursWindow = daysUntilExpiration <= 30 ? 24 : daysUntilExpiration <= 60 ? 48 : 72;
        const hasRecent = await this.hasRecentNotification(tenantId, contract.contractId, hoursWindow);
        if (hasRecent) {
          continue; // Skip if notification already sent recently
        }

        // Create alert based on urgency
        let title: string;
        let message: string;
        let severity: "low" | "medium" | "high" = "medium";

        if (daysUntilExpiration <= 30) {
          title = "Sözleşme Süresi Yakında Doluyor (Acil)";
          message = `${contract.clientCompanyName} için sözleşme ${contract.contractNumber || ""} ${daysUntilExpiration} gün içinde dolacak.`;
          severity = "high";
        } else if (daysUntilExpiration <= 60) {
          title = "Sözleşme Süresi Yakında Doluyor";
          message = `${contract.clientCompanyName} için sözleşme ${contract.contractNumber || ""} ${daysUntilExpiration} gün içinde dolacak.`;
          severity = "medium";
        } else {
          title = "Sözleşme Süresi Yaklaşıyor";
          message = `${contract.clientCompanyName} için sözleşme ${contract.contractNumber || ""} ${daysUntilExpiration} gün içinde dolacak.`;
          severity = "low";
        }

        try {
          const notification = await notificationService.createNotification({
            tenantId,
            userId: null,
            type: "SYSTEM",
            title,
            message,
            meta: {
              contractId: contract.contractId,
              documentId: contract.documentId,
              clientCompanyId: contract.clientCompanyId,
              contractNumber: contract.contractNumber,
              expirationDate: contract.expirationDate ? (typeof contract.expirationDate === 'string' ? contract.expirationDate : contract.expirationDate.toISOString()) : null,
              daysUntilExpiration,
            },
          });

          // Send email notification
          try {
            const { emailService } = await import("./email-service");
            const recipientEmails = await this.getTenantOwnerEmails(tenantId);
            
            if (recipientEmails.length > 0) {
              const details = `Sözleşme Detayları:\n- Müşteri: ${contract.clientCompanyName}\n- Sözleşme No: ${contract.contractNumber || "Yok"}\n- Bitiş Tarihi: ${contract.expirationDate ? new Date(contract.expirationDate).toLocaleDateString("tr-TR") : "Bilinmiyor"}\n- Kalan Süre: ${daysUntilExpiration} gün${contract.contractValue ? `\n- Değer: ${contract.contractValue} ${contract.currency || "TL"}` : ""}`;
              
              await emailService.sendNotificationEmail(
                recipientEmails,
                "CONTRACT_EXPIRATION",
                notification.title,
                notification.message,
                details,
                tenantId
              );
            }
          } catch (emailError: any) {
            // Don't fail notification creation if email fails
            console.error(
              `[ContractAnalysisService] Failed to send email notification for expiring contract: ${contract.contractId}`,
              emailError
            );
          }

          alertsCreated++;
        } catch (error) {
          console.error(
            `[ContractAnalysisService] Error creating notification for expiring contract: ${contract.contractId}`,
            error
          );
        }
      }
    }

    return {
      checked: allContracts.length,
      expiringSoon,
      expired,
      alertsCreated,
    };
  }

  /**
   * Get contract analysis summary for a tenant
   */
  async getContractSummary(tenantId: string): Promise<{
    total: number;
    expiringSoon: number;
    expired: number;
    totalValue: number;
  }> {
    const contracts = await this.getContracts(tenantId);

    const total = contracts.length;
    const expiringSoon = contracts.filter((c) => c.isExpiringSoon && !c.isExpired).length;
    const expired = contracts.filter((c) => c.isExpired).length;
    const totalValue = contracts.reduce((sum, c) => sum + (c.contractValue || 0), 0);

    return {
      total,
      expiringSoon,
      expired,
      totalValue,
    };
  }
}

export const contractAnalysisService = new ContractAnalysisService();
