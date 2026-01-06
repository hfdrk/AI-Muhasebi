import { Router } from "express";
import { authMiddleware } from "../middleware/auth-middleware";
import { requirePlatformAdmin } from "../middleware/platform-admin-middleware";
import { adminService } from "../services/admin-service";

const router: Router = Router();

// All routes require authentication and platform admin role
router.use(authMiddleware);
router.use(requirePlatformAdmin());

// GET /api/v1/admin/support/incidents - List support incidents
router.get("/incidents", async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;
    const tenantId = req.query.tenantId as string | undefined;
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;

    const result = await adminService.getSupportIncidents({
      page,
      pageSize,
      tenantId,
      type,
      status,
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







