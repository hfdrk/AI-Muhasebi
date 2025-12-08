import { prisma } from "../lib/prisma";
import type {
  TenantSubscription,
  CreateTenantSubscriptionInput,
  UpdateTenantSubscriptionInput,
  SubscriptionPlan,
  PlanConfig,
} from "@repo/core-domain";
import { getPlanConfig } from "@repo/core-domain";

export class SubscriptionService {
  private mapToTenantSubscription(subscription: any): TenantSubscription {
    return {
      id: subscription.id,
      tenantId: subscription.tenantId,
      plan: subscription.plan as SubscriptionPlan,
      status: subscription.status as any,
      validUntil: subscription.validUntil,
      trialUntil: subscription.trialUntil,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  /**
   * Get tenant subscription, creating a default FREE subscription if none exists
   */
  async getTenantSubscription(tenantId: string): Promise<TenantSubscription & { planConfig: PlanConfig }> {
    // Use upsert to atomically get or create subscription, avoiding race conditions
    const subscription = await prisma.tenantSubscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan: "FREE",
        status: "ACTIVE",
        validUntil: null,
        trialUntil: null,
      },
      update: {}, // If exists, don't update anything, just return it
    });

    const mapped = this.mapToTenantSubscription(subscription);
    const planConfig = getPlanConfig(mapped.plan);

    return {
      ...mapped,
      planConfig,
    };
  }

  /**
   * Update tenant subscription (admin/internal use)
   */
  async updateTenantSubscription(
    tenantId: string,
    input: UpdateTenantSubscriptionInput
  ): Promise<TenantSubscription & { planConfig: PlanConfig }> {
    // Ensure subscription exists
    await this.getTenantSubscription(tenantId);

    const updated = await prisma.tenantSubscription.update({
      where: { tenantId },
      data: {
        ...(input.plan && { plan: input.plan }),
        ...(input.status && { status: input.status }),
        ...(input.validUntil !== undefined && { validUntil: input.validUntil }),
        ...(input.trialUntil !== undefined && { trialUntil: input.trialUntil }),
      },
    });

    const mapped = this.mapToTenantSubscription(updated);
    const planConfig = getPlanConfig(mapped.plan);

    return {
      ...mapped,
      planConfig,
    };
  }
}

export const subscriptionService = new SubscriptionService();

