import { validateEnv } from "@repo/config";
import { logger } from "@repo/shared-utils";
import { documentJobService } from "./services/document-job-service";
import { documentProcessor } from "./processors/document-processor";
import { riskCalculationProcessor } from "./processors/risk-calculation-processor";
import { integrationSyncProcessor } from "./processors/integration-sync-processor";
import { integrationSyncScheduler } from "./schedulers/integration-sync-scheduler";
import { scheduledReportRunner } from "./workers/scheduled-report-runner";
import { prisma } from "./lib/prisma";

// Validate environment variables at startup
validateEnv();

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
const MAX_JOBS_PER_BATCH = 10;
const RISK_CALCULATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours (daily)
const INTEGRATION_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const INTEGRATION_SCHEDULER_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const SCHEDULED_REPORT_INTERVAL_MS = 60 * 1000; // 1 minute

async function processPendingJobs(): Promise<void> {
  try {
    // Fetch pending jobs
    const jobs = await documentJobService.getPendingJobs(MAX_JOBS_PER_BATCH);

    if (jobs.length === 0) {
      return;
    }

    logger.info(`Picked up ${jobs.length} pending document processing job(s)`, undefined, {
      jobCount: jobs.length,
      jobType: "DOCUMENT_PROCESSING",
    });

    // Process each job
    for (const job of jobs) {
      try {
        // Mark job as in progress and update document status
        await documentJobService.markJobInProgress(job.id);
        
        // Update document status to PROCESSING
        await prisma.document.update({
          where: { id: job.documentId },
          data: { status: "PROCESSING" },
        });

        logger.info("Processing document job", {
          tenantId: job.tenantId,
        }, {
          jobId: job.id,
          documentId: job.documentId,
          attempt: job.attemptsCount + 1,
        });

        // Process the document
        await documentProcessor.processDocument(job.tenantId, job.documentId);

        logger.info("Document processed successfully", {
          tenantId: job.tenantId,
        }, {
          jobId: job.id,
          documentId: job.documentId,
        });
      } catch (error: any) {
        const attempts = job.attemptsCount + 1;
        const errorMessage = error.message || "Bilinmeyen hata";

        logger.error("Document processing failed", {
          tenantId: job.tenantId,
        }, {
          jobId: job.id,
          documentId: job.documentId,
          attempt: attempts,
          error: errorMessage,
          stack: error.stack,
        });

        // Mark job as failed (with retry logic)
        await documentJobService.markJobFailed(job.id, errorMessage, attempts);

        if (attempts >= 3) {
          logger.error("Document job failed after max attempts", {
            tenantId: job.tenantId,
          }, {
            jobId: job.id,
            documentId: job.documentId,
            attempts,
          });
        }
      }
    }
  } catch (error: any) {
    logger.error("Error in document processing loop", undefined, {
      error: error.message,
      stack: error.stack,
    });
  }
}

async function processScheduledRiskCalculations(): Promise<void> {
  try {
    logger.info("Starting scheduled risk calculations", undefined, {
      jobType: "RISK_CALCULATION",
    });

    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      where: {
        // Add any filters if needed
      },
    });

    logger.info(`Processing risk calculations for ${tenants.length} tenant(s)`, undefined, {
      tenantCount: tenants.length,
      jobType: "RISK_CALCULATION",
    });

    for (const tenant of tenants) {
      try {
        // Get all active client companies for this tenant
        const companies = await prisma.clientCompany.findMany({
          where: {
            tenantId: tenant.id,
            isActive: true,
          },
        });

        logger.info("Processing risk calculations for tenant", {
          tenantId: tenant.id,
        }, {
          companyCount: companies.length,
          jobType: "RISK_CALCULATION",
        });

        for (const company of companies) {
          try {
            await riskCalculationProcessor.processCompanyRiskCalculation(tenant.id, company.id);
            logger.info("Company risk calculation completed", {
              tenantId: tenant.id,
            }, {
              companyId: company.id,
              jobType: "RISK_CALCULATION",
            });
          } catch (error: any) {
            logger.error("Error processing company risk calculation", {
              tenantId: tenant.id,
            }, {
              companyId: company.id,
              error: error.message,
              jobType: "RISK_CALCULATION",
            });
            // Continue with other companies
          }
        }
      } catch (error: any) {
        logger.error("Error processing tenant risk calculations", {
          tenantId: tenant.id,
        }, {
          error: error.message,
          jobType: "RISK_CALCULATION",
        });
        // Continue with other tenants
      }
    }

    logger.info("Scheduled risk calculations completed", undefined, {
      jobType: "RISK_CALCULATION",
    });
  } catch (error: any) {
    logger.error("Error in scheduled risk calculations", undefined, {
      error: error.message,
      stack: error.stack,
      jobType: "RISK_CALCULATION",
    });
  }
}

