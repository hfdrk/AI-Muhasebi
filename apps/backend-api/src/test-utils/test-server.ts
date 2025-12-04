// Import env setup FIRST - this must run before any other imports
import "./env-setup.js";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { errorHandler } from "../middleware/error-handler";
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

/**
 * Create an Express app instance for testing
 * This is similar to the main server but without starting a listener
 */
export function createTestApp() {
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

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

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

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}


