import { Router, type Router as ExpressRouter } from "express";
import type { NextFunction, Response } from "express";
import { z } from "zod";
import { eArsivService } from "../services/e-arsiv-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const archiveInvoiceSchema = z.object({
  invoiceId: z.string().min(1, "Fatura ID gerekli."),
});

const searchArchivedSchema = z.object({
  startDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  endDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  invoiceNumber: z.string().optional(),
  customerName: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
});

// Archive invoice to E-Arşiv system
router.post(
  "/archive",
  requirePermission("invoices:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = archiveInvoiceSchema.parse(req.body);
      const result = await eArsivService.archiveInvoice(
        req.context!.tenantId!,
        body.invoiceId
      );
      res.json({ data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            message: error.issues[0]?.message || "Geçersiz bilgiler.",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  }
);

// Search archived invoices
router.get(
  "/search",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = searchArchivedSchema.parse(req.query);
      const results = await eArsivService.searchArchivedInvoices(
        req.context!.tenantId!,
        filters
      );
      res.json({ data: results });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            message: error.issues[0]?.message || "Geçersiz bilgiler.",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  }
);

// Get archived invoice details
router.get(
  "/:invoiceId",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await eArsivService.getArchivedInvoice(
        req.context!.tenantId!,
        req.params.invoiceId
      );
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Auto-archive old invoices
router.post(
  "/auto-archive",
  requirePermission("invoices:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const retentionDays = req.body.retentionDays ? parseInt(req.body.retentionDays, 10) : 90;
      const archivedCount = await eArsivService.autoArchiveOldInvoices(
        req.context!.tenantId!,
        retentionDays
      );
      res.json({
        data: {
          archivedCount,
          message: `${archivedCount} fatura otomatik olarak arşivlendi.`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;


