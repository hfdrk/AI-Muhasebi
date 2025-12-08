import "dotenv/config";
// Resolve database URL BEFORE any other imports that might use Prisma
import { resolveDatabaseUrl, getDatabaseUrlSync } from "./lib/db-url-resolver";

// Set DATABASE_URL synchronously first (will be refined async if needed)
try {
  getDatabaseUrlSync();
} catch (error: any) {
  console.warn("Warning: Could not resolve database URL synchronously:", error.message);
  console.warn("Will attempt async resolution. Using DATABASE_URL from environment or defaults");
}

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { validateEnv, getConfig } from "@repo/config";
import { logger } from "@repo/shared-utils";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./middleware/request-logger";
import { healthCheck, readinessCheck } from "./routes/health-routes";
import authRoutes from "./routes/auth-routes";
import userRoutes from "./routes/user-routes";
import tenantRoutes from "./routes/tenant-routes";
import tenantUsersRoutes from "./routes/tenant-users-routes";
import clientCompaniesRoutes from "./routes/client-companies-routes";
import invoicesRoutes from "./routes/invoices-routes";
import transactionsRoutes from "./routes/transactions-routes";
import ledgerAccountsRoutes from "./routes/ledger-accounts-routes";
import documentRoutes from "./routes/document-routes";
import documentAIRoutes from "./routes/document-ai-routes";
import riskRoutes from "./routes/risk-routes";
import riskAlertRoutes from "./routes/risk-alert-routes";
import integrationRoutes from "./routes/integration-routes";
import reportingRoutes from "./routes/reporting-routes";
import reportDownloadRoutes from "./routes/report-download-routes";
import scheduledReportsRoutes from "./routes/scheduled-reports-routes";
import reportExecutionLogsRoutes from "./routes/report-execution-logs-routes";
import notificationRoutes from "./routes/notification-routes";
import settingsRoutes from "./routes/settings-routes";
import auditLogsRoutes from "./routes/audit-logs-routes";
import billingRoutes from "./routes/billing-routes";
import onboardingRoutes from "./routes/onboarding-routes";

// Resolve database URL asynchronously and update if needed
resolveDatabaseUrl()
  .then((url) => {
    console.log("✅ Database URL resolved successfully");
    // Update Prisma client if needed (it will use the new DATABASE_URL on next query)
  })
  .catch((error) => {
    console.warn("Warning: Could not resolve database URL automatically:", error.message);
    console.warn("Using DATABASE_URL from environment or defaults");
    console.warn("Current DATABASE_URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@"));
  });

// Validate environment variables at startup
try {
  validateEnv();
} catch (error: any) {
  console.error("❌ Environment validation failed:", error.message);
  console.error("Please check your .env file and ensure all required variables are set.");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3800;

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

// Request logging middleware (before routes)
app.use(requestLogger);

// Health check endpoints
app.get("/health", healthCheck);
app.get("/ready", readinessCheck);

// Config check endpoint (development only)
if (process.env.NODE_ENV !== "production") {
  app.get("/api/v1/config/check", (req, res) => {
    const config = getConfig();
    res.json({
      REPORTING_ENABLED: config.REPORTING_ENABLED ?? "undefined",
      PDF_EXPORT_ENABLED: config.PDF_EXPORT_ENABLED ?? "undefined",
      EXCEL_EXPORT_ENABLED: config.EXCEL_EXPORT_ENABLED ?? "undefined",
      SCHEDULED_REPORTS_ENABLED: config.SCHEDULED_REPORTS_ENABLED ?? "undefined",
      env_REPORTING_ENABLED: process.env.REPORTING_ENABLED,
      NODE_ENV: process.env.NODE_ENV,
      configKeys: Object.keys(config).filter(k => k.includes("REPORT") || k.includes("EXPORT") || k.includes("SCHEDULED")),
    });
  });
}

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/tenants", tenantRoutes);
app.use("/api/v1/tenants", tenantUsersRoutes);
app.use("/api/v1/client-companies", clientCompaniesRoutes);
app.use("/api/v1/invoices", invoicesRoutes);
app.use("/api/v1/transactions", transactionsRoutes);
app.use("/api/v1/ledger-accounts", ledgerAccountsRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/documents", documentAIRoutes);
app.use("/api/v1/risk", riskRoutes);
app.use("/api/v1/risk/alerts", riskAlertRoutes);
app.use("/api/v1/integrations", integrationRoutes);
app.use("/api/v1/reports", reportingRoutes);
app.use("/api/v1/reports", reportDownloadRoutes);
app.use("/api/v1/scheduled-reports", scheduledReportsRoutes);
app.use("/api/v1/report-execution-logs", reportExecutionLogsRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/audit-logs", auditLogsRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/onboarding", onboardingRoutes);

// Error handler (must be last)
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info("Backend API server started", undefined, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || "development",
  });
});

// Handle server errors
server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    logger.error(`Port ${PORT} is already in use. Please use a different port.`);
  } else {
    logger.error("Server error", undefined, {
      error: error.message,
      stack: error.stack,
    });
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", undefined, {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", undefined, {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

