import { prisma } from "../lib/prisma";
import type { CreateAuditLogInput, AuditAction } from "@repo/core-domain";

export class AuditService {
  async log(input: CreateAuditLogInput): Promise<void> {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        metadata: input.metadata ?? {},
      },
    });
  }

  async logAuthAction(
    action: AuditAction,
    userId: string | null,
    tenantId: string | null,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      action,
      userId,
      tenantId,
      metadata,
    });
  }
}

export const auditService = new AuditService();

