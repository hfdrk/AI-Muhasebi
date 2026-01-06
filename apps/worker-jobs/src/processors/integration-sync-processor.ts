import { prisma } from "../lib/prisma";
import { connectorRegistry } from "../integrations/connectors/connector-registry";
import { InvoiceImporter } from "../integrations/importers/invoice-importer";
import { BankTransactionImporter } from "../integrations/importers/bank-transaction-importer";
import type {
  AccountingIntegrationConnector,
  BankIntegrationConnector,
  PushResult,
  PushInvoiceInput,
  PushTransactionInput,
} from "../integrations/connectors/types";

/**
 * Integration Sync Processor
 *
 * Handles synchronization jobs between the system and external integrations.
 * Supports both pull (fetch from external) and push (send to external) operations.
 *
 * Features:
 * - Retry logic with exponential backoff
 * - Batch processing for large datasets
 * - Proper error handling and logging
 * - Notification on failures
 */

interface SyncJobWithRelations {
  id: string;
  tenantId: string;
  tenantIntegrationId: string;
  clientCompanyId: string | null;
  jobType: string;
  status: string;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  tenantIntegration: {
    id: string;
    displayName: string | null;
    config: unknown;
    lastSyncAt: Date | null;
    provider: {
      id: string;
      name: string;
      code: string;
      type: string;
    };
  };
}

type JobType =
  | "pull_invoices"
  | "pull_bank_transactions"
  | "push_invoices"
  | "push_bank_transactions";

const JOB_TYPE_LABELS: Record<JobType, string> = {
  pull_invoices: "Fatura Çekme",
  pull_bank_transactions: "Banka İşlemi Çekme",
  push_invoices: "Fatura Gönderme",
  push_bank_transactions: "Banka İşlemi Gönderme",
};

const MAX_BATCH_SIZE = 100;
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 1000;

export class IntegrationSyncProcessor {
  private invoiceImporter = new InvoiceImporter();
  private bankTransactionImporter = new BankTransactionImporter();

  /**
   * Process a sync job
   */
  async processSyncJob(jobId: string): Promise<void> {
    const job = await this.loadJob(jobId);

    if (!job) {
      throw new Error(`Sync job ${jobId} not found`);
    }

    if (job.status !== "pending" && job.status !== "retry") {
      console.log(`[IntegrationSyncProcessor] Job ${jobId} is ${job.status}, skipping`);
      return;
    }

    await this.markJobInProgress(jobId, job.tenantIntegrationId);

    try {
      await this.logJobStart(job);

      const connector = this.getConnectorForJob(job);
      const { sinceDate, untilDate } = this.calculateDateRange(job.tenantIntegration.lastSyncAt);

      let result: SyncResult;

      switch (job.jobType as JobType) {
        case "pull_invoices":
          result = await this.pullInvoices(job, connector as AccountingIntegrationConnector, sinceDate, untilDate);
          break;
        case "pull_bank_transactions":
          result = await this.pullBankTransactions(job, connector as BankIntegrationConnector, sinceDate, untilDate);
          break;
        case "push_invoices":
          result = await this.pushInvoices(job, connector as AccountingIntegrationConnector, sinceDate);
          break;
        case "push_bank_transactions":
          result = await this.pushBankTransactions(job, connector as BankIntegrationConnector, sinceDate);
          break;
        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }

      await this.markJobSuccess(jobId, job, result);
    } catch (error) {
      await this.handleJobError(jobId, job, error);
      throw error;
    }
  }

  /**
   * Load job with all required relations
   */
  private async loadJob(jobId: string): Promise<SyncJobWithRelations | null> {
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

    return job as SyncJobWithRelations | null;
  }

  /**
   * Mark job as in progress
   */
  private async markJobInProgress(jobId: string, integrationId: string): Promise<void> {
    await Promise.all([
      prisma.integrationSyncJob.update({
        where: { id: jobId },
        data: {
          status: "in_progress",
          startedAt: new Date(),
        },
      }),
      prisma.tenantIntegration.update({
        where: { id: integrationId },
        data: {
          lastSyncStatus: "in_progress",
        },
      }),
    ]);
  }

