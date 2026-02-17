import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/request-context";

/**
 * Middleware factory that checks usage limits before allowing a request.
 * Returns 429 if the tenant has exceeded their plan limit for the given metric.
 */
export function checkUsageLimit(metric: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.context?.tenantId;
      if (!tenantId) {
        return next();
      }

      const { usageService } = await import("../services/usage-service");
      const result = await usageService.checkLimit(tenantId, metric as any);

      if (!result.allowed) {
        return res.status(429).json({
          error: {
            message: `Plan limitinize ulaştınız (${metric}). Daha fazla kullanım için planınızı yükseltin.`,
            code: "USAGE_LIMIT_EXCEEDED",
            limit: result.limit,
            remaining: 0,
          },
        });
      }

      next();
    } catch (error) {
      // Don't block requests if usage check fails — log and continue
      next();
    }
  };
}
