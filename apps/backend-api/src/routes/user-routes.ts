import { Router } from "express";
import { z } from "zod";
import type { NextFunction } from "express";
import { ValidationError } from "@repo/shared-utils";
import { userService } from "../services/user-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { generateAccessToken } from "@repo/shared-utils";
import type { AuthenticatedRequest, Response } from "../types/request-context";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

const switchTenantSchema = z.object({
  tenantId: z.string().min(1, "Kiracı ID gerekli."),
});

router.get("/me", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await userService.getCurrentUserWithTenants(req.context!.user.id);

    res.json({
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          locale: result.user.locale,
          isActive: result.user.isActive,
          lastLoginAt: result.user.lastLoginAt,
        },
        tenants: result.tenants,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/switch-tenant", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = switchTenantSchema.parse(req.body);

    // Verify user is member of tenant
    const { prisma } = await import("../lib/prisma");
    const membership = await prisma.userTenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: req.context!.user.id,
          tenantId: body.tenantId,
        },
      },
    });

    if (!membership || membership.status !== "active") {
      return next(new ValidationError("Bu kiracıya erişim yetkiniz yok."));
    }

    // Generate new access token with new tenant
    const accessToken = generateAccessToken({
      userId: req.context!.user.id,
      email: req.context!.user.email,
      tenantId: body.tenantId,
      roles: [membership.role],
    });

    res.json({
      data: {
        accessToken,
        tenantId: body.tenantId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError(error.errors[0]?.message || "Geçersiz bilgiler."));
    }
    next(error);
  }
});

export default router;

