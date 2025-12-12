import type { Request, Response, NextFunction } from "express";
import { AuthorizationError } from "@repo/shared-utils";
import type { AuthenticatedRequest } from "../types/request-context";
import { PLATFORM_ROLES } from "@repo/core-domain";

export function requirePlatformAdmin() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.context?.user) {
      throw new AuthorizationError("Yetkilendirme gerekli.");
    }

    const platformRoles = req.context.platformRoles || [];
    
    if (!platformRoles.includes(PLATFORM_ROLES.PLATFORM_ADMIN)) {
      throw new AuthorizationError("Bu işlem için platform yöneticisi yetkisi gerekli.");
    }

    next();
  };
}




