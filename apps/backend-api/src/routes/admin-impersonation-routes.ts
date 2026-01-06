import { Router } from "express";
import { authMiddleware } from "../middleware/auth-middleware";
import { requirePlatformAdmin } from "../middleware/platform-admin-middleware";
import { generateAccessToken } from "@repo/shared-utils";
import { prisma } from "../lib/prisma";
import { auditService } from "../services/audit-service";
import { NotFoundError, AuthenticationError } from "@repo/shared-utils";
import type { AuthenticatedRequest } from "../types/request-context";

const router: Router = Router();

// All routes require authentication and platform admin role
router.use(authMiddleware);
router.use(requirePlatformAdmin());

// POST /api/v1/admin/impersonation/start - Start impersonation
router.post("/start", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { targetUserId, targetTenantId: requestedTenantId, targetUserEmail } = req.body;

    if (!targetUserId && !targetUserEmail) {
      res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "targetUserId veya targetUserEmail gerekli.",
        },
      });
      return;
    }

    // Find target user
    let targetUser;
    if (targetUserId) {
      targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: {
          memberships: {
            where: { status: "active" },
            include: { tenant: true },
          },
        },
      });
    } else if (targetUserEmail) {
      targetUser = await prisma.user.findUnique({
        where: { email: targetUserEmail.toLowerCase().trim() },
        include: {
          memberships: {
            where: { status: "active" },
            include: { tenant: true },
          },
        },
      });
    }

    if (!targetUser || !targetUser.isActive) {
      throw new NotFoundError("Hedef kullanıcı bulunamadı veya devre dışı.");
    }

    // Determine target tenant
    let finalTenantId: string | undefined;
    if (requestedTenantId) {
      // Verify user is member of specified tenant
      const membership = targetUser.memberships.find((m) => m.tenantId === requestedTenantId);
      if (!membership) {
        throw new AuthenticationError("Kullanıcı belirtilen kiracıya üye değil.");
      }
      finalTenantId = requestedTenantId;
    } else {
      // Use first active membership
      const firstMembership = targetUser.memberships[0];
      if (!firstMembership) {
        throw new AuthenticationError("Kullanıcının aktif kiracı üyeliği yok.");
      }
      finalTenantId = firstMembership.tenantId;
    }

    const impersonatorId = req.context?.user.id;
    if (!impersonatorId) {
      throw new AuthenticationError("İmpersonasyon başlatılamadı.");
    }

    // Generate short-lived impersonation token (15 minutes)
    const impersonationToken = generateAccessToken({
      userId: targetUser.id,
      email: targetUser.email,
      tenantId: finalTenantId,
      roles: targetUser.memberships
        .filter((m) => m.tenantId === finalTenantId)
        .map((m) => m.role),
      isImpersonating: true,
      impersonatorId,
      impersonatedUserId: targetUser.id,
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Log audit event
    await auditService.log({
      action: "IMPERSONATION_START",
      userId: impersonatorId,
      tenantId: finalTenantId,
      metadata: {
        impersonatorId,
        impersonatorEmail: req.context?.user.email,
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        targetTenantId: finalTenantId,
      },
    });

    res.json({
      data: {
        impersonationToken,
        expiresAt,
        targetUser: {
          id: targetUser.id,
          email: targetUser.email,
          fullName: targetUser.fullName,
        },
        targetTenantId: finalTenantId,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthenticationError) {
      res.status(error instanceof NotFoundError ? 404 : 401).json({
        error: {
          code: error instanceof NotFoundError ? "NOT_FOUND" : "AUTHENTICATION_ERROR",
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
});

// POST /api/v1/admin/impersonation/stop - Stop impersonation
router.post("/stop", async (req: AuthenticatedRequest, res, next) => {
  try {
    const impersonatorId = req.context?.user.id;
    const impersonatedUserId = req.context?.impersonatedUserId;
    const tenantId = req.context?.tenantId;

    // If there's an active impersonation context, log it
    // Otherwise, just acknowledge the stop request (client-side token clearing)
    if (impersonatorId && impersonatedUserId) {
      // Log audit event
      await auditService.log({
        action: "IMPERSONATION_STOP",
        userId: impersonatorId,
        tenantId: tenantId ?? null,
        metadata: {
          impersonatorId,
          impersonatorEmail: req.context?.user.email,
          impersonatedUserId,
        },
      });
    }

    res.json({
      data: {
        message: "İmpersonasyon sonlandırıldı.",
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;



