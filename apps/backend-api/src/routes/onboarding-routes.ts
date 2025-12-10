import { Router, type Response, type Router as ExpressRouter } from "express";
import { onboardingService } from "../services/onboarding-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/v1/onboarding/state
router.get("/state", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.context!.tenantId!;

    const state = await onboardingService.getOnboardingState(tenantId);

    res.json({
      data: state,
    });
  } catch (error: any) {
    console.error("Error getting onboarding state:", error);
    res.status(500).json({
      error: {
        message: "Onboarding durumu alınırken bir hata oluştu.",
      },
    });
  }
});

export default router;