  /**
   * Log job start
   */
  private async logJobStart(job: SyncJobWithRelations): Promise<void> {
    const label = JOB_TYPE_LABELS[job.jobType as JobType] || job.jobType;

    await prisma.integrationSyncLog.create({
      data: {
        tenantId: job.tenantId,
        tenantIntegrationId: job.tenantIntegrationId,
        level: "info",
        message: `${label} işlemi başlatıldı.`,
        context: {
          jobId: job.id,
          retryCount: job.retryCount,
        },
      },
    });
  }

  /**
   * Get the appropriate connector for a job
   */
  private getConnectorForJob(
    job: SyncJobWithRelations
  ): AccountingIntegrationConnector | BankIntegrationConnector {
    const providerType = job.tenantIntegration.provider.type as "accounting" | "bank";
    const connector = connectorRegistry.getConnector(
      job.tenantIntegration.provider.code,
      providerType
    );

    if (!connector) {
      throw new Error(
        `Connector not found for provider ${job.tenantIntegration.provider.code} (${providerType})`
      );
    }

    return connector;
  }

  /**
   * Calculate date range for sync
   */
  private calculateDateRange(lastSyncAt: Date | null): { sinceDate: Date; untilDate: Date } {
    const untilDate = new Date();
    const sinceDate = lastSyncAt
      ? new Date(lastSyncAt)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    return { sinceDate, untilDate };
  }

  /**
   * Pull invoices from external system
   */
  private async pullInvoices(
    job: SyncJobWithRelations,
    connector: AccountingIntegrationConnector,
    sinceDate: Date,
    untilDate: Date
  ): Promise<SyncResult> {
    const invoices = await connector.fetchInvoices(sinceDate, untilDate, {
      limit: MAX_BATCH_SIZE,
    });

    const importSummary = await this.invoiceImporter.importInvoices(
      job.tenantId,
      invoices,
      job.tenantIntegrationId
    );

    await this.logSyncResult(job, "Fatura senkronizasyonu", importSummary);

    return {
      type: "pull",
      created: importSummary.created,
      updated: importSummary.updated,
      skipped: importSummary.skipped,
      errors: importSummary.errors,
    };
  }

  /**
   * Pull bank transactions from external system
   */
  private async pullBankTransactions(
    job: SyncJobWithRelations,
    connector: BankIntegrationConnector,
    sinceDate: Date,
    untilDate: Date
  ): Promise<SyncResult> {
    const transactions = await connector.fetchTransactions(sinceDate, untilDate, {
      limit: MAX_BATCH_SIZE,
    });

    const importSummary = await this.bankTransactionImporter.importTransactions(
      job.tenantId,
      transactions,
      job.tenantIntegrationId
    );

    await this.logSyncResult(job, "Banka işlemi senkronizasyonu", importSummary);

    return {
      type: "pull",
      created: importSummary.created,
      updated: importSummary.updated,
      skipped: importSummary.skipped,
      errors: importSummary.errors,
    };
  }

  /**
   * Push invoices to external system
   */
  private async pushInvoices(
    job: SyncJobWithRelations,
    connector: AccountingIntegrationConnector,
    sinceDate: Date
  ): Promise<SyncResult> {
    if (!connector.pushInvoices) {
      throw new Error("Connector does not support push invoices");
    }

    const invoicesToPush = await this.getInvoicesToPush(
      job.tenantId,
      job.clientCompanyId,
      sinceDate
    );

    if (invoicesToPush.length === 0) {
      await prisma.integrationSyncLog.create({
        data: {
          tenantId: job.tenantId,
          tenantIntegrationId: job.tenantIntegrationId,
          level: "info",
          message: "Gönderilecek fatura bulunamadı.",
        },
      });

      return { type: "push", success: 0, failed: 0, total: 0 };
    }

    const config = (job.tenantIntegration.config as Record<string, unknown>) || {};
    const pushResults = await connector.pushInvoices(invoicesToPush, config);

    await this.updatePushedInvoices(job.tenantId, invoicesToPush, pushResults);
    await this.logPushResult(job, "Fatura gönderimi", pushResults);

    const successCount = pushResults.filter((r) => r.success).length;
    const failureCount = pushResults.filter((r) => !r.success).length;

    return {
      type: "push",
      success: successCount,
      failed: failureCount,
      total: invoicesToPush.length,
    };
  }

