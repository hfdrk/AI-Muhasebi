import { Router, type Router as ExpressRouter } from "express";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import { z } from "zod";
import { validate } from "../middleware/validation-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response, NextFunction } from "express";

const upsertProfileBody = z.object({
  licenseType: z.string().min(1, "Lisans türü gerekli"),
  licenseNumber: z.string().min(1, "Lisans numarası gerekli"),
  turmobNumber: z.string().optional(),
  chamberName: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  insuranceProvider: z.string().optional(),
  insuranceAmount: z.number().optional(),
  insuranceExpiry: z.string().optional(),
  insurancePolicyNo: z.string().optional(),
});

const updateCpdHoursBody = z.object({
  hours: z.number().min(0, "Saat 0'dan büyük olmalı"),
});

const updateMasakTrainingBody = z.object({
  trainingDate: z.string().min(1, "Eğitim tarihi gerekli"),
});

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/v1/mali-musavir/dashboard - Comprehensive dashboard
router.get(
  "/dashboard",
  requirePermission("mali_musavir:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { maliMusavirDashboardService } = await import("../services/mali-musavir-dashboard-service");
      const dashboard = await maliMusavirDashboardService.getDashboard(req.context!.tenantId!);
      res.json({ data: dashboard });
    } catch (error: any) {
      next(error);
    }
  }
);

// GET /api/v1/mali-musavir/profile - Get profile
router.get(
  "/profile",
  requirePermission("mali_musavir:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { maliMusavirDashboardService } = await import("../services/mali-musavir-dashboard-service");
      const profile = await maliMusavirDashboardService.getProfile(req.context!.tenantId!);
      res.json({ data: profile });
    } catch (error: any) {
      next(error);
    }
  }
);

// PUT /api/v1/mali-musavir/profile - Create or update profile
router.put(
  "/profile",
  requirePermission("mali_musavir:manage"),
  validate({ body: upsertProfileBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { maliMusavirDashboardService } = await import("../services/mali-musavir-dashboard-service");
      const profile = await maliMusavirDashboardService.upsertProfile(
        req.context!.tenantId!,
        req.body
      );
      res.json({ data: profile });
    } catch (error: any) {
      next(error);
    }
  }
);

// PATCH /api/v1/mali-musavir/cpd-hours - Update CPD hours
router.patch(
  "/cpd-hours",
  requirePermission("mali_musavir:manage"),
  validate({ body: updateCpdHoursBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { maliMusavirDashboardService } = await import("../services/mali-musavir-dashboard-service");
      const profile = await maliMusavirDashboardService.updateCpdHours(
        req.context!.tenantId!,
        req.body.hours
      );
      res.json({ data: profile });
    } catch (error: any) {
      next(error);
    }
  }
);

// PATCH /api/v1/mali-musavir/masak-training - Update MASAK training date
router.patch(
  "/masak-training",
  requirePermission("mali_musavir:manage"),
  validate({ body: updateMasakTrainingBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { maliMusavirDashboardService } = await import("../services/mali-musavir-dashboard-service");
      const profile = await maliMusavirDashboardService.updateMasakTraining(
        req.context!.tenantId!,
        req.body.trainingDate
      );
      res.json({ data: profile });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
