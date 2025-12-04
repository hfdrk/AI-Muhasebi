import { prisma } from "../lib/prisma";
import { connectorRegistry } from "../integrations/connectors/connector-registry";
import { InvoiceImporter } from "../integrations/importers/invoice-importer";
import { BankTransactionImporter } from "../integrations/importers/bank-transaction-importer";

export class IntegrationSyncProcessor {
  private invoiceImporter = new InvoiceImporter();
  private bankTransactionImporter = new BankTransactionImporter();

  async processSyncJob(jobId: string): Promise<void> {
    // Load job with integration and provider
    const job = await prisma.integrationSyncJob.findUnique({
      where: { id: jobId },
      include: {
        tenantIntegration: {
          include: {
            provider: true,
          },
        },
      },
    });

    if (!job) {
      throw new Error(`Sync job ${jobId} not found`);
    }

    if (job.status !== "pending") {
      console.log(`Job ${jobId} is not pending, skipping`);
      return;
    }

    // Mark as in progress
    await prisma.integrationSyncJob.update({
      where: { id: jobId },
      data: {
        status: "in_progress",
        startedAt: new Date(),
      },
    });

    // Update integration status
    await prisma.tenantIntegration.update({
      where: { id: job.tenantIntegrationId },
      data: {
        lastSyncStatus: "in_progress",
      },
    });

    try {
      const connector = connectorRegistry.getConnector(
        job.tenantIntegration.provider.code,
        job.tenantIntegration.provider.type as "accounting" | "bank"
      );

      if (!connector) {
        throw new Error(`Connector not found for provider ${job.tenantIntegration.provider.code}`);
      }

      // Calculate date range (since last sync or last 30 days)
      const untilDate = new Date();
      const sinceDate = job.tenantIntegration.lastSyncAt
        ? new Date(job.tenantIntegration.lastSyncAt)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      let importSummary: any;

      if (job.jobType === "pull_invoices") {
        if (!("fetchInvoices" in connector)) {
          throw new Error("Invalid connector type for invoice sync");
        }

        const invoices = await (connector as any).fetchInvoices(sinceDate, untilDate);
        importSummary = await this.invoiceImporter.importInvoices(
          job.tenantId,
          invoices,
          job.tenantIntegrationId
        );

        // Log import results
        await prisma.integrationSyncLog.create({
          data: {
            tenantId: job.tenantId,
            tenantIntegrationId: job.tenantIntegrationId,
            level: "info",
            message: `Fatura senkronizasyonu tamamlandı: ${importSummary.created} oluşturuldu, ${importSummary.updated} güncellendi, ${importSummary.skipped} atlandı`,
            context: {
              created: importSummary.created,
              updated: importSummary.updated,
              skipped: importSummary.skipped,
              errors: importSummary.errors,
            },
          },
        });
      } else if (job.jobType === "pull_bank_transactions") {
        if (!("fetchTransactions" in connector)) {
          throw new Error("Invalid connector type for bank transaction sync");
        }

        const transactions = await (connector as any).fetchTransactions(sinceDate, untilDate);
        importSummary = await this.bankTransactionImporter.importTransactions(
          job.tenantId,
          transactions,
          job.tenantIntegrationId
        );

        // Log import results
        await prisma.integrationSyncLog.create({
          data: {
            tenantId: job.tenantId,
            tenantIntegrationId: job.tenantIntegrationId,
            level: "info",
            message: `Banka işlemi senkronizasyonu tamamlandı: ${importSummary.created} oluşturuldu, ${importSummary.updated} güncellendi, ${importSummary.skipped} atlandı`,
            context: {
              created: importSummary.created,
              updated: importSummary.updated,
              skipped: importSummary.skipped,
              errors: importSummary.errors,
            },
          },
        });
      } else {
        throw new Error(`Unknown job type: ${job.jobType}`);
      }

      // Mark job as success
      await prisma.integrationSyncJob.update({
        where: { id: jobId },
        data: {
          status: "success",
          finishedAt: new Date(),
        },
      });

      // Update integration last sync
      await prisma.tenantIntegration.update({
        where: { id: job.tenantIntegrationId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "success",
        },
      });
    } catch (error: any) {
      const errorMessage = error.message || "Bilinmeyen hata";

      // Mark job as failed
      await prisma.integrationSyncJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          finishedAt: new Date(),
          errorMessage,
        },
      });

      // Update integration status
      await prisma.tenantIntegration.update({
        where: { id: job.tenantIntegrationId },
        data: {
          lastSyncStatus: "error",
        },
      });

      // Log error
      await prisma.integrationSyncLog.create({
        data: {
          tenantId: job.tenantId,
          tenantIntegrationId: job.tenantIntegrationId,
          level: "error",
          message: `Senkronizasyon hatası: ${errorMessage}`,
          context: {
            jobId,
            jobType: job.jobType,
            error: errorMessage,
          },
        },
      });

      throw error;
    }
  }
}

export const integrationSyncProcessor = new IntegrationSyncProcessor();

