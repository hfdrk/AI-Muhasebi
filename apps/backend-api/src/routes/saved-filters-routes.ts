import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import type { NextFunction, Response } from "express";
import { ValidationError, AuthorizationError, NotFoundError } from "@repo/shared-utils";
import { savedFilterService } from "../services/saved-filter-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

const createSavedFilterSchema = z.object({
  name: z.string().min(1, "Filtre adı gerekli."),
  target: z.enum([
    "CLIENT_COMPANIES",
    "INVOICES",
    "DOCUMENTS",
    "RISK_ALERTS",
    "REPORTS",
  ] as const),
  filters: z.any(), // Accept any JSON object
  isDefault: z.boolean().optional(),
});

const updateSavedFilterSchema = z.object({
  name: z.string().min(1, "Filtre adı gerekli.").optional(),
  filters: z.any().optional(), // Accept any JSON object
  isDefault: z.boolean().optional(),
});

router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const target = req.query.target as string | undefined;

      if (!req.context?.tenantId || !req.context?.user) {
        return res.status(401).json({
          error: {
            message: "Yetkilendirme gerekli.",
          },
        });
      }

      // Validate target if provided
      if (target && !["CLIENT_COMPANIES", "INVOICES", "DOCUMENTS", "RISK_ALERTS", "REPORTS"].includes(target)) {
        return res.status(400).json({
          error: {
            message: "Geçersiz hedef filtre türü.",
          },
        });
      }

      const filters = await savedFilterService.listSavedFilters(
        req.context.tenantId,
        req.context.user.id,
        target as any
      );

      res.json({ data: filters });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.context?.tenantId || !req.context?.user) {
        return res.status(401).json({
          error: {
            message: "Yetkilendirme gerekli.",
          },
        });
      }

      const body = createSavedFilterSchema.parse(req.body);
      const filter = await savedFilterService.createSavedFilter(
        req.context.tenantId,
        req.context.user.id,
        body
      );

      res.status(201).json({ data: filter });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

router.put(
  "/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.context?.tenantId || !req.context?.user) {
        return res.status(401).json({
          error: {
            message: "Yetkilendirme gerekli.",
          },
        });
      }

      const body = updateSavedFilterSchema.parse(req.body);
      const filter = await savedFilterService.updateSavedFilter(
        req.context.tenantId,
        req.context.user.id,
        req.params.id,
        body
      );

      res.json({ data: filter });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          error: {
            message: error.message,
          },
        });
      }
      next(error);
    }
  }
);

router.delete(
  "/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.context?.tenantId || !req.context?.user) {
        return res.status(401).json({
          error: {
            message: "Yetkilendirme gerekli.",
          },
        });
      }

      await savedFilterService.deleteSavedFilter(
        req.context.tenantId,
        req.context.user.id,
        req.params.id
      );

      res.json({ data: { message: "Kayıtlı filtre silindi." } });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          error: {
            message: error.message,
          },
        });
      }
      next(error);
    }
  }
);

export default router;