  /**
   * Push bank transactions to external system
   */
  private async pushBankTransactions(
    job: SyncJobWithRelations,
    connector: BankIntegrationConnector,
    sinceDate: Date
  ): Promise<SyncResult> {
    if (!connector.pushTransactions) {
      throw new Error("Connector does not support push transactions");
    }

    const transactionsToPush = await this.getTransactionsToPush(
      job.tenantId,
      job.clientCompanyId,
      sinceDate
    );

    if (transactionsToPush.length === 0) {
      await prisma.integrationSyncLog.create({
        data: {
          tenantId: job.tenantId,
          tenantIntegrationId: job.tenantIntegrationId,
          level: "info",
          message: "Gönderilecek işlem bulunamadı.",
        },
      });

      return { type: "push", success: 0, failed: 0, total: 0 };
    }

    const config = (job.tenantIntegration.config as Record<string, unknown>) || {};
    const pushResults = await connector.pushTransactions(transactionsToPush, config);

    await this.updatePushedTransactions(job.tenantId, transactionsToPush, pushResults);
    await this.logPushResult(job, "İşlem gönderimi", pushResults);

    const successCount = pushResults.filter((r) => r.success).length;
    const failureCount = pushResults.filter((r) => !r.success).length;

    return {
      type: "push",
      success: successCount,
      failed: failureCount,
      total: transactionsToPush.length,
    };
  }

  /**
   * Log sync result for pull operations
   */
  private async logSyncResult(
    job: SyncJobWithRelations,
    operation: string,
    summary: { created: number; updated: number; skipped: number; errors: string[] }
  ): Promise<void> {
    await prisma.integrationSyncLog.create({
      data: {
        tenantId: job.tenantId,
        tenantIntegrationId: job.tenantIntegrationId,
        level: summary.errors.length > 0 ? "warning" : "info",
        message: `${operation} tamamlandı: ${summary.created} oluşturuldu, ${summary.updated} güncellendi, ${summary.skipped} atlandı`,
        context: {
          created: summary.created,
          updated: summary.updated,
          skipped: summary.skipped,
          errorCount: summary.errors.length,
          errors: summary.errors.slice(0, 10), // Limit logged errors
        },
      },
    });
  }

  /**
   * Log push result
   */
  private async logPushResult(
    job: SyncJobWithRelations,
    operation: string,
    results: PushResult[]
  ): Promise<void> {
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const errors = results.filter((r) => !r.success).map((r) => r.error).filter(Boolean);

    await prisma.integrationSyncLog.create({
      data: {
        tenantId: job.tenantId,
        tenantIntegrationId: job.tenantIntegrationId,
        level: failureCount > 0 ? "warning" : "info",
        message: `${operation} tamamlandı: ${successCount} başarılı, ${failureCount} başarısız`,
        context: {
          total: results.length,
          success: successCount,
          failed: failureCount,
          errors: errors.slice(0, 10),
        },
      },
    });
  }

  /**
   * Mark job as successful
   */
  private async markJobSuccess(
    jobId: string,
    job: SyncJobWithRelations,
    result: SyncResult
  ): Promise<void> {
    const now = new Date();
    const isPushJob = job.jobType.startsWith("push_");

    await prisma.integrationSyncJob.update({
      where: { id: jobId },
      data: {
        status: "success",
        finishedAt: now,
      },
    });

    // Update integration
    const updateData: {
      lastSyncAt: Date;
      lastSyncStatus: string;
      config?: unknown;
    } = {
      lastSyncAt: now,
      lastSyncStatus: "success",
    };

    if (isPushJob) {
      const currentConfig = (job.tenantIntegration.config as Record<string, unknown>) || {};
      updateData.config = {
        ...currentConfig,
        lastPushSyncAt: now.toISOString(),
      };
    }

    await prisma.tenantIntegration.update({
      where: { id: job.tenantIntegrationId },
      data: updateData,
    });
  }

