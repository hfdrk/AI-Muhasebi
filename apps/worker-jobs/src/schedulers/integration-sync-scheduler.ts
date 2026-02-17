import { prisma } from "../lib/prisma";
import { connectorRegistry } from "../integrations/connectors/connector-registry";
import { logger } from "@repo/shared-utils";

export class IntegrationSyncScheduler {
  /**
   * Schedule recurring pull syncs (existing functionality)
   */
  async scheduleRecurringSyncs(): Promise<void> {
    // Find all active connected integrations
    const integrations = await prisma.tenantIntegration.findMany({
      where: {
        status: "connected",
      },
      include: {
        provider: true,
      },
    });

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const integration of integrations) {
      // Check if we need to create a sync job
      // Create if lastSyncAt is null or older than 24 hours
      const shouldSync =
        !integration.lastSyncAt || new Date(integration.lastSyncAt) < oneDayAgo;

      if (!shouldSync) {
        continue;
      }

      // Check if there's already a pending job for this integration
      const existingJob = await prisma.integrationSyncJob.findFirst({
        where: {
          tenantIntegrationId: integration.id,
          status: {
            in: ["pending", "in_progress"],
          },
        },
      });

      if (existingJob) {
        continue; // Skip if job already exists
      }

      // Determine job type based on provider type
      let jobType: "pull_invoices" | "pull_bank_transactions";
      if (integration.provider.type === "accounting") {
        jobType = "pull_invoices";
      } else if (integration.provider.type === "bank") {
        jobType = "pull_bank_transactions";
      } else {
        continue; // Skip unknown provider types
      }

      // Create sync job
      await prisma.integrationSyncJob.create({
        data: {
          tenantId: integration.tenantId,
          clientCompanyId: integration.clientCompanyId,
          tenantIntegrationId: integration.id,
          jobType,
          status: "pending",
        },
      });

      logger.info("Created pull sync job for integration", undefined, { integrationId: integration.id, providerName: integration.provider.name });
    }
  }

  /**
   * Schedule recurring push syncs (new functionality)
   */
  async schedulePushSyncs(): Promise<void> {
    // Find all active connected integrations
    const integrations = await prisma.tenantIntegration.findMany({
      where: {
        status: "connected",
      },
      include: {
        provider: true,
      },
    });

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const integration of integrations) {
      try {
        // Get connector to check if it supports push
        const connector = connectorRegistry.getConnector(
          integration.provider.code,
          integration.provider.type as "accounting" | "bank"
        );

        if (!connector) {
          continue; // Skip if connector not found
        }

        // Check if connector supports push operations
        const supportsPushInvoices =
          integration.provider.type === "accounting" &&
          "pushInvoices" in connector &&
          typeof (connector as any).pushInvoices === "function";

        const supportsPushTransactions =
          integration.provider.type === "bank" &&
          "pushTransactions" in connector &&
          typeof (connector as any).pushTransactions === "function";

        if (!supportsPushInvoices && !supportsPushTransactions) {
          continue; // Skip if connector doesn't support push
        }

        // Check if push sync is enabled in config (default to true if not set)
        const config = integration.config as Record<string, unknown> | null;
        const pushSyncEnabled = config?.pushSyncEnabled !== false; // Default to true

        if (!pushSyncEnabled) {
          continue; // Skip if push sync is disabled
        }

        // Check push sync frequency (default to daily)
        const pushSyncFrequency = config?.pushSyncFrequency || "daily";
        const pushSyncIntervalMs = this.getPushSyncIntervalMs(pushSyncFrequency as string);

        // Check if we need to create a push sync job
        // Use lastPushSyncAt if available, otherwise use lastSyncAt
        const lastPushSyncAt = (config?.lastPushSyncAt
          ? new Date(config.lastPushSyncAt as string)
          : null) || integration.lastSyncAt
          ? new Date(integration.lastSyncAt)
          : null;

        const shouldPushSync =
          !lastPushSyncAt ||
          new Date(lastPushSyncAt.getTime() + pushSyncIntervalMs) < now;

        if (!shouldPushSync) {
          continue;
        }

        // Check if there's already a pending push job for this integration
        const existingPushJob = await prisma.integrationSyncJob.findFirst({
          where: {
            tenantIntegrationId: integration.id,
            jobType: supportsPushInvoices ? "push_invoices" : "push_bank_transactions",
            status: {
              in: ["pending", "in_progress"],
            },
          },
        });

        if (existingPushJob) {
          continue; // Skip if push job already exists
        }

        // Determine push job type
        const pushJobType = supportsPushInvoices
          ? "push_invoices"
          : "push_bank_transactions";

        // Create push sync job
        await prisma.integrationSyncJob.create({
          data: {
            tenantId: integration.tenantId,
            clientCompanyId: integration.clientCompanyId,
            tenantIntegrationId: integration.id,
            jobType: pushJobType,
            status: "pending",
          },
        });

        logger.info("Created push sync job for integration", undefined, { integrationId: integration.id, providerName: integration.provider.name });
      } catch (error: any) {
        logger.error("Error scheduling push sync for integration", error, { integrationId: integration.id });
        // Continue with other integrations
      }
    }
  }

  /**
   * Get push sync interval in milliseconds based on frequency
   */
  private getPushSyncIntervalMs(frequency: string): number {
    switch (frequency) {
      case "hourly":
        return 60 * 60 * 1000; // 1 hour
      case "daily":
        return 24 * 60 * 60 * 1000; // 1 day
      case "weekly":
        return 7 * 24 * 60 * 60 * 1000; // 1 week
      case "monthly":
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      default:
        return 24 * 60 * 60 * 1000; // Default to daily
    }
  }

  /**
   * Schedule both pull and push syncs
   */
  async scheduleAllSyncs(): Promise<void> {
    await this.scheduleRecurringSyncs();
    await this.schedulePushSyncs();
  }
}

export const integrationSyncScheduler = new IntegrationSyncScheduler();





