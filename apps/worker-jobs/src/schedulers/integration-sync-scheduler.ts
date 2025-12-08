import { prisma } from "../lib/prisma";

export class IntegrationSyncScheduler {
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

      console.log(
        `Created sync job for integration ${integration.id} (${integration.provider.name})`
      );
    }
  }
}

export const integrationSyncScheduler = new IntegrationSyncScheduler();




