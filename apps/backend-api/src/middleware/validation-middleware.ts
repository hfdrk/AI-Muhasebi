import type { Request, Response, NextFunction } from "express";
import { z, type ZodSchema } from "zod";
import { sanitizeObject } from "@repo/shared-utils";

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Express middleware that validates request body, query, and params using Zod schemas.
 * Also sanitizes validated body to prevent XSS.
 *
 * ZodErrors that occur during validation will bubble up to the global error handler,
 * which already formats them into proper 400 responses.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }

    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }

    if (schemas.body) {
      const validated = schemas.body.parse(req.body);
      req.body = sanitizeObject(validated);
    }

    next();
  };
}

// ─── Common Reusable Schemas ─────────────────────────────────────────

/** Pagination query parameters with enforced limits */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/** UUID path parameter */
export const idParamSchema = z.object({
  id: z.string().min(1, "ID gerekli"),
});

/** Client company ID path parameter */
export const clientCompanyIdParamSchema = z.object({
  clientCompanyId: z.string().min(1, "Müşteri şirket ID gerekli"),
});

/** Common list filter with optional clientCompanyId and status */
export const baseListQuerySchema = paginationSchema.extend({
  clientCompanyId: z.string().optional(),
  status: z.string().optional(),
});

/** Period filter (YYYY-MM format) */
export const periodQuerySchema = baseListQuerySchema.extend({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Dönem formatı: YYYY-MM").optional(),
});

/** Status update body */
export const statusUpdateSchema = z.object({
  status: z.string().min(1, "Durum gerekli"),
  notes: z.string().optional(),
});
