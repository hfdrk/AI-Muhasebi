import { Router } from "express";
import { z } from "zod";
import { tenantService } from "../services/tenant-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requireRole } from "../middleware/rbac-middleware";
import { TENANT_ROLES } from "@repo/core-domain";
import type { AuthenticatedRequest, Response } from "../types/request-context";

const router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

const updateTenantSchema = z.object({
  name: z.string().min(1, "Ofis adı gerekli.").optional(),
  taxNumber: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Geçerli bir e-posta adresi giriniz.").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  settings: z.record(z.unknown()).optional().nullable(),
});

router.get("/:tenantId", async (req: AuthenticatedRequest, res: Response) => {
  const tenant = await tenantService.getTenant(req.context!.tenantId!);

  res.json({
    data: tenant,
  });
});

router.patch(
  "/:tenantId",
  requireRole(TENANT_ROLES.TENANT_OWNER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = updateTenantSchema.parse(req.body);
      const tenant = await tenantService.updateTenant(
        req.context!.tenantId!,
        body,
        req.context!.user.id
      );

      res.json({
        data: tenant,
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

