import { Router } from "express";
import { authMiddleware } from "../middleware/auth-middleware";
import { requirePlatformAdmin } from "../middleware/platform-admin-middleware";
import { adminService } from "../services/admin-service";
import { auditService } from "../services/audit-service";
import type { AuthenticatedRequest } from "../types/request-context";
import { NotFoundError } from "@repo/shared-utils";

const router = Router();

// All routes require authentication and platform admin role
router.use(authMiddleware);
router.use(requirePlatformAdmin());

// GET /api/v1/admin/tenants - List tenants with overview stats
router.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await adminService.getTenantsOverview({
      page,
      pageSize,
      status,
      search,
    });

    res.json({
      data: result.items,
      meta: {
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/tenants/:tenantId - Get tenant detail
router.get("/:tenantId", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { tenantId } = req.params;

    const tenant = await adminService.getTenantDetail(tenantId);

    // Log audit event
    await auditService.log({
      action: "ADMIN_TENANT_VIEWED",
      userId: req.context?.user.id ?? null,
      tenantId: tenantId,
      metadata: {
        viewedBy: req.context?.user.email,
      },
    });

    res.json({ data: tenant });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
});

// PATCH /api/v1/admin/tenants/:tenantId/status - Update tenant status
router.patch("/:tenantId/status", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { tenantId } = req.params;
    const { status } = req.body;

    if (!status || !["ACTIVE", "SUSPENDED"].includes(status)) {
      res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Durum 'ACTIVE' veya 'SUSPENDED' olmalıdır.",
        },
      });
      return;
    }

    const tenant = await adminService.updateTenantStatus(tenantId, status);

    // Log audit event
    const action = status === "SUSPENDED" ? "TENANT_SUSPEND" : "TENANT_ACTIVATE";
    await auditService.log({
      action,
      userId: req.context?.user.id ?? null,
      tenantId: tenantId,
      metadata: {
        previousStatus: tenant.status,
        newStatus: status,
        changedBy: req.context?.user.email,
      },
    });

    res.json({
      data: tenant,
      message: status === "SUSPENDED" ? "Kiracı askıya alındı." : "Kiracı aktif edildi.",
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
});

export default router;