async function processIntegrationSyncJobs(): Promise<void> {
  try {
    // Fetch pending integration sync jobs
    const jobs = await prisma.integrationSyncJob.findMany({
      where: {
        status: "pending",
      },
      take: MAX_JOBS_PER_BATCH,
      orderBy: {
        createdAt: "asc",
      },
    });

    if (jobs.length === 0) {
      return;
    }

    logger.info(`Picked up ${jobs.length} pending integration sync job(s)`, undefined, {
      jobCount: jobs.length,
      jobType: "INTEGRATION_SYNC",
    });

    for (const job of jobs) {
      try {
        logger.info("Processing integration sync job", {
          tenantId: job.tenantId,
        }, {
          jobId: job.id,
          integrationId: job.tenantIntegrationId,
          jobType: job.jobType,
        });

        await integrationSyncProcessor.processSyncJob(job.id);

        logger.info("Integration sync job completed successfully", {
          tenantId: job.tenantId,
        }, {
          jobId: job.id,
          integrationId: job.tenantIntegrationId,
        });
      } catch (error: any) {
        logger.error("Integration sync job failed", {
          tenantId: job.tenantId,
        }, {
          jobId: job.id,
          integrationId: job.tenantIntegrationId,
          error: error.message,
          stack: error.stack,
        });
        // Error handling is done in the processor
      }
    }
  } catch (error: any) {
    logger.error("Error in integration sync job processing loop", undefined, {
      error: error.message,
      stack: error.stack,
      jobType: "INTEGRATION_SYNC",
    });
  }
}

async function scheduleIntegrationSyncs(): Promise<void> {
  try {
    logger.info("Running integration sync scheduler", undefined, {
      jobType: "INTEGRATION_SCHEDULER",
    });
    await integrationSyncScheduler.scheduleRecurringSyncs();
    logger.info("Integration sync scheduler completed", undefined, {
      jobType: "INTEGRATION_SCHEDULER",
    });
  } catch (error: any) {
    logger.error("Error in integration sync scheduler", undefined, {
      error: error.message,
      stack: error.stack,
      jobType: "INTEGRATION_SCHEDULER",
    });
  }
}

async function processScheduledReports(): Promise<void> {
  try {
    await scheduledReportRunner.runOnce();
  } catch (error: any) {
    logger.error("Error in scheduled reports processing loop", undefined, {
      error: error.message,
      stack: error.stack,
      jobType: "SCHEDULED_REPORT",
    });
  }
}

async function startWorker(): Promise<void> {
  logger.info("Worker jobs service starting", undefined, {
    documentProcessingInterval: `${POLL_INTERVAL_MS / 1000}s`,
    riskCalculationInterval: `${RISK_CALCULATION_INTERVAL_MS / (60 * 60 * 1000)}h`,
    integrationSyncInterval: `${INTEGRATION_SYNC_INTERVAL_MS / 1000}s`,
    integrationSchedulerInterval: `${INTEGRATION_SCHEDULER_INTERVAL_MS / 1000}s`,
    scheduledReportInterval: `${SCHEDULED_REPORT_INTERVAL_MS / 1000}s`,
  });

  // Start document processing polling loop
  setInterval(async () => {
    await processPendingJobs();
  }, POLL_INTERVAL_MS);

  // Start scheduled risk calculation loop (daily)
  setInterval(async () => {
    await processScheduledRiskCalculations();
  }, RISK_CALCULATION_INTERVAL_MS);

  // Start integration sync job processing loop
  setInterval(async () => {
    await processIntegrationSyncJobs();
  }, INTEGRATION_SYNC_INTERVAL_MS);

  // Start integration sync scheduler loop
  setInterval(async () => {
    await scheduleIntegrationSyncs();
  }, INTEGRATION_SCHEDULER_INTERVAL_MS);

  // Start scheduled report processing loop
  setInterval(async () => {
    await processScheduledReports();
  }, SCHEDULED_REPORT_INTERVAL_MS);

  // Process immediately on startup
  logger.info("Running initial job processing on startup");
  await processPendingJobs();
  await processIntegrationSyncJobs();
  await scheduleIntegrationSyncs();
  await processScheduledReports();

  // Run risk calculations once on startup (optional - can be removed if not desired)
  // await processScheduledRiskCalculations();

  logger.info("Worker is running. Press Ctrl+C to stop.");
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down worker gracefully");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down worker gracefully");
  process.exit(0);
});

// Start the worker
startWorker().catch((error) => {
  logger.error("Failed to start worker", undefined, {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
