"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrationSyncProcessor = exports.IntegrationSyncProcessor = void 0;
const prisma_1 = require("../lib/prisma");
const connector_registry_1 = require("../integrations/connectors/connector-registry");
const invoice_importer_1 = require("../integrations/importers/invoice-importer");
const bank_transaction_importer_1 = require("../integrations/importers/bank-transaction-importer");
// Use dynamic imports to load services from backend-api at runtime
async function getNotificationService() {
    try {
        const module = await Promise.resolve().then(() => __importStar(require("../../../backend-api/src/services/notification-service.js")));
        return module.notificationService;
    }
    catch (error1) {
        try {
            const module = await Promise.resolve().then(() => __importStar(require("../../../backend-api/src/services/notification-service")));
            return module.notificationService;
        }
        catch (error2) {
            const msg1 = error1 instanceof Error ? error1.message : String(error1);
            const msg2 = error2 instanceof Error ? error2.message : String(error2);
            throw new Error(`Failed to load NotificationService: ${msg1}, ${msg2}`);
        }
    }
}
async function getEmailService() {
    try {
        const module = await Promise.resolve().then(() => __importStar(require("../../../backend-api/src/services/email-service.js")));
        return module.emailService;
    }
    catch (error1) {
        try {
            const module = await Promise.resolve().then(() => __importStar(require("../../../backend-api/src/services/email-service")));
            return module.emailService;
        }
        catch (error2) {
            const msg1 = error1 instanceof Error ? error1.message : String(error1);
            const msg2 = error2 instanceof Error ? error2.message : String(error2);
            throw new Error(`Failed to load EmailService: ${msg1}, ${msg2}`);
        }
    }
}
class IntegrationSyncProcessor {
    invoiceImporter = new invoice_importer_1.InvoiceImporter();
    bankTransactionImporter = new bank_transaction_importer_1.BankTransactionImporter();
    async processSyncJob(jobId) {
        // Load job with integration and provider
        const job = await prisma_1.prisma.integrationSyncJob.findUnique({
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
        await prisma_1.prisma.integrationSyncJob.update({
            where: { id: jobId },
            data: {
                status: "in_progress",
                startedAt: new Date(),
            },
        });
        // Update integration status
        await prisma_1.prisma.tenantIntegration.update({
            where: { id: job.tenantIntegrationId },
            data: {
                lastSyncStatus: "in_progress",
            },
        });
        try {
            const connector = connector_registry_1.connectorRegistry.getConnector(job.tenantIntegration.provider.code, job.tenantIntegration.provider.type);
            if (!connector) {
                throw new Error(`Connector not found for provider ${job.tenantIntegration.provider.code}`);
            }
            // Calculate date range (since last sync or last 30 days)
            const untilDate = new Date();
            const sinceDate = job.tenantIntegration.lastSyncAt
                ? new Date(job.tenantIntegration.lastSyncAt)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            let importSummary;
            if (job.jobType === "pull_invoices") {
                if (!("fetchInvoices" in connector)) {
                    throw new Error("Invalid connector type for invoice sync");
                }
                const invoices = await connector.fetchInvoices(sinceDate, untilDate);
                importSummary = await this.invoiceImporter.importInvoices(job.tenantId, invoices, job.tenantIntegrationId);
                // Log import results
                await prisma_1.prisma.integrationSyncLog.create({
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
            }
            else if (job.jobType === "pull_bank_transactions") {
                if (!("fetchTransactions" in connector)) {
                    throw new Error("Invalid connector type for bank transaction sync");
                }
                const transactions = await connector.fetchTransactions(sinceDate, untilDate);
                importSummary = await this.bankTransactionImporter.importTransactions(job.tenantId, transactions, job.tenantIntegrationId);
                // Log import results
                await prisma_1.prisma.integrationSyncLog.create({
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
            }
            else {
                throw new Error(`Unknown job type: ${job.jobType}`);
            }
            // Mark job as success
            await prisma_1.prisma.integrationSyncJob.update({
                where: { id: jobId },
                data: {
                    status: "success",
                    finishedAt: new Date(),
                },
            });
            // Update integration last sync
            await prisma_1.prisma.tenantIntegration.update({
                where: { id: job.tenantIntegrationId },
                data: {
                    lastSyncAt: new Date(),
                    lastSyncStatus: "success",
                },
            });
        }
        catch (error) {
            const errorMessage = error.message || "Bilinmeyen hata";
            // Mark job as failed
            await prisma_1.prisma.integrationSyncJob.update({
                where: { id: jobId },
                data: {
                    status: "failed",
                    finishedAt: new Date(),
                    errorMessage,
                },
            });
            // Update integration status
            await prisma_1.prisma.tenantIntegration.update({
                where: { id: job.tenantIntegrationId },
                data: {
                    lastSyncStatus: "error",
                },
            });
            // Log error
            await prisma_1.prisma.integrationSyncLog.create({
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
                    const tenantMembers = await prisma_1.prisma.userTenantMembership.findMany({
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
                        .filter((email) => email !== null);
                    if (recipientEmails.length > 0) {
                        await emailService.sendNotificationEmail(recipientEmails, "INTEGRATION_SYNC", notification.title, notification.message);
                    }
                }
                catch (emailError) {
                    // Don't fail notification creation if email fails
                    console.error("[IntegrationSyncProcessor] Failed to send notification email:", emailError);
                }
            }
            catch (notificationError) {
                // Don't fail sync processing if notification fails
                console.error("[IntegrationSyncProcessor] Failed to create notification:", notificationError);
            }
            throw error;
        }
    }
}
exports.IntegrationSyncProcessor = IntegrationSyncProcessor;
exports.integrationSyncProcessor = new IntegrationSyncProcessor();
//# sourceMappingURL=integration-sync-processor.js.map