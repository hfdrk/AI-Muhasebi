import type { Request, Response, NextFunction } from "express";
import { AuthenticationError, NotFoundError } from "@repo/shared-utils";
import { prisma } from "../lib/prisma";
import type { AuthenticatedRequest } from "../types/request-context";

export async function tenantMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.context?.user) {
      throw new AuthenticationError("Yetkilendirme gerekli.");
    }

    // Resolve tenant from URL parameter /t/:tenantId, header, query, or from token
    let tenantId: string | undefined;

    // Check URL parameter first (e.g., /t/:tenantId/...)
    if (req.params.tenantId) {
      tenantId = req.params.tenantId;
    } else if (req.headers["x-tenant-id"] && typeof req.headers["x-tenant-id"] === "string") {
      // Check X-Tenant-Id header (used in tests and API clients)
      tenantId = req.headers["x-tenant-id"];
    } else if (req.query.tenantId && typeof req.query.tenantId === "string") {
      tenantId = req.query.tenantId;
    } else if (req.context.tenantId) {
      // Fallback to tenant from token
      tenantId = req.context.tenantId;
    }

    if (!tenantId) {
      throw new NotFoundError("Kiracı bulunamadı.");
    }

    // Verify user is member of tenant
    const membership = await prisma.userTenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: req.context.user.id,
          tenantId,
        },
      },
      include: {
        tenant: true,
      },
    });

    if (!membership || membership.status !== "active") {
      throw new AuthenticationError("Bu kiracıya erişim yetkiniz yok.");
    }

    // Set tenant context for PostgreSQL Row-Level Security
    // This ensures RLS policies can filter rows by tenant_id
    // Note: SET LOCAL doesn't support parameterized queries ($1), so we
    // strictly validate the UUID format before interpolating
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(tenantId)) {
        await prisma.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${tenantId}'`);
      }
    } catch {
      // RLS context setting is a safety net — don't block the request if it fails
    }

    // Attach tenant and membership to context
    req.context.tenantId = tenantId;
    req.context.membership = {
      id: membership.id,
      userId: membership.userId,
      tenantId: membership.tenantId,
      role: membership.role as "TenantOwner" | "Accountant" | "Staff" | "ReadOnly",
      status: membership.status as "active" | "invited" | "suspended",
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    };

    next();
  } catch (error) {
    next(error);
  }
}

