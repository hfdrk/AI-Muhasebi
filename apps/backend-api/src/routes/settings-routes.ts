import { z } from "zod";
import { settingsService } from "../services/settings-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requireRole } from "../middleware/rbac-middleware";
import { TENANT_ROLES } from "@repo/core-domain";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response } from "express";
import { ValidationError, logger } from "@repo/shared-utils";

import { Router, type Router as ExpressRouter } from "express";
const router: ExpressRouter = Router();

// Tenant settings routes
const tenantSettingsRouter = Router();
tenantSettingsRouter.use(authMiddleware);
tenantSettingsRouter.use(tenantMiddleware);

const updateTenantSettingsSchema = z.object({
  displayName: z.string().min(1).max(255).nullable().optional(),
  logoUrl: z.string().url("Geçerli bir URL giriniz.").max(500).nullable().optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  emailFromName: z.string().max(255).nullable().optional(),
  riskThresholds: z
    .object({
      high: z.number().min(0).max(100),
      critical: z.number().min(0).max(100),
    })
    .optional(),
  defaultReportPeriod: z
    .enum(["LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "LAST_MONTH", "THIS_YEAR", "LAST_YEAR"])
    .optional(),
});

// GET /api/v1/settings/tenant
tenantSettingsRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.context!.tenantId!;
    const settings = await settingsService.getTenantSettings(tenantId);

    res.json({ data: settings });
  } catch (error: any) {
    logger.error("Error getting tenant settings:", { error });
    const statusCode = error.statusCode || 500;
    const message = error.message || "Ofis ayarları alınırken bir hata oluştu.";
    res.status(statusCode).json({ error: { message } });
  }
});

// PUT /api/v1/settings/tenant
tenantSettingsRouter.put(
  "/",
  requireRole(TENANT_ROLES.TENANT_OWNER), // Only Accountant role can update
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.context!.tenantId!;
      const body = updateTenantSettingsSchema.parse(req.body);
      const settings = await settingsService.updateTenantSettings(tenantId, body as any);

      res.json({ data: settings });
    } catch (error: any) {
      logger.error("Error updating tenant settings:", { error });
      if (error instanceof z.ZodError) {
        const statusCode = 400;
        const message = error.issues[0]?.message || "Geçersiz bilgiler.";
        res.status(statusCode).json({ error: { message } });
      } else {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Ofis ayarları güncellenirken bir hata oluştu.";
        res.status(statusCode).json({ error: { message } });
      }
    }
  }
);

// User settings routes
const userSettingsRouter = Router();
userSettingsRouter.use(authMiddleware);
userSettingsRouter.use(tenantMiddleware);

const updateUserSettingsSchema = z.object({
  locale: z.string().max(10).nullable().optional(),
  timezone: z.string().max(50).nullable().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  inAppNotificationsEnabled: z.boolean().optional(),
});

// GET /api/v1/settings/user
userSettingsRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.context!.user!.id;
    const tenantId = req.context!.tenantId!;
    const effectiveSettings = await settingsService.getUserSettings(userId, tenantId);

    res.json({ data: effectiveSettings });
  } catch (error: any) {
    logger.error("Error getting user settings:", { error });
    const statusCode = error.statusCode || 500;
    const message = error.message || "Kullanıcı ayarları alınırken bir hata oluştu.";
    res.status(statusCode).json({ error: { message } });
  }
});

// PUT /api/v1/settings/user
userSettingsRouter.put("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.context!.user!.id;
    const body = updateUserSettingsSchema.parse(req.body);
    const settings = await settingsService.updateUserSettings(userId, body);

    // Get effective settings for response
    const tenantId = req.context!.tenantId!;
    const effectiveSettings = await settingsService.getUserSettings(userId, tenantId);

    res.json({ data: effectiveSettings });
  } catch (error: any) {
    logger.error("Error updating user settings:", { error });
    if (error instanceof z.ZodError) {
      const statusCode = 400;
      const message = error.issues[0]?.message || "Geçersiz bilgiler.";
      res.status(statusCode).json({ error: { message } });
    } else {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Kullanıcı ayarları güncellenirken bir hata oluştu.";
      res.status(statusCode).json({ error: { message } });
    }
  }
});

// Mount routers
router.use("/tenant", tenantSettingsRouter);
router.use("/user", userSettingsRouter);

export default router;




