import { Router, type Router as ExpressRouter } from "express";
import type { NextFunction, Response } from "express";
import { ValidationError } from "@repo/shared-utils";
import { globalSearchService } from "../services/global-search-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

router.get(
  "/global",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query.query as string | undefined;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          error: {
            message: "Arama sorgusu en az 2 karakter olmalıdır.",
          },
        });
      }

      if (!req.context?.tenantId || !req.context) {
        return res.status(401).json({
          error: {
            message: "Yetkilendirme gerekli.",
          },
        });
      }

      const results = await globalSearchService.search(
        req.context.tenantId,
        req.context,
        query,
        {
          limitPerGroup: 5,
        }
      );

      res.json({ data: results });
    } catch (error) {
      next(error);
    }
  }
);

export default router;



