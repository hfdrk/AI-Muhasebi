import express from "express";
import cookieParser from "cookie-parser";
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

// Validate environment variables at startup
validateEnv();

const app = express();
const PORT = process.env.PORT || 3001;

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

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`);
});

