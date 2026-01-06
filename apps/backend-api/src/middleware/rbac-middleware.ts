import type { Request, Response, NextFunction } from "express";
import { AuthorizationError, logger } from "@repo/shared-utils";
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

    if (!req.context.membership.role) {
      throw new AuthorizationError("Kullanıcı rolü bulunamadı.");
    }

    try {
      const hasRequiredPermission = hasAllPermissions(req.context.membership.role, permissions);

      if (!hasRequiredPermission) {
        throw new AuthorizationError("Bu işlemi yapmak için yetkiniz yok.");
      }

      next();
    } catch (error: any) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      logger.error("Error checking permissions:", { error });
      throw new AuthorizationError("Yetki kontrolü sırasında hata oluştu.");
    }
  };
}

export function requireAnyPermission(...permissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.context?.membership) {
      throw new AuthorizationError("Bu işlem için kiracı üyeliği gerekli.");
    }

    if (!req.context.membership.role) {
      throw new AuthorizationError("Kullanıcı rolü bulunamadı.");
    }

    try {
      const hasRequiredPermission = hasAnyPermission(req.context.membership.role, permissions);

      if (!hasRequiredPermission) {
        throw new AuthorizationError("Bu işlemi yapmak için yetkiniz yok.");
      }

      next();
    } catch (error: any) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      logger.error("Error checking permissions:", { error });
      throw new AuthorizationError("Yetki kontrolü sırasında hata oluştu.");
    }
  };
}

