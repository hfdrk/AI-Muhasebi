// Import env setup FIRST - this must run before any other imports
import "./env-setup.js";

import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { errorHandler } from "../middleware/error-handler";

/**
 * Patch Express Router and App to automatically catch async errors
 * This mimics express-async-errors behavior for test environment
 * Ensures errors thrown in async route handlers and middleware are passed to error middleware
 */
const Router = express.Router;
const methods = ["get", "post", "put", "patch", "delete", "all", "use"] as const;

// Helper to wrap async handlers
function wrapAsyncHandler(handler: any): any {
  if (typeof handler !== "function") {
    return handler;
  }
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = handler(req, res, next);
      // If handler returns a promise, catch errors
      if (result && typeof result.catch === "function") {
        result.catch((error: Error) => {
          // Only call next if response hasn't been sent
          if (!res.headersSent) {
            next(error);
          } else {
            // If headers already sent, log the error but don't call next
            // This prevents unhandled rejections
            console.error("Error after response sent:", error.message);
          }
        });
      }
      return result;
    } catch (error) {
      // Sync errors - only call next if response hasn't been sent
      if (!res.headersSent) {
        next(error as Error);
      } else {
        console.error("Sync error after response sent:", (error as Error).message);
      }
    }
  };
}

// Patch Router prototype to wrap async handlers
methods.forEach((method) => {
  const original = Router.prototype[method];
  Router.prototype[method] = function (path: any, ...handlers: any[]) {
    const wrappedHandlers = handlers.map(wrapAsyncHandler);
    return original.call(this, path, ...wrappedHandlers);
  };
});

// Patch Express app methods as well
const originalAppUse = express.application.use;
express.application.use = function (path: any, ...handlers: any[]): any {
  const wrappedHandlers = handlers.map(wrapAsyncHandler);
  // @ts-ignore - Spread argument type issue with Express patching
  return originalAppUse.call(this, path, ...wrappedHandlers);
};

methods.forEach((method) => {
  if (method === "use") return; // Already handled above
  const original = express.application[method];
  express.application[method] = function (path: any, ...handlers: any[]): any {
    const wrappedHandlers = handlers.map(wrapAsyncHandler);
    // @ts-ignore - Spread argument type issue with Express patching
    return original.call(this, path, ...wrappedHandlers);
  };
});

import authRoutes from "../routes/auth-routes";
import userRoutes from "../routes/user-routes";
import tenantRoutes from "../routes/tenant-routes";
import tenantUsersRoutes from "../routes/tenant-users-routes";
import clientCompaniesRoutes from "../routes/client-companies-routes";
import invoicesRoutes from "../routes/invoices-routes";
import transactionsRoutes from "../routes/transactions-routes";
import ledgerAccountsRoutes from "../routes/ledger-accounts-routes";
import documentRoutes from "../routes/document-routes";
import documentAIRoutes from "../routes/document-ai-routes";
import riskRoutes from "../routes/risk-routes";
import riskAlertRoutes from "../routes/risk-alert-routes";
import integrationRoutes from "../routes/integration-routes";
import reportingRoutes from "../routes/reporting-routes";
import reportDownloadRoutes from "../routes/report-download-routes";
import scheduledReportsRoutes from "../routes/scheduled-reports-routes";
import reportExecutionLogsRoutes from "../routes/report-execution-logs-routes";
import notificationRoutes from "../routes/notification-routes";
import settingsRoutes from "../routes/settings-routes";
import auditLogsRoutes from "../routes/audit-logs-routes";
import billingRoutes from "../routes/billing-routes";
import onboardingRoutes from "../routes/onboarding-routes";
import searchRoutes from "../routes/search-routes";
import savedFiltersRoutes from "../routes/saved-filters-routes";
import adminRoutes from "../routes/admin-routes";
import { healthCheck, readinessCheck, healthzCheck, readyzCheck } from "../routes/health-routes";

/**
 * Create an Express app instance for testing
 * This is similar to the main server but without starting a listener
 */
export function createTestApp(): express.Application {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json());
  app.use(cookieParser());

  // Health check endpoints
  app.get("/health", healthCheck);
  app.get("/ready", readinessCheck);
  app.get("/healthz", healthzCheck);
  app.get("/readyz", readyzCheck);

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
  app.use("/api/v1/search", searchRoutes);
  app.use("/api/v1/saved-filters", savedFiltersRoutes);
  app.use("/api/v1/admin", adminRoutes);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}


