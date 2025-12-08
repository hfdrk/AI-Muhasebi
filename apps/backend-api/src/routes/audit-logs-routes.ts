import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requireRole } from "../middleware/rbac-middleware";
import { TENANT_ROLES } from "@repo/core-domain";
import type { AuthenticatedRequest, Response } from "../types/request-context";

const router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/v1/audit-logs
router.get(
  "/",
  requireRole(TENANT_ROLES.TENANT_OWNER, TENANT_ROLES.ACCOUNTANT),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.context!.tenantId!;

      // Parse query parameters
      const querySchema = z.object({
        user_id: z.string().optional(),
        action: z.string().optional(),
        resource_type: z.string().optional(),
        from: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
        to: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
        limit: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) : 50)),
        offset: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) : 0)),
        page: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) : undefined)),
        pageSize: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) : undefined)),
      });

      const query = querySchema.parse(req.query);

      // Handle pagination (support both offset/limit and page/pageSize)
      let limit = query.limit;
      let offset = query.offset;

      if (query.page !== undefined && query.pageSize !== undefined) {
        limit = query.pageSize;
        offset = (query.page - 1) * query.pageSize;
      }

      // Build where clause
      const where: any = {
        tenantId,
      };

      if (query.user_id) {
        where.userId = query.user_id;
      }

      if (query.action) {
        where.action = {
          contains: query.action,
        };
      }

      if (query.resource_type) {
        where.resourceType = query.resource_type;
      }

      if (query.from || query.to) {
        where.createdAt = {};
        if (query.from) {
          where.createdAt.gte = query.from;
        }
        if (query.to) {
          where.createdAt.lte = query.to;
        }
      }

      // Get total count
      const total = await prisma.auditLog.count({ where });

      // Get logs with user info
      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      });

      // Format response
      const data = logs.map((log) => ({
        id: log.id,
        user: log.user
          ? {
              id: log.user.id,
              name: log.user.fullName,
              email: log.user.email,
            }
          : null,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        ipAddress: log.ipAddress,
        metadata: log.metadata,
        createdAt: log.createdAt,
      }));

      res.json({
        data,
        meta: {
          total,
          limit,
          offset,
          ...(query.page !== undefined && query.pageSize !== undefined
            ? {
                page: query.page,
                pageSize: query.pageSize,
                totalPages: Math.ceil(total / query.pageSize),
              }
            : {}),
        },
      });
    } catch (error: any) {
      console.error("Error listing audit logs:", error);
      if (error instanceof z.ZodError) {
        const statusCode = 400;
        const message = "Geçersiz sorgu parametreleri.";
        res.status(statusCode).json({ error: { message } });
      } else {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Denetim kayıtları alınırken bir hata oluştu.";
        res.status(statusCode).json({ error: { message } });
      }
    }
  }
);

export default router;

