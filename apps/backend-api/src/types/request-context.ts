import type { Request } from "express";
import type { User, UserTenantMembership } from "@repo/core-domain";

export interface RequestContext {
  user: User;
  tenantId?: string;
  membership?: UserTenantMembership;
}

export interface AuthenticatedRequest extends Request {
  context?: RequestContext;
}

