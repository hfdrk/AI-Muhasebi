import { prisma } from "../lib/prisma";
import { logger, createLLMClient } from "@repo/shared-utils";

async function getNotificationService() {
  try {
    const module = await import("../../../backend-api/src/services/notification-service.js");
    return module.notificationService;
  } catch (msg1) {
    try {
      const module = await import("../../../backend-api/src/services/notification-service");
      return module.notificationService;
    } catch (msg2) {
      throw new Error(`Failed to load NotificationService: ${msg1}, ${msg2}`);
    }
  }
}

async function getEmailService() {
  try {
    const module = await import("../../../backend-api/src/services/email-service.js");
    return module.emailService;
  } catch (msg1) {
    try {
      const module = await import("../../../backend-api/src/services/email-service");
      return module.emailService;
    } catch (msg2) {
      throw new Error(`Failed to load EmailService: ${msg1}, ${msg2}`);
    }
  }
}

// Simple AI summary generator for worker
// This duplicates some logic from backend-api AIAssistantService but keeps worker independent
async function generateDailyRiskSummary(tenantId: string, date: Date): Promise<string> {
  const llmClient = createLLMClient();

  // Get start and end of day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch risk alerts for the day
  const riskAlerts = await prisma.riskAlert.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      clientCompany: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      severity: "desc",
    },
  });

  // Build prompt
  const systemPrompt = `Sen bir muhasebe risk analiz uzmanısın. Türkçe yanıt ver. Günlük risk özetleri oluşturuyorsun.
Özetler profesyonel, özlü ve eylem odaklı olmalı.`;

  const dateStr = date.toLocaleDateString("tr-TR");
  let userPrompt = `${dateStr} tarihi için risk özeti oluştur.\n\n`;

  if (riskAlerts.length === 0) {
    userPrompt += "Bu tarihte yeni risk uyarısı yok.";
  } else {
    userPrompt += `Risk Uyarıları (${riskAlerts.length} adet):\n`;
    riskAlerts.forEach((alert) => {
      userPrompt += `- ${alert.severity.toUpperCase()}: ${alert.title}\n`;
      userPrompt += `  ${alert.message}\n`;
      if (alert.clientCompany) {
        userPrompt += `  Şirket: ${alert.clientCompany.name}\n`;
      }
      userPrompt += "\n";
    });
    userPrompt += "Yukarıdaki verilere dayanarak günlük risk özeti oluştur. Önemli noktaları vurgula ve gerekli eylemleri öner.";
  }

  return llmClient.generateText({
    systemPrompt,
    userPrompt,
    maxTokens: 1500,
  });
}

async function generatePortfolioOverview(tenantId: string): Promise<string> {
  const llmClient = createLLMClient();

  // Fetch client companies with risk scores
  const companies = await prisma.clientCompany.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    include: {
      riskScores: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
      },
    },
  });

  // Get risk alerts summary
  const riskAlertsSummary = await prisma.riskAlert.groupBy({
    by: ["severity"],
    where: {
      tenantId,
      status: "open",
    },
    _count: {
      id: true,
    },
  });

  // Build prompt
  const systemPrompt = `Sen bir muhasebe portföy analiz uzmanısın. Türkçe yanıt ver. Müşteri portföyü özetleri oluşturuyorsun.
Özetler profesyonel, kapsamlı ve stratejik olmalı.`;

  let userPrompt = "Müşteri portföyü özeti oluştur.\n\n";
  userPrompt += `Toplam Aktif Müşteri: ${companies.length}\n`;

  if (riskAlertsSummary.length > 0) {
    userPrompt += "Açık Risk Uyarıları:\n";
    riskAlertsSummary.forEach((group) => {
      userPrompt += `- ${group.severity.toUpperCase()}: ${group._count.id} adet\n`;
    });
    userPrompt += "\n";
  }

  // Risk distribution
  const highRiskCompanies = companies.filter((c) => {
    const score = c.riskScores[0];
    return score && score.overallScore >= 70;
  });

  const mediumRiskCompanies = companies.filter((c) => {
    const score = c.riskScores[0];
    return score && score.overallScore >= 40 && score.overallScore < 70;
  });

  userPrompt += "Risk Dağılımı:\n";
  userPrompt += `- Yüksek Risk (≥70): ${highRiskCompanies.length} şirket\n`;
  userPrompt += `- Orta Risk (40-69): ${mediumRiskCompanies.length} şirket\n`;
  userPrompt += `- Düşük Risk (<40): ${companies.length - highRiskCompanies.length - mediumRiskCompanies.length} şirket\n\n`;

  userPrompt += "Yukarıdaki verilere dayanarak kapsamlı bir portföy özeti oluştur. Risk dağılımını, önemli trendleri ve önerileri içer.";

  return llmClient.generateText({
    systemPrompt,
    userPrompt,
    maxTokens: 2000,
  });
}

