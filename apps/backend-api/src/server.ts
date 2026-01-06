import "dotenv/config";
// Initialize Sentry early, before other imports
import { initSentry } from "./lib/sentry";
initSentry();

// Resolve database URL BEFORE any other imports that might use Prisma
import { resolveDatabaseUrl, getDatabaseUrlSync } from "./lib/db-url-resolver";

// Set DATABASE_URL synchronously first (will be refined async if needed)
try {
  getDatabaseUrlSync();
} catch (error: any) {
  logger.warn("Warning: Could not resolve database URL synchronously:", { error: error.message });
  logger.warn("Will attempt async resolution. Using DATABASE_URL from environment or defaults");
}

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { validateEnv, getConfig } from "@repo/config";
import { logger } from "@repo/shared-utils";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./middleware/request-logger";
import { healthCheck, readinessCheck, healthzCheck, readyzCheck } from "./routes/health-routes";
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
import messagingRoutes from "./routes/messaging-routes";
import emailTemplateRoutes from "./routes/email-template-routes";
import settingsRoutes from "./routes/settings-routes";
import searchRoutes from "./routes/search-routes";
import savedFiltersRoutes from "./routes/saved-filters-routes";
import auditLogsRoutes from "./routes/audit-logs-routes";
import billingRoutes from "./routes/billing-routes";
import onboardingRoutes from "./routes/onboarding-routes";
import adminRoutes from "./routes/admin-routes";
import aiRoutes from "./routes/ai-routes";
import mobileRoutes from "./routes/mobile-routes";
import taskRoutes from "./routes/task-routes";
import documentRequirementRoutes from "./routes/document-requirement-routes";
import contractAnalysisRoutes from "./routes/contract-analysis-routes";
import eventsRoutes from "./routes/events-routes";
import emailLogsRoutes from "./routes/email-logs-routes";
import eFaturaRoutes from "./routes/e-fatura-routes";
import eArsivRoutes from "./routes/e-arsiv-routes";
import eDefterRoutes from "./routes/e-defter-routes";
import taxRoutes from "./routes/tax-routes";
import kvkkRoutes from "./routes/kvkk-routes";
import securityRoutes from "./routes/security-routes";
import databaseOptimizationRoutes from "./routes/database-optimization-routes";
import analyticsRoutes from "./routes/analytics-routes";
import swaggerRoutes from "./routes/swagger-routes";
import taxCalendarRoutes from "./routes/tax-calendar-routes";
import turkishAccountingAIRoutes from "./routes/turkish-accounting-ai-routes";

// Resolve database URL asynchronously and update if needed
resolveDatabaseUrl()
  .then((url) => {
    logger.info("Database URL resolved successfully");
    // Update Prisma client if needed (it will use the new DATABASE_URL on next query)
  })
  .catch((error) => {
    logger.warn("Warning: Could not resolve database URL automatically:", { error: error.message });
    logger.warn("Using DATABASE_URL from environment or defaults");
    logger.warn("Current DATABASE_URL:", { url: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@") });
  });

// Validate environment variables at startup
try {
  validateEnv();
} catch (error: any) {
  logger.error("Environment validation failed:", { error: error.message });
  logger.error("Please check your .env file and ensure all required variables are set.");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3800;

// Security headers with helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    crossOriginEmbedderPolicy: false, // Allow embedding if needed
  })
);

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "http://localhost:3000";
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? corsOrigin : corsOrigin.split(","),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-Id"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later.",
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/healthz" || req.path === "/readyz" || req.path === "/health" || req.path === "/ready";
  },
});

// Apply rate limiting to API routes
app.use("/api/", limiter);

// Request size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Request logging middleware (before routes)
app.use(requestLogger);

// Health check endpoints
app.get("/health", healthCheck);
app.get("/ready", readinessCheck);
// Kubernetes-style health endpoints (no auth, lightweight)
app.get("/healthz", healthzCheck);
app.get("/readyz", readyzCheck);

// API Documentation (Swagger/OpenAPI)
app.use("/api-docs", swaggerRoutes);

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
app.use("/api/v1/messaging", messagingRoutes);
app.use("/api/v1/email-templates", emailTemplateRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/audit-logs", auditLogsRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/onboarding", onboardingRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/saved-filters", savedFiltersRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/mobile", mobileRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/document-requirements", documentRequirementRoutes);
app.use("/api/v1/contracts", contractAnalysisRoutes);
app.use("/api/v1/events", eventsRoutes);
app.use("/api/v1/email-logs", emailLogsRoutes);
app.use("/api/v1/e-fatura", eFaturaRoutes);
app.use("/api/v1/e-arsiv", eArsivRoutes);
app.use("/api/v1/e-defter", eDefterRoutes);
app.use("/api/v1/tax", taxRoutes);
app.use("/api/v1/kvkk", kvkkRoutes);
app.use("/api/v1/security", securityRoutes);
app.use("/api/v1/db-optimization", databaseOptimizationRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/tax-calendar", taxCalendarRoutes);
app.use("/api/v1/turkish-accounting-ai", turkishAccountingAIRoutes);

// Error handler (must be last)
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info("Backend API server started", undefined, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || "development",
  });

  // Initialize WebSocket server
  try {
    const { websocketService } = require("./services/websocket-service");
    websocketService.initialize(server);
    logger.info("WebSocket server initialized");
  } catch (error) {
    logger.warn("WebSocket server initialization skipped:", error);
  }
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

// Graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.info(`Received ${signal}, starting graceful shutdown`);

  // Stop accepting new connections
  server.close(() => {
    logger.info("HTTP server closed");
  });

  // Close database connections
  try {
    const { prisma } = await import("./lib/prisma");
    await prisma.$disconnect();
    logger.info("Database connections closed");
  } catch (error: any) {
    logger.error("Error closing database connections", undefined, {
      error: error.message,
    });
  }

  // Give in-flight requests time to complete (max 30 seconds)
  setTimeout(() => {
    logger.info("Graceful shutdown complete");
    process.exit(0);
  }, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

