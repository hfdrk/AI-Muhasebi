#!/usr/bin/env tsx
/**
 * Worker Health Check Script
 * 
 * Checks database connectivity and basic job processing capability.
 * This can be used by orchestration systems to verify worker health.
 */

import "dotenv/config";
import { validateEnv } from "@repo/config";
import { prisma } from "./lib/prisma";

async function healthCheck(): Promise<void> {
  let exitCode = 0;
  const checks: Record<string, { status: "ok" | "error"; message?: string }> = {};

  // Check 1: Environment validation
  try {
    validateEnv();
    checks.environment = { status: "ok" };
  } catch (error: any) {
    checks.environment = { status: "error", message: error.message };
    exitCode = 1;
  }

  // Check 2: Database connectivity
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timeout")), 5000)
    );
    const dbPromise = prisma.$queryRaw`SELECT 1 as health_check`;
    await Promise.race([dbPromise, timeoutPromise]);
    checks.database = { status: "ok" };
  } catch (error: any) {
    checks.database = { status: "error", message: error.message || "Database connection failed" };
    exitCode = 1;
  }

  // Check 3: Job table accessibility (verify we can query job tables)
  try {
    const pendingJobsCount = await prisma.documentProcessingJob.count({
      where: { status: "PENDING" },
    });
    checks.jobTables = { status: "ok" };
  } catch (error: any) {
    checks.jobTables = { status: "error", message: error.message || "Cannot access job tables" };
    exitCode = 1;
  }

  // Output results
  const allOk = Object.values(checks).every((check) => check.status === "ok");
  const status = allOk ? "healthy" : "unhealthy";

  console.log(JSON.stringify({
    status,
    service: "worker-jobs",
    checks,
    timestamp: new Date().toISOString(),
  }, null, 2));

  // Exit with appropriate code
  await prisma.$disconnect();
  process.exit(exitCode);
}

// Run health check
healthCheck().catch((error) => {
  console.error(JSON.stringify({
    status: "error",
    service: "worker-jobs",
    error: error.message,
    timestamp: new Date().toISOString(),
  }, null, 2));
  process.exit(1);
});

