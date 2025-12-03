import { validateEnv } from "@repo/config";
import { documentJobService } from "./services/document-job-service";
import { documentProcessor } from "./processors/document-processor";
import { riskCalculationProcessor } from "./processors/risk-calculation-processor";
import { prisma } from "./lib/prisma";

// Validate environment variables at startup
validateEnv();

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
const MAX_JOBS_PER_BATCH = 10;
const RISK_CALCULATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours (daily)

async function processPendingJobs(): Promise<void> {
  try {
    // Fetch pending jobs
    const jobs = await documentJobService.getPendingJobs(MAX_JOBS_PER_BATCH);

    if (jobs.length === 0) {
      return;
    }

    console.log(`Found ${jobs.length} pending document processing job(s)`);

    // Process each job
    for (const job of jobs) {
      try {
        // Mark job as in progress
        await documentJobService.markJobInProgress(job.id);

        console.log(`Processing document ${job.documentId} for tenant ${job.tenantId}`);

        // Process the document
        await documentProcessor.processDocument(job.tenantId, job.documentId);

        console.log(`Successfully processed document ${job.documentId}`);
      } catch (error: any) {
        console.error(`Error processing job ${job.id}:`, error);

        // Mark job as failed (with retry logic)
        const attempts = job.attemptsCount + 1;
        await documentJobService.markJobFailed(
          job.id,
          error.message || "Bilinmeyen hata",
          attempts
        );

        if (attempts >= 3) {
          console.error(`Job ${job.id} failed after ${attempts} attempts`);
        }
      }
    }
  } catch (error) {
    console.error("Error in processPendingJobs:", error);
  }
}

async function processScheduledRiskCalculations(): Promise<void> {
  try {
    console.log("[Risk Calculation] Starting scheduled risk calculations...");

    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      where: {
        // Add any filters if needed
      },
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

        console.log(`[Risk Calculation] Processing ${companies.length} companies for tenant ${tenant.id}`);

        for (const company of companies) {
          try {
            await riskCalculationProcessor.processCompanyRiskCalculation(tenant.id, company.id);
          } catch (error: any) {
            console.error(`[Risk Calculation] Error processing company ${company.id}:`, error);
            // Continue with other companies
          }
        }
      } catch (error: any) {
        console.error(`[Risk Calculation] Error processing tenant ${tenant.id}:`, error);
        // Continue with other tenants
      }
    }

    console.log("[Risk Calculation] Scheduled risk calculations completed.");
  } catch (error) {
    console.error("[Risk Calculation] Error in scheduled risk calculations:", error);
  }
}

async function startWorker(): Promise<void> {
  console.log("Worker jobs service starting...");
  console.log(`Document processing polling interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`Risk calculation interval: ${RISK_CALCULATION_INTERVAL_MS / (60 * 60 * 1000)} hours`);

  // Start document processing polling loop
  setInterval(async () => {
    await processPendingJobs();
  }, POLL_INTERVAL_MS);

  // Start scheduled risk calculation loop (daily)
  setInterval(async () => {
    await processScheduledRiskCalculations();
  }, RISK_CALCULATION_INTERVAL_MS);

  // Process immediately on startup
  await processPendingJobs();

  // Run risk calculations once on startup (optional - can be removed if not desired)
  // await processScheduledRiskCalculations();

  console.log("Worker is running. Press Ctrl+C to stop.");
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down worker...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down worker...");
  process.exit(0);
});

// Start the worker
startWorker().catch((error) => {
  console.error("Failed to start worker:", error);
  process.exit(1);
});
