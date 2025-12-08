import { validateEnv } from "@repo/config";
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

// Helper function for structured logging with timestamps
function log(level: "info" | "error" | "warn", message: string, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`);
}

async function processPendingJobs(): Promise<void> {
  try {
    // Fetch pending jobs
    const jobs = await documentJobService.getPendingJobs(MAX_JOBS_PER_BATCH);

    if (jobs.length === 0) {
      return;
    }

    log("info", `Picked up ${jobs.length} pending document processing job(s)`, {
      jobCount: jobs.length,
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

        log("info", `Processing document job`, {
          jobId: job.id,
          documentId: job.documentId,
          tenantId: job.tenantId,
          attempt: job.attemptsCount + 1,
        });

        // Process the document
        await documentProcessor.processDocument(job.tenantId, job.documentId);

        log("info", `Document processed successfully`, {
          jobId: job.id,
          documentId: job.documentId,
          tenantId: job.tenantId,
        });
      } catch (error: any) {
        const attempts = job.attemptsCount + 1;
        const errorMessage = error.message || "Bilinmeyen hata";

        log("error", `Document processing failed`, {
          jobId: job.id,
          documentId: job.documentId,
          tenantId: job.tenantId,
          attempt: attempts,
          error: errorMessage,
          stack: error.stack,
        });

        // Mark job as failed (with retry logic)
        await documentJobService.markJobFailed(job.id, errorMessage, attempts);

        if (attempts >= 3) {
          log("error", `Document job failed after max attempts`, {
            jobId: job.id,
            documentId: job.documentId,
            tenantId: job.tenantId,
            attempts,
          });
        }
      }
    }
  } catch (error: any) {
    log("error", "Error in document processing loop", {
      error: error.message,
      stack: error.stack,
    });
  }
}

async function processScheduledRiskCalculations(): Promise<void> {
  try {
    log("info", "Starting scheduled risk calculations");

    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      where: {
        // Add any filters if needed
      },
    });

    log("info", `Processing risk calculations for ${tenants.length} tenant(s)`, {
      tenantCount: tenants.length,
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

        log("info", `Processing risk calculations for tenant`, {
          tenantId: tenant.id,
          companyCount: companies.length,
        });

        for (const company of companies) {
          try {
            await riskCalculationProcessor.processCompanyRiskCalculation(tenant.id, company.id);
            log("info", `Company risk calculation completed`, {
              tenantId: tenant.id,
              companyId: company.id,
            });
          } catch (error: any) {
            log("error", `Error processing company risk calculation`, {
              tenantId: tenant.id,
              companyId: company.id,
              error: error.message,
            });
            // Continue with other companies
          }
        }
      } catch (error: any) {
        log("error", `Error processing tenant risk calculations`, {
          tenantId: tenant.id,
          error: error.message,
        });
        // Continue with other tenants
      }
    }

    log("info", "Scheduled risk calculations completed");
  } catch (error: any) {
    log("error", "Error in scheduled risk calculations", {
      error: error.message,
      stack: error.stack,
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

    log("info", `Picked up ${jobs.length} pending integration sync job(s)`, {
      jobCount: jobs.length,
    });

    for (const job of jobs) {
      try {
        log("info", `Processing integration sync job`, {
          jobId: job.id,
          tenantId: job.tenantId,
          integrationId: job.tenantIntegrationId,
          jobType: job.jobType,
        });

        await integrationSyncProcessor.processSyncJob(job.id);

        log("info", `Integration sync job completed successfully`, {
          jobId: job.id,
          tenantId: job.tenantId,
          integrationId: job.tenantIntegrationId,
        });
      } catch (error: any) {
        log("error", `Integration sync job failed`, {
          jobId: job.id,
          tenantId: job.tenantId,
          integrationId: job.tenantIntegrationId,
          error: error.message,
          stack: error.stack,
        });
        // Error handling is done in the processor
      }
    }
  } catch (error: any) {
    log("error", "Error in integration sync job processing loop", {
      error: error.message,
      stack: error.stack,
    });
  }
}

async function scheduleIntegrationSyncs(): Promise<void> {
  try {
    log("info", "Running integration sync scheduler");
    await integrationSyncScheduler.scheduleRecurringSyncs();
    log("info", "Integration sync scheduler completed");
  } catch (error: any) {
    log("error", "Error in integration sync scheduler", {
      error: error.message,
      stack: error.stack,
    });
  }
}

async function processScheduledReports(): Promise<void> {
  try {
    await scheduledReportRunner.runOnce();
  } catch (error: any) {
    log("error", "Error in scheduled reports processing loop", {
      error: error.message,
      stack: error.stack,
    });
  }
}

async function startWorker(): Promise<void> {
  log("info", "Worker jobs service starting", {
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
  log("info", "Running initial job processing on startup");
  await processPendingJobs();
  await processIntegrationSyncJobs();
  await scheduleIntegrationSyncs();
  await processScheduledReports();

  // Run risk calculations once on startup (optional - can be removed if not desired)
  // await processScheduledRiskCalculations();

  log("info", "Worker is running. Press Ctrl+C to stop.");
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  log("info", "Received SIGINT, shutting down worker gracefully");
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("info", "Received SIGTERM, shutting down worker gracefully");
  process.exit(0);
});

// Start the worker
startWorker().catch((error) => {
  console.error("Failed to start worker:", error);
  process.exit(1);
});
