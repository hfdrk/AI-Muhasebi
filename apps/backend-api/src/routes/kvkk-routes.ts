import { Router, type Router as ExpressRouter } from "express";
import type { NextFunction, Response } from "express";
import { z } from "zod";
import { kvkkComplianceService } from "../services/kvkk-compliance-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const recordConsentSchema = z.object({
  userId: z.string().min(1, "Kullanıcı ID gerekli."),
  consentType: z.enum(["data_processing", "marketing", "analytics", "third_party"]),
  granted: z.boolean(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

// Record consent
router.post(
  "/consent",
  requirePermission("users:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = recordConsentSchema.parse(req.body);
      const consent = await kvkkComplianceService.recordConsent(
        req.context!.tenantId!,
        body.userId,
        body.consentType,
        body.granted,
        body.ipAddress,
        body.userAgent
      );
      res.json({ data: consent });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            message: error.issues[0]?.message || "Geçersiz bilgiler.",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  }
);

// Get consent status
router.get(
  "/consent/:userId",
  requirePermission("users:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = await kvkkComplianceService.getConsentStatus(
        req.context!.tenantId!,
        req.params.userId
      );
      res.json({ data: status });
    } catch (error) {
      next(error);
    }
  }
);

// Request data access
router.post(
  "/data-access/:userId",
  requirePermission("users:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const request = await kvkkComplianceService.requestDataAccess(
        req.context!.tenantId!,
        req.params.userId
      );
      res.json({ data: request });
    } catch (error) {
      next(error);
    }
  }
);

// Request data deletion
router.post(
  "/data-deletion/:userId",
  requirePermission("users:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const request = await kvkkComplianceService.requestDataDeletion(
        req.context!.tenantId!,
        req.params.userId
      );
      res.json({ data: request });
    } catch (error) {
      next(error);
    }
  }
);

// Record data breach
router.post(
  "/breach",
  requirePermission("admin"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = z.object({
        description: z.string().min(1, "Açıklama gerekli."),
        affectedUsers: z.number().int().min(0),
        severity: z.enum(["low", "medium", "high", "critical"]),
      }).parse(req.body);

      const breach = await kvkkComplianceService.recordBreach(
        req.context!.tenantId!,
        body.description,
        body.affectedUsers,
        body.severity
      );
      res.json({ data: breach });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            message: error.issues[0]?.message || "Geçersiz bilgiler.",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  }
);

// Check data retention
router.get(
  "/retention/:userId",
  requirePermission("users:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const retention = await kvkkComplianceService.checkDataRetention(
        req.context!.tenantId!,
        req.params.userId
      );
      res.json({ data: retention });
    } catch (error) {
      next(error);
    }
  }
);

// Get data access audit log
router.get(
  "/audit-log",
  requirePermission("audit:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.userId as string | undefined;
      const auditLog = await kvkkComplianceService.getDataAccessAuditLog(
        req.context!.tenantId!,
        userId
      );
      res.json({ data: auditLog });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

