import { Router } from "express";
import { authMiddleware } from "../middleware/auth-middleware";
import { requirePlatformAdmin } from "../middleware/platform-admin-middleware";
import { adminService } from "../services/admin-service";

const router = Router();

// All routes require authentication and platform admin role
router.use(authMiddleware);
router.use(requirePlatformAdmin());

// GET /api/v1/admin/metrics/overview - Get platform metrics
router.get("/overview", async (req, res, next) => {
  try {
    const metrics = await adminService.getPlatformMetrics();

    res.json({
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
});

export default router;



