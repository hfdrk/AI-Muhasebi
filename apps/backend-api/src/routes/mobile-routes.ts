import { Router, type Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/v1/mobile/dashboard
router.get(
  "/dashboard",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.context!.tenantId!;

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch statistics in parallel
      const [
        totalClientCompanies,
        openRiskAlerts,
        pendingDocuments,
        todayInvoices,
        recentNotifications,
      ] = await Promise.all([
        // Total client companies
        prisma.clientCompany.count({
          where: {
            tenantId,
            isActive: true,
          },
        }),

        // Open risk alerts
        prisma.riskAlert.count({
          where: {
            tenantId,
            status: "open",
          },
        }),

        // Pending documents (UPLOADED or PROCESSING)
        prisma.document.count({
          where: {
            tenantId,
            status: {
              in: ["UPLOADED", "PROCESSING"],
            },
          },
        }),

        // Today's invoices
        prisma.invoice.count({
          where: {
            tenantId,
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),

        // Recent notifications (last 5)
        prisma.notification.findMany({
          where: {
            tenantId,
            userId: req.context!.user.id,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        }),
      ]);

      res.json({
        data: {
          totalClientCompanies,
          openRiskAlerts,
          pendingDocuments,
          todayInvoices,
          recentNotifications: recentNotifications.map((n) => ({
            id: n.id,
            title: n.title,
            createdAt: n.createdAt.toISOString(),
          })),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          message: error.message || "Dashboard verileri alınırken bir hata oluştu.",
        },
      });
    }
  }
);

export default router;