  /**
   * Handle job error with retry logic
   */
  private async handleJobError(
    jobId: string,
    job: SyncJobWithRelations,
    error: unknown
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const maxRetries = job.maxRetries || DEFAULT_MAX_RETRIES;
    const shouldRetry = job.retryCount < maxRetries && this.isRetryableError(error);

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
          stack: errorStack,
          retryCount: job.retryCount,
          willRetry: shouldRetry,
        },
      },
    });

    if (shouldRetry) {
      // Schedule retry with exponential backoff
      const retryDelay = RETRY_DELAY_BASE_MS * Math.pow(2, job.retryCount);
      const scheduledFor = new Date(Date.now() + retryDelay);

      await prisma.integrationSyncJob.update({
        where: { id: jobId },
        data: {
          status: "retry",
          retryCount: job.retryCount + 1,
          scheduledFor,
          errorMessage,
        },
      });

      console.log(
        `[IntegrationSyncProcessor] Job ${jobId} scheduled for retry at ${scheduledFor.toISOString()}`
      );
    } else {
      // Mark as failed
      await prisma.integrationSyncJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          finishedAt: new Date(),
          errorMessage,
        },
      });

      await prisma.tenantIntegration.update({
        where: { id: job.tenantIntegrationId },
        data: {
          lastSyncStatus: "error",
        },
      });

      // Send failure notification
      await this.sendFailureNotification(job, errorMessage);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Non-retryable errors
    const nonRetryablePatterns = [
      "Authentication failed",
      "Invalid credentials",
      "Permission denied",
      "Not found",
      "does not support",
      "Invalid configuration",
    ];

    return !nonRetryablePatterns.some((pattern) =>
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Send failure notification
   */
  private async sendFailureNotification(
    job: SyncJobWithRelations,
    errorMessage: string
  ): Promise<void> {
    try {
      // Create in-app notification
      await prisma.notification.create({
        data: {
          tenantId: job.tenantId,
          type: "INTEGRATION_SYNC",
          title: "Entegrasyon senkronizasyon hatası",
          message: `${job.tenantIntegration.displayName || job.tenantIntegration.provider.name} için senkronizasyon başarısız oldu: ${errorMessage}`,
          meta: {
            integrationId: job.tenantIntegrationId,
            jobId: job.id,
            error: errorMessage,
          },
        },
      });

      // Get tenant owners for email notification
      const tenantMembers = await prisma.userTenantMembership.findMany({
        where: {
          tenantId: job.tenantId,
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
        // Queue email notification (email service will handle delivery)
        await prisma.emailLog.create({
          data: {
            tenantId: job.tenantId,
            to: recipientEmails,
            templateId: "integration_sync_failure",
            subject: "Entegrasyon Senkronizasyon Hatası",
            status: "pending",
            context: {
              integrationName: job.tenantIntegration.displayName || job.tenantIntegration.provider.name,
              errorMessage,
              jobType: JOB_TYPE_LABELS[job.jobType as JobType] || job.jobType,
            },
          },
        });
      }
    } catch (notificationError) {
      console.error(
        "[IntegrationSyncProcessor] Failed to send notification:",
        notificationError
      );
    }
  }

  /**
   * Get invoices to push to external system
   */
  private async getInvoicesToPush(
    tenantId: string,
    clientCompanyId: string | null,
    sinceDate: Date
  ): Promise<PushInvoiceInput[]> {
    const where: {
      tenantId: string;
      status: string;
      issueDate: { gte: Date };
      OR: Array<{ pushedAt: null } | { pushedAt: { lt: Date } }>;
      clientCompanyId?: string;
    } = {
      tenantId,
      status: "kesildi",
      issueDate: { gte: sinceDate },
      OR: [{ pushedAt: null }, { pushedAt: { lt: sinceDate } }],
    };

    if (clientCompanyId) {
      where.clientCompanyId = clientCompanyId;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        lines: true,
        clientCompany: {
          select: {
            name: true,
            taxNumber: true,
          },
        },
      },
      take: MAX_BATCH_SIZE,
      orderBy: { issueDate: "asc" },
    });

    return invoices.map((inv) => ({
      invoiceId: inv.id,
      externalId: inv.externalId || inv.id,
      clientCompanyName: inv.clientCompany?.name || inv.counterpartyName || null,
      clientCompanyTaxNumber: inv.clientCompany?.taxNumber || inv.counterpartyTaxNumber || null,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      totalAmount: Number(inv.totalAmount),
      currency: inv.currency,
      taxAmount: Number(inv.taxAmount),
      netAmount: inv.netAmount ? Number(inv.netAmount) : null,
      counterpartyName: inv.counterpartyName,
      counterpartyTaxNumber: inv.counterpartyTaxNumber,
      status: inv.status,
      type: inv.type as "SATIŞ" | "ALIŞ",
      lines: inv.lines.map((line) => ({
        lineNumber: line.lineNumber,
        description: line.description,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        lineTotal: Number(line.lineTotal),
        vatRate: Number(line.vatRate),
        vatAmount: Number(line.vatAmount),
      })),
    }));
  }

  /**
   * Update pushed invoices with timestamps
   */
  private async updatePushedInvoices(
    tenantId: string,
    invoices: PushInvoiceInput[],
    results: PushResult[]
  ): Promise<void> {
    const now = new Date();
    const successfulIds = invoices
      .filter((_, index) => results[index]?.success)
      .map((inv) => inv.invoiceId)
      .filter((id): id is string => id !== undefined);

    if (successfulIds.length > 0) {
      await prisma.invoice.updateMany({
        where: {
          id: { in: successfulIds },
          tenantId,
        },
        data: { pushedAt: now },
      });
    }
  }

  /**
   * Get transactions to push to external system
   */
  private async getTransactionsToPush(
    tenantId: string,
    clientCompanyId: string | null,
    sinceDate: Date
  ): Promise<PushTransactionInput[]> {
    const where: {
      tenantId: string;
      date: { gte: Date };
      OR: Array<{ pushedAt: null } | { pushedAt: { lt: Date } }>;
      clientCompanyId?: string;
    } = {
      tenantId,
      date: { gte: sinceDate },
      OR: [{ pushedAt: null }, { pushedAt: { lt: sinceDate } }],
    };

    if (clientCompanyId) {
      where.clientCompanyId = clientCompanyId;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        lines: {
          include: {
            ledgerAccount: true,
          },
        },
      },
      take: MAX_BATCH_SIZE,
      orderBy: { date: "asc" },
    });

    return transactions.map((txn) => {
      const amount = txn.lines.reduce((sum, line) => {
        return sum + Number(line.debitAmount || 0) + Number(line.creditAmount || 0);
      }, 0);

      return {
        transactionId: txn.id,
        externalId: txn.externalId || txn.id,
        accountIdentifier: txn.referenceNo || txn.id.substring(0, 20),
        bookingDate: txn.date,
        valueDate: txn.date,
        description: txn.description || "",
        amount,
        currency: "TRY",
        balanceAfter: null,
      };
    });
  }

  /**
   * Update pushed transactions with timestamps
   */
  private async updatePushedTransactions(
    tenantId: string,
    transactions: PushTransactionInput[],
    results: PushResult[]
  ): Promise<void> {
    const now = new Date();
    const successfulIds = transactions
      .filter((_, index) => results[index]?.success)
      .map((txn) => txn.transactionId)
      .filter((id): id is string => id !== undefined);

    if (successfulIds.length > 0) {
      await prisma.transaction.updateMany({
        where: {
          id: { in: successfulIds },
          tenantId,
        },
        data: { pushedAt: now },
      });
    }
  }

  /**
   * Process retry jobs that are due
   */
  async processRetryJobs(): Promise<number> {
    const now = new Date();

    const retryJobs = await prisma.integrationSyncJob.findMany({
      where: {
        status: "retry",
        scheduledFor: { lte: now },
      },
      select: { id: true },
      take: 10,
    });

    let processedCount = 0;

    for (const job of retryJobs) {
      try {
        // Update status to pending for processing
        await prisma.integrationSyncJob.update({
          where: { id: job.id },
          data: { status: "pending" },
        });

        await this.processSyncJob(job.id);
        processedCount++;
      } catch (error) {
        console.error(`[IntegrationSyncProcessor] Failed to process retry job ${job.id}:`, error);
      }
    }

    return processedCount;
  }
}

interface SyncResult {
  type: "pull" | "push";
  created?: number;
  updated?: number;
  skipped?: number;
  success?: number;
  failed?: number;
  total?: number;
  errors?: string[];
}

export const integrationSyncProcessor = new IntegrationSyncProcessor();
