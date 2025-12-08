import express, { type Request, Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission, requireRole } from "../middleware/rbac-middleware";
import { subscriptionService } from "../services/subscription-service";
import { usageService } from "../services/usage-service";
import { ValidationError } from "@repo/shared-utils";
import type { AuthenticatedRequest } from "../types/request-context";
import { SubscriptionPlan, SubscriptionStatus } from "@repo/core-domain";

import { Router, type Router as ExpressRouter } from "express";
const router: ExpressRouter = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const updateSubscriptionSchema = z.object({
  plan: z.enum(["FREE", "PRO", "ENTERPRISE"]).optional(),
  status: z.enum(["ACTIVE", "PAST_DUE", "CANCELLED"]).optional(),
  valid_until: z.string().datetime().nullable().optional(),
  trial_until: z.string().datetime().nullable().optional(),
});

// GET /api/v1/billing/subscription
router.get(
  "/subscription",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.context!.tenantId!;
      const membership = req.context!.membership!;
      const role = membership.role;

      const subscription = await subscriptionService.getTenantSubscription(tenantId);

      // TenantOwner and Accountant see full data
      if (role === "TenantOwner" || role === "Accountant") {
        return res.json({
          data: {
            plan: subscription.plan,
            status: subscription.status,
            valid_until: subscription.validUntil?.toISOString() || null,
            trial_until: subscription.trialUntil?.toISOString() || null,
            limits: {
              maxClientCompanies: subscription.planConfig.maxClientCompanies,
              maxDocumentsPerMonth: subscription.planConfig.maxDocumentsPerMonth,
              maxAiAnalysesPerMonth: subscription.planConfig.maxAiAnalysesPerMonth,
              maxUsers: subscription.planConfig.maxUsers,
              maxScheduledReports: subscription.planConfig.maxScheduledReports,
            },
          },
        });
      }

      // Staff and ReadOnly see limited data (plan name and status only)
      return res.json({
        data: {
          plan: subscription.plan,
          status: subscription.status,
        },
      });
    } catch (error: any) {
      console.error("Error getting subscription:", error);
      return res.status(500).json({
        error: {
          message: "Abonelik bilgisi alınırken bir hata oluştu.",
        },
      });
    }
  }
);

// PUT /api/v1/billing/subscription
router.put(
  "/subscription",
  requireRole("TenantOwner"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.context!.tenantId!;
      const body = updateSubscriptionSchema.parse(req.body);

      const updateData: any = {};
      if (body.plan) {
        updateData.plan = body.plan as SubscriptionPlan;
      }
      if (body.status) {
        updateData.status = body.status as SubscriptionStatus;
      }
      if (body.valid_until !== undefined) {
        updateData.validUntil = body.valid_until ? new Date(body.valid_until) : null;
      }
      if (body.trial_until !== undefined) {
        updateData.trialUntil = body.trial_until ? new Date(body.trial_until) : null;
      }

      const subscription = await subscriptionService.updateTenantSubscription(tenantId, updateData);

      return res.json({
        data: {
          plan: subscription.plan,
          status: subscription.status,
          valid_until: subscription.validUntil?.toISOString() || null,
          trial_until: subscription.trialUntil?.toISOString() || null,
          limits: {
            maxClientCompanies: subscription.planConfig.maxClientCompanies,
            maxDocumentsPerMonth: subscription.planConfig.maxDocumentsPerMonth,
            maxAiAnalysesPerMonth: subscription.planConfig.maxAiAnalysesPerMonth,
            maxUsers: subscription.planConfig.maxUsers,
            maxScheduledReports: subscription.planConfig.maxScheduledReports,
          },
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            message: error.issues[0]?.message || "Geçersiz bilgiler.",
          },
        });
      }
      console.error("Error updating subscription:", error);
      return res.status(500).json({
        error: {
          message: "Abonelik güncellenirken bir hata oluştu.",
        },
      });
    }
  }
);

// GET /api/v1/billing/usage
router.get(
  "/usage",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.context!.tenantId!;
      const usage = await usageService.getUsageForTenant(tenantId);

      return res.json({
        data: {
          clientCompanies: usage.clientCompanies,
          documents: usage.documents,
          aiAnalyses: usage.aiAnalyses,
          users: usage.users,
          scheduledReports: usage.scheduledReports,
        },
      });
    } catch (error: any) {
      console.error("Error getting usage:", error);
      return res.status(500).json({
        error: {
          message: "Kullanım bilgisi alınırken bir hata oluştu.",
        },
      });
    }
  }
);

export default router;

