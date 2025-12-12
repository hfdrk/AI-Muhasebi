import { Router } from "express";
import { authMiddleware } from "../middleware/auth-middleware";
import { requirePlatformAdmin } from "../middleware/platform-admin-middleware";
import { adminService } from "../services/admin-service";
import { auditService } from "../services/audit-service";
import type { AuthenticatedRequest } from "../types/request-context";

const router = Router();

// All routes require authentication and platform admin role
router.use(authMiddleware);
router.use(requirePlatformAdmin());

// GET /api/v1/admin/users - List users with filters
router.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;
    const email = req.query.email as string | undefined;
    const tenantId = req.query.tenantId as string | undefined;
    const role = req.query.role as string | undefined;

    const result = await adminService.getUsersOverview({
      page,
      pageSize,
      email,
      tenantId,
      role,
    });

    // Log audit event for user search
    await auditService.log({
      action: "ADMIN_USER_VIEWED",
      userId: req.context?.user.id ?? null,
      tenantId: null,
      metadata: {
        searchParams: { email, tenantId, role },
        resultCount: result.items.length,
        viewedBy: req.context?.user.email,
      },
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

export default router;




