import { Router, type Router as ExpressRouter } from "express";
import type { NextFunction, Response } from "express";
import { z } from "zod";
import { securityService } from "../services/security-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Enable 2FA
router.post(
  "/2fa/enable",
  requirePermission("users:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.body.userId || req.context!.user!.id;
      const twoFactorAuth = await securityService.enable2FA(
        req.context!.tenantId!,
        userId
      );
      res.json({ data: twoFactorAuth });
    } catch (error) {
      next(error);
    }
  }
);

// Verify and enable 2FA
router.post(
  "/2fa/verify",
  requirePermission("users:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = z.object({
        userId: z.string().optional(),
        token: z.string().length(6, "2FA kodu 6 haneli olmalıdır."),
      }).parse(req.body);

      const userId = body.userId || req.context!.user!.id;
      const result = await securityService.verifyAndEnable2FA(
        req.context!.tenantId!,
        userId,
        body.token
      );
      res.json({ data: result });
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

// Disable 2FA
router.post(
  "/2fa/disable",
  requirePermission("users:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.body.userId || req.context!.user!.id;
      await securityService.disable2FA(req.context!.tenantId!, userId);
      res.json({ data: { message: "2FA devre dışı bırakıldı." } });
    } catch (error) {
      next(error);
    }
  }
);

// Add IP to whitelist
router.post(
  "/ip-whitelist",
  requirePermission("admin"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = z.object({
        ipAddress: z.string().min(1, "IP adresi gerekli."),
        description: z.string().optional(),
        userId: z.string().optional(),
      }).parse(req.body);

      const whitelistEntry = await securityService.addIPWhitelist(
        req.context!.tenantId!,
        body.ipAddress,
        body.description,
        body.userId
      );
      res.json({ data: whitelistEntry });
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

// Check IP whitelist status
router.get(
  "/ip-whitelist/check",
  requirePermission("users:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || "";
      const userId = req.context!.user!.id;
      const isWhitelisted = await securityService.isIPWhitelisted(
        req.context!.tenantId!,
        ipAddress,
        userId
      );
      res.json({ data: { isWhitelisted, ipAddress } });
    } catch (error) {
      next(error);
    }
  }
);

// Validate password
router.post(
  "/password/validate",
  requirePermission("users:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = z.object({
        password: z.string().min(1, "Şifre gerekli."),
      }).parse(req.body);

      const validation = securityService.validatePassword(body.password);
      res.json({ data: validation });
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

// Get account lockout status
router.get(
  "/account-lockout/:userId",
  requirePermission("users:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = await securityService.getAccountLockoutStatus(req.params.userId);
      res.json({ data: status });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

