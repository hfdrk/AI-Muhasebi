import { prisma } from "../lib/prisma";
import { connectorRegistry } from "../integrations/connectors/connector-registry";
import { InvoiceImporter } from "../integrations/importers/invoice-importer";
import { BankTransactionImporter } from "../integrations/importers/bank-transaction-importer";

// Use dynamic imports to load services from backend-api at runtime
async function getNotificationService() {
  try {
    const module = await import("../../../backend-api/src/services/notification-service.js");
    return module.notificationService;
  } catch (error1: unknown) {
    try {
      const module = await import("../../../backend-api/src/services/notification-service");
      return module.notificationService;
    } catch (error2: unknown) {
      const msg1 = error1 instanceof Error ? error1.message : String(error1);
      const msg2 = error2 instanceof Error ? error2.message : String(error2);
      throw new Error(`Failed to load NotificationService: ${msg1}, ${msg2}`);
    }
  }
}

async function getEmailService() {
  try {
    const module = await import("../../../backend-api/src/services/email-service.js");
    return module.emailService;
  } catch (error1: unknown) {
    try {
      const module = await import("../../../backend-api/src/services/email-service");
      return module.emailService;
    } catch (error2: unknown) {
      const msg1 = error1 instanceof Error ? error1.message : String(error1);
      const msg2 = error2 instanceof Error ? error2.message : String(error2);
      throw new Error(`Failed to load EmailService: ${msg1}, ${msg2}`);
    }
  }
}

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
      } else if (job.jobType === "push_invoices") {
        if (!("pushInvoices" in connector) || typeof (connector as any).pushInvoices !== "function") {
          throw new Error("Connector does not support push invoices");
        }

        // Get invoices to push (invoices created/updated since last push, or all if first push)
        // TODO: Add logic to determine which invoices to push based on sync configuration
        const invoicesToPush = await this.getInvoicesToPush(job.tenantId, job.clientCompanyId, sinceDate);
        
        if (invoicesToPush.length === 0) {
          await prisma.integrationSyncLog.create({
            data: {
              tenantId: job.tenantId,
              tenantIntegrationId: job.tenantIntegrationId,
              level: "info",
              message: "Gönderilecek fatura bulunamadı.",
            },
          });
        } else {
          const pushResults = await (connector as any).pushInvoices(
            invoicesToPush,
            job.tenantIntegration.config as Record<string, unknown>
          );

          const successCount = pushResults.filter((r: any) => r.success).length;
          const failureCount = pushResults.filter((r: any) => !r.success).length;

          // Log push results
          await prisma.integrationSyncLog.create({
            data: {
              tenantId: job.tenantId,
              tenantIntegrationId: job.tenantIntegrationId,
              level: failureCount > 0 ? "warning" : "info",
              message: `Fatura gönderimi tamamlandı: ${successCount} başarılı, ${failureCount} başarısız`,
              context: {
                total: invoicesToPush.length,
                success: successCount,
                failed: failureCount,
                results: pushResults,
              },
            },
          });
        }
      } else if (job.jobType === "push_bank_transactions") {
        if (!("pushTransactions" in connector) || typeof (connector as any).pushTransactions !== "function") {
          throw new Error("Connector does not support push transactions");
        }

        // Get transactions to push
        // TODO: Add logic to determine which transactions to push
        const transactionsToPush = await this.getTransactionsToPush(job.tenantId, job.clientCompanyId, sinceDate);
        
        if (transactionsToPush.length === 0) {
          await prisma.integrationSyncLog.create({
            data: {
              tenantId: job.tenantId,
              tenantIntegrationId: job.tenantIntegrationId,
              level: "info",
              message: "Gönderilecek işlem bulunamadı.",
            },
          });
        } else {
          const pushResults = await (connector as any).pushTransactions(
            transactionsToPush,
            job.tenantIntegration.config as Record<string, unknown>
          );

          const successCount = pushResults.filter((r: any) => r.success).length;
          const failureCount = pushResults.filter((r: any) => !r.success).length;

          // Log push results
          await prisma.integrationSyncLog.create({
            data: {
              tenantId: job.tenantId,
              tenantIntegrationId: job.tenantIntegrationId,
              level: failureCount > 0 ? "warning" : "info",
              message: `İşlem gönderimi tamamlandı: ${successCount} başarılı, ${failureCount} başarısız`,
              context: {
                total: transactionsToPush.length,
                success: successCount,
                failed: failureCount,
                results: pushResults,
              },
            },
          });
        }
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

      // Create notification for integration sync failure
      try {
        const notificationService = await getNotificationService();
        const emailService = await getEmailService();

        const notification = await notificationService.createNotification({
          tenantId: job.tenantId,
          userId: null, // Tenant-wide notification
          type: "INTEGRATION_SYNC",
          title: "Entegrasyon senkronizasyon hatası",
          message: `${job.tenantIntegration.displayName || job.tenantIntegration.provider.name} için senkronizasyon başarısız oldu.`,
          meta: {
            integrationId: job.tenantIntegrationId,
            jobId: jobId,
          },
        });

        // Send email notification (stub) - for MVP, send to tenant owners
        try {
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
            await emailService.sendNotificationEmail(
              recipientEmails,
              "INTEGRATION_SYNC",
              notification.title,
              notification.message
            );
          }
        } catch (emailError: any) {
          // Don't fail notification creation if email fails
          console.error("[IntegrationSyncProcessor] Failed to send notification email:", emailError);
        }
      } catch (notificationError: any) {
        // Don't fail sync processing if notification fails
        console.error("[IntegrationSyncProcessor] Failed to create notification:", notificationError);
      }

      throw error;
    }
  }

  /**
   * Get invoices to push to external system
   * TODO: Implement logic to determine which invoices should be pushed
   */
  private async getInvoicesToPush(
    tenantId: string,
    clientCompanyId: string | null,
    sinceDate: Date
  ): Promise<any[]> {
    // TODO: Query invoices that need to be pushed
    // This should filter by:
    // - Status (e.g., only "kesildi" invoices)
    // - Not already pushed (track in a separate table or field)
    // - Date range
    // - Client company if specified
    
    const where: any = {
      tenantId,
      issueDate: { gte: sinceDate },
      // Add more filters as needed
    };

    if (clientCompanyId) {
      where.clientCompanyId = clientCompanyId;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        lines: true,
        clientCompany: true,
      },
      take: 100, // Limit batch size
    });

    // Map to PushInvoiceInput format
    return invoices.map((inv) => ({
      invoiceId: inv.id,
      externalId: inv.externalId,
      clientCompanyExternalId: null, // TODO: Map from client company
      clientCompanyName: inv.clientCompany?.name || null,
      clientCompanyTaxNumber: inv.clientCompany?.taxNumber || null,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      totalAmount: Number(inv.totalAmount),
      currency: inv.currency,
      taxAmount: Number(inv.taxAmount),
      netAmount: inv.netAmount ? Number(inv.netAmount) : null,
      counterpartyName: inv.counterpartyName,
      counterpartyTaxNumber: inv.counterpartyTaxNumber,
      status: inv.status,
      type: inv.type,
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
   * Get transactions to push to external system
   * TODO: Implement logic to determine which transactions should be pushed
   */
  private async getTransactionsToPush(
    tenantId: string,
    clientCompanyId: string | null,
    sinceDate: Date
  ): Promise<any[]> {
    // TODO: Query transactions that need to be pushed
    // Similar logic to getInvoicesToPush
    
    const where: any = {
      tenantId,
      date: { gte: sinceDate },
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
      take: 100, // Limit batch size
    });

    // Map to PushTransactionInput format
    // Note: This is a simplified mapping - adjust based on actual requirements
    return transactions.map((txn) => ({
      transactionId: txn.id,
      externalId: txn.externalId,
      accountIdentifier: txn.referenceNo || "", // TODO: Get actual account identifier
      bookingDate: txn.date,
      valueDate: txn.date,
      description: txn.description || "",
      amount: 0, // TODO: Calculate from transaction lines
      currency: "TRY", // TODO: Get from transaction
      balanceAfter: null,
    }));
  }
}

export const integrationSyncProcessor = new IntegrationSyncProcessor();

