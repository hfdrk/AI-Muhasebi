import { prisma } from "../lib/prisma";
import type {
  UsageMetricType,
  UsageSummary,
  LimitCheckResult,
  PlanConfig,
} from "@repo/core-domain";
import { subscriptionService } from "./subscription-service";

export class UsageService {
  /**
   * Get current period (start and end of current month)
   */
  private getCurrentPeriod(): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { periodStart, periodEnd };
  }

  /**
   * Get usage value for a specific metric in the current period
   */
  private async getUsageValue(
    tenantId: string,
    metric: UsageMetricType,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    const usage = await prisma.tenantUsage.findUnique({
      where: {
        tenantId_metric_periodStart: {
          tenantId,
          metric: metric as string,
          periodStart,
        },
      },
    });

    return usage?.value ?? 0;
  }

  /**
   * Get usage summary for all metrics for a tenant
   */
  async getUsageForTenant(tenantId: string): Promise<UsageSummary> {
    const subscription = await subscriptionService.getTenantSubscription(tenantId);
    const planConfig = subscription.planConfig;
    const { periodStart, periodEnd } = this.getCurrentPeriod();

    // Get usage for all metrics
    const [clientCompanies, documents, aiAnalyses, users, scheduledReports] = await Promise.all([
      this.getUsageValue(tenantId, "CLIENT_COMPANIES" as UsageMetricType, periodStart, periodEnd),
      this.getUsageValue(tenantId, "DOCUMENTS" as UsageMetricType, periodStart, periodEnd),
      this.getUsageValue(tenantId, "AI_ANALYSES" as UsageMetricType, periodStart, periodEnd),
      this.getUsageValue(tenantId, "USERS" as UsageMetricType, periodStart, periodEnd),
      this.getUsageValue(tenantId, "SCHEDULED_REPORTS" as UsageMetricType, periodStart, periodEnd),
    ]);

    return {
      clientCompanies: {
        used: clientCompanies,
        limit: planConfig.maxClientCompanies,
        remaining: Math.max(0, planConfig.maxClientCompanies - clientCompanies),
      },
      documents: {
        used: documents,
        limit: planConfig.maxDocumentsPerMonth,
        remaining: Math.max(0, planConfig.maxDocumentsPerMonth - documents),
      },
      aiAnalyses: {
        used: aiAnalyses,
        limit: planConfig.maxAiAnalysesPerMonth,
        remaining: Math.max(0, planConfig.maxAiAnalysesPerMonth - aiAnalyses),
      },
      users: {
        used: users,
        limit: planConfig.maxUsers,
        remaining: Math.max(0, planConfig.maxUsers - users),
      },
      scheduledReports: {
        used: scheduledReports,
        limit: planConfig.maxScheduledReports,
        remaining: Math.max(0, planConfig.maxScheduledReports - scheduledReports),
      },
    };
  }

  /**
   * Increment usage for a metric
   */
  async incrementUsage(tenantId: string, metric: UsageMetricType, amount: number = 1): Promise<void> {
    const { periodStart, periodEnd } = this.getCurrentPeriod();

    await prisma.tenantUsage.upsert({
      where: {
        tenantId_metric_periodStart: {
          tenantId,
          metric: metric as string,
          periodStart,
        },
      },
      create: {
        tenantId,
        metric: metric as string,
        periodStart,
        periodEnd,
        value: amount,
      },
      update: {
        value: {
          increment: amount,
        },
      },
    });
  }

  /**
   * Check if a limit is exceeded for a metric
   */
  async checkLimit(tenantId: string, metric: UsageMetricType): Promise<LimitCheckResult> {
    const subscription = await subscriptionService.getTenantSubscription(tenantId);
    const planConfig = subscription.planConfig;
    const { periodStart } = this.getCurrentPeriod();

    // Get current usage
    const currentUsage = await this.getUsageValue(tenantId, metric, periodStart, this.getCurrentPeriod().periodEnd);

    // Get limit based on metric type
    let limit: number;
    switch (metric) {
      case "CLIENT_COMPANIES":
        limit = planConfig.maxClientCompanies;
        break;
      case "DOCUMENTS":
        limit = planConfig.maxDocumentsPerMonth;
        break;
      case "AI_ANALYSES":
        limit = planConfig.maxAiAnalysesPerMonth;
        break;
      case "USERS":
        limit = planConfig.maxUsers;
        break;
      case "SCHEDULED_REPORTS":
        limit = planConfig.maxScheduledReports;
        break;
      default:
        limit = Number.MAX_SAFE_INTEGER;
    }

    const remaining = Math.max(0, limit - currentUsage);
    const allowed = remaining > 0;

    return {
      allowed,
      remaining,
      limit,
    };
  }
}

export const usageService = new UsageService();

