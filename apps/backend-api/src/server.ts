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
import { validateEnv } from "@repo/config";
import { errorHandler } from "./middleware/error-handler";
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

const server = app.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`);
});

// Handle server errors
server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Please use a different port.`);
  } else {
    console.error("Server error:", error);
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

