import { Router } from "express";
import { z } from "zod";
import { tenantService } from "../services/tenant-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requireRole, requirePermission } from "../middleware/rbac-middleware";
import { TENANT_ROLES } from "@repo/core-domain";
import type { AuthenticatedRequest, Response } from "../types/request-context";

const router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

const inviteUserSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  role: z.enum(["TenantOwner", "Accountant", "Staff", "ReadOnly"]),
});

const changeRoleSchema = z.object({
  role: z.enum(["TenantOwner", "Accountant", "Staff", "ReadOnly"]),
});

const updateStatusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});

const acceptInvitationSchema = z.object({
  password: z.string().min(1, "Şifre gerekli.").optional(),
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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = inviteUserSchema.parse(req.body);
      await tenantService.inviteUser(
        req.context!.tenantId!,
        body.email,
        body.role,
        req.context!.user.id
      );

      res.status(201).json({
        data: {
          message: "Kullanıcı davet edildi.",
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0]?.message || "Geçersiz bilgiler.");
      }
      throw error;
    }
  }
);

router.post(
  "/:tenantId/users/:userId/accept-invitation",
  async (req: AuthenticatedRequest, res: Response) => {
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
        throw new Error(error.errors[0]?.message || "Geçersiz bilgiler.");
      }
      throw error;
    }
  }
);

router.patch(
  "/:tenantId/users/:userId/role",
  requirePermission("users:update"),
  async (req: AuthenticatedRequest, res: Response) => {
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
        throw new Error(error.errors[0]?.message || "Geçersiz bilgiler.");
      }
      throw error;
    }
  }
);

router.patch(
  "/:tenantId/users/:userId/status",
  requirePermission("users:update"),
  async (req: AuthenticatedRequest, res: Response) => {
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
        throw new Error(error.errors[0]?.message || "Geçersiz bilgiler.");
      }
      throw error;
    }
  }
);

export default router;