/**
 * AI Summary Runner
 * 
 * Generates scheduled AI summaries (daily risk summaries, portfolio overviews)
 * and sends them via notifications and email stubs.
 */
export class AISummaryRunner {
  /**
   * Run once - generate AI summaries for all active tenants
   * 
   * This method should be called periodically (e.g., daily at 9 AM) to generate
   * AI summaries for tenants that have this feature enabled.
   * 
   * For MVP, we generate summaries for all tenants. In the future, this could
   * be controlled via tenant settings.
   */
  async runOnce(): Promise<void> {
    try {
      // Get all active tenants
      const tenants = await prisma.tenant.findMany({
        where: {
          isActive: true,
        },
        include: {
          memberships: {
            where: {
              status: "active",
              role: {
                in: ["TenantOwner", "Accountant"],
              },
            },
            take: 1, // Get first active owner/accountant for user context
          },
        },
      });

      if (tenants.length === 0) {
        return;
      }

      logger.info(`[AISummaryRunner] Processing ${tenants.length} tenant(s) for AI summaries`);

      const notificationService = await getNotificationService();
      const emailService = await getEmailService();

      // Process each tenant
      for (const tenant of tenants) {
        try {
          // Get a user for context (first owner/accountant)
          const user = tenant.memberships[0];
          if (!user) {
            logger.warn(`[AISummaryRunner] No active user found for tenant ${tenant.id}, skipping`);
            continue;
          }

          // Generate daily risk summary
          await this.generateDailyRiskSummary(
            tenant.id,
            user.userId,
            notificationService,
            emailService
          );

          // Generate portfolio overview (weekly - only on Mondays)
          const today = new Date();
          if (today.getDay() === 1) {
            // Monday
            await this.generatePortfolioSummary(
              tenant.id,
              user.userId,
              notificationService,
              emailService
            );
          }
        } catch (error: any) {
          // Log error but continue with other tenants
          logger.error(`[AISummaryRunner] Error processing tenant ${tenant.id}:`, error.message);
        }
      }
    } catch (error: any) {
      // Never throw unhandled errors from worker loop
      logger.error("[AISummaryRunner] Error in runOnce:", error.message, error.stack);
    }
  }

  /**
   * Generate daily risk summary for a tenant
   */
  private async generateDailyRiskSummary(
    tenantId: string,
    userId: string,
    notificationService: any,
    emailService: any
  ): Promise<void> {
    try {
      const today = new Date();
      const summary = await generateDailyRiskSummary(tenantId, today);

      // Create notification
      await notificationService.createNotification({
        tenantId,
        userId: null, // System notification
        type: "SYSTEM",
        title: "Günlük AI risk özeti hazır",
        message: summary.substring(0, 200) + (summary.length > 200 ? "..." : ""),
        meta: {
          summaryType: "DAILY_RISK",
          date: today.toISOString(),
        },
      });

      // Send email stub (if email service is configured)
      // For MVP, we just log it
      logger.info(`[AISummaryRunner] Daily risk summary generated for tenant ${tenantId}`);

      // In production, you would send email:
      // await emailService.sendEmail({
      //   to: user.email,
      //   subject: "Günlük Risk Özeti",
      //   body: summary,
      // });
    } catch (error: any) {
      logger.error(
        `[AISummaryRunner] Error generating daily risk summary for tenant ${tenantId}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Generate portfolio overview for a tenant
   */
  private async generatePortfolioSummary(
    tenantId: string,
    userId: string,
    notificationService: any,
    emailService: any
  ): Promise<void> {
    try {
      const summary = await generatePortfolioOverview(tenantId);

      // Create notification
      await notificationService.createNotification({
        tenantId,
        userId: null, // System notification
        type: "SYSTEM",
        title: "Haftalık portföy özeti hazır",
        message: summary.substring(0, 200) + (summary.length > 200 ? "..." : ""),
        meta: {
          summaryType: "PORTFOLIO",
        },
      });

      logger.info(`[AISummaryRunner] Portfolio summary generated for tenant ${tenantId}`);

      // In production, you would send email:
      // await emailService.sendEmail({
      //   to: user.email,
      //   subject: "Haftalık Portföy Özeti",
      //   body: summary,
      // });
    } catch (error: any) {
      logger.error(
        `[AISummaryRunner] Error generating portfolio summary for tenant ${tenantId}:`,
        error.message
      );
      throw error;
    }
  }
}

export const aiSummaryRunner = new AISummaryRunner();

