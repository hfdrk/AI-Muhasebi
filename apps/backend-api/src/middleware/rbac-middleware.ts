import type { Request, Response, NextFunction } from "express";
import { AuthorizationError } from "@repo/shared-utils";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "@repo/core-domain";
import type { AuthenticatedRequest } from "../types/request-context";
import type { TenantRole, Permission } from "@repo/core-domain";

export function requireRole(...allowedRoles: TenantRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.context?.membership) {
      throw new AuthorizationError("Bu işlem için kiracı üyeliği gerekli.");
    }

    if (!allowedRoles.includes(req.context.membership.role)) {
      throw new AuthorizationError(
        `Bu işlem için şu rollerden biri gerekli: ${allowedRoles.join(", ")}`
      );
    }

    next();
  };
}

export function requirePermission(...permissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.context?.membership) {
      throw new AuthorizationError("Bu işlem için kiracı üyeliği gerekli.");
    }

    const hasRequiredPermission = hasAllPermissions(req.context.membership.role, permissions);

    if (!hasRequiredPermission) {
      throw new AuthorizationError("Bu işlemi yapmak için yetkiniz yok.");
    }

    next();
  };
}

export function requireAnyPermission(...permissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.context?.membership) {
      throw new AuthorizationError("Bu işlem için kiracı üyeliği gerekli.");
    }

    const hasRequiredPermission = hasAnyPermission(req.context.membership.role, permissions);

    if (!hasRequiredPermission) {
      throw new AuthorizationError("Bu işlemi yapmak için yetkiniz yok.");
    }

    next();
  };
}

