import { Router } from "express";
import type { NextFunction } from "express";
import { z } from "zod";
import { integrationProviderService } from "../services/integration-provider-service";
import { tenantIntegrationService } from "../services/tenant-integration-service";
import { integrationSyncService } from "../services/integration-sync-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest, Response } from "../types/request-context";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const createIntegrationSchema = z.object({
  providerId: z.string().min(1, "Sağlayıcı gerekli."),
  clientCompanyId: z.string().optional().nullable(),
  displayName: z.string().optional(),
  config: z.any(), // Accept any JSON object for config
});

const updateIntegrationSchema = z.object({
  displayName: z.string().optional(),
  config: z.any().optional(), // Accept any JSON object for config
});

const triggerSyncSchema = z.object({
  jobType: z.enum(["pull_invoices", "pull_bank_transactions"]),
});

// List available providers
router.get(
  "/providers",
  requirePermission("integrations:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const type = req.query.type as "accounting" | "bank" | undefined;
      const providers = await integrationProviderService.listProviders(type);
      res.json({ data: providers });
    } catch (error) {
      next(error);
    }
  }
);

// Get provider by ID
router.get(
  "/providers/:id",
  requirePermission("integrations:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    const provider = await integrationProviderService.getProviderById(req.params.id);

    res.json({ data: provider });
  }
);

// List tenant integrations
router.get(
  "/",
  requirePermission("integrations:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      type: req.query.type as "accounting" | "bank" | undefined,
      clientCompanyId: req.query.clientCompanyId as string | undefined,
      status: req.query.status as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
    };

    const result = await tenantIntegrationService.listIntegrations(req.context!.tenantId!, filters);

    res.json({ data: result });
  }
);

// Get integration by ID
router.get(
  "/:id",
  requirePermission("integrations:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    const integration = await tenantIntegrationService.getIntegrationById(
      req.context!.tenantId!,
      req.params.id
    );

    res.json({ data: integration });
  }
);

// Create integration
router.post(
  "/",
  requirePermission("integrations:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      console.log("[Integration Route] Creating integration, body:", JSON.stringify(req.body));
      const body = createIntegrationSchema.parse(req.body);
      console.log("[Integration Route] Parsed body:", body);
      console.log("[Integration Route] Tenant ID:", req.context!.tenantId!);
      
      const integration = await tenantIntegrationService.createIntegration(
        req.context!.tenantId!,
        body
      );

      console.log("[Integration Route] Integration created successfully:", integration.id);
      res.status(201).json({ data: integration });
    } catch (error: any) {
      console.error("[Integration Route] Error creating integration:", error);
      console.error("[Integration Route] Error stack:", error.stack);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: { 
            message: error.errors[0]?.message || "Geçersiz bilgiler.",
            details: error.errors 
          } 
        });
        return;
      }
      // Pass error to error handler middleware
      next(error);
    }
  }
);

// Update integration
router.patch(
  "/:id",
  requirePermission("integrations:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = updateIntegrationSchema.parse(req.body);
      const integration = await tenantIntegrationService.updateIntegration(
        req.context!.tenantId!,
        req.params.id,
        body
      );

      res.json({ data: integration });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: { 
            message: error.errors[0]?.message || "Geçersiz bilgiler.",
            details: error.errors 
          } 
        });
        return;
      }
      next(error);
    }
  }
);

// Delete/disconnect integration
router.delete(
  "/:id",
  requirePermission("integrations:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await tenantIntegrationService.deleteIntegration(req.context!.tenantId!, req.params.id);
      res.json({ data: { message: "Entegrasyon bağlantısı kesildi." } });
    } catch (error) {
      next(error);
    }
  }
);

// Test connection
router.post(
  "/:id/test-connection",
  requirePermission("integrations:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await tenantIntegrationService.testConnection(
        req.context!.tenantId!,
        req.params.id
      );
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Trigger manual sync
router.post(
  "/:id/sync",
  requirePermission("integrations:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = triggerSyncSchema.parse(req.body);
      const result = await tenantIntegrationService.triggerSync(
        req.context!.tenantId!,
        req.params.id,
        body.jobType
      );

      res.json({ data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: { 
            message: error.errors[0]?.message || "Geçersiz bilgiler.",
            details: error.errors 
          } 
        });
        return;
      }
      next(error);
    }
  }
);

// List sync jobs
router.get(
  "/:id/jobs",
  requirePermission("integrations:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      status: req.query.status as string | undefined,
      jobType: req.query.jobType as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
    };

    const result = await integrationSyncService.listSyncJobs(
      req.context!.tenantId!,
      req.params.id,
      filters
    );

    res.json({ data: result });
  }
);

// List sync logs
router.get(
  "/:id/logs",
  requirePermission("integrations:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      level: req.query.level as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
    };

    const result = await integrationSyncService.listSyncLogs(
      req.context!.tenantId!,
      req.params.id,
      filters
    );

    res.json({ data: result });
  }
);

export default router;

