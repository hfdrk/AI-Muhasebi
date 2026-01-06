import { z } from "zod";
import type { NextFunction } from "express";
import { ValidationError } from "@repo/shared-utils";
import { tenantService } from "../services/tenant-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requireRole, requirePermission } from "../middleware/rbac-middleware";
import { TENANT_ROLES } from "@repo/core-domain";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response } from "express";

import { Router, type Router as ExpressRouter } from "express";
const router: ExpressRouter = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

const inviteUserSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz.").max(255, "E-posta adresi en fazla 255 karakter olabilir."),
  role: z.enum(["TenantOwner", "Accountant", "Staff", "ReadOnly"]),
  name: z.string().max(255, "İsim en fazla 255 karakter olabilir.").optional(),
});

const changeRoleSchema = z.object({
  role: z.enum(["TenantOwner", "Accountant", "Staff", "ReadOnly"]),
});

const updateStatusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});

const acceptInvitationSchema = z.object({
  password: z.string().min(1, "Şifre gerekli.").max(255, "Şifre en fazla 255 karakter olabilir.").optional(),
});

const updateUserSchema = z.object({
  role: z.enum(["TenantOwner", "Accountant", "Staff", "ReadOnly"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

router.get(
  "/:tenantId/users",
  requirePermission("users:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    const users = await tenantService.listTenantUsers(req.context!.tenantId!);

    res.json({
      data: users,
    });
  }
);

router.post(
  "/:tenantId/users/invite",
  requirePermission("users:invite"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = inviteUserSchema.parse(req.body);
      const normalizedEmail = body.email.toLowerCase().trim();
      await tenantService.inviteUser(
        req.context!.tenantId!,
        body.email,
        body.role,
        req.context!.user.id,
        body.name
      );

      res.status(201).json({
        data: {
          email: normalizedEmail,
          role: body.role,
          message: "Kullanıcı davet edildi.",
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

router.post(
  "/:tenantId/users/:userId/accept-invitation",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = acceptInvitationSchema.parse(req.body);
      await tenantService.acceptInvitation(
        req.params.userId,
        req.context!.tenantId!,
        body.password || ""
      );

      res.json({
        data: {
          message: "Davet kabul edildi.",
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

router.patch(
  "/:tenantId/users/:userId/role",
  requirePermission("users:update"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = changeRoleSchema.parse(req.body);
      await tenantService.changeUserRole(
        req.context!.tenantId!,
        req.params.userId,
        body.role,
        req.context!.user.id
      );

      res.json({
        data: {
          message: "Kullanıcı rolü güncellendi.",
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

router.patch(
  "/:tenantId/users/:userId/status",
  requirePermission("users:update"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = updateStatusSchema.parse(req.body);
      await tenantService.updateUserStatus(
        req.context!.tenantId!,
        req.params.userId,
        body.status,
        req.context!.user.id
      );

      res.json({
        data: {
          message: `Kullanıcı ${body.status === "active" ? "aktif" : "devre dışı"} edildi.`,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

// Unified PATCH route that accepts either role or status
router.patch(
  "/:tenantId/users/:userId",
  requirePermission("users:update"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = updateUserSchema.parse(req.body);

      if (body.role) {
        await tenantService.changeUserRole(
          req.context!.tenantId!,
          req.params.userId,
          body.role,
          req.context!.user.id
        );

        res.json({
          data: {
            message: "Kullanıcı rolü güncellendi.",
          },
        });
      } else if (body.status) {
        await tenantService.updateUserStatus(
          req.context!.tenantId!,
          req.params.userId,
          body.status,
          req.context!.user.id
        );

        res.json({
          data: {
            message: `Kullanıcı ${body.status === "active" ? "aktif" : "devre dışı"} edildi.`,
          },
        });
      } else {
        return next(new ValidationError("Rol veya durum belirtilmelidir."));
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

export default router;


