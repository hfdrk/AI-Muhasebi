import { validateEnv } from "@repo/config";
import { documentJobService } from "./services/document-job-service";
import { documentProcessor } from "./processors/document-processor";

// Validate environment variables at startup
validateEnv();

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
const MAX_JOBS_PER_BATCH = 10;

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

async function startWorker(): Promise<void> {
  console.log("Worker jobs service starting...");
  console.log(`Polling interval: ${POLL_INTERVAL_MS}ms`);

  // Start polling loop
  setInterval(async () => {
    await processPendingJobs();
  }, POLL_INTERVAL_MS);

  // Process immediately on startup
  await processPendingJobs();

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
