import { Router, type Router as ExpressRouter } from "express";
import type { NextFunction, Response } from "express";
import { z } from "zod";
import { eFaturaService } from "../services/e-fatura-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const submitInvoiceSchema = z.object({
  invoiceId: z.string().min(1, "Fatura ID gerekli."),
  config: z.record(z.unknown()).optional(),
});

// Submit invoice to E-Fatura system
router.post(
  "/submit",
  requirePermission("invoices:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = submitInvoiceSchema.parse(req.body);
      const result = await eFaturaService.submitInvoice(
        req.context!.tenantId!,
        body.invoiceId,
        body.config || {}
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

// Check invoice status in E-Fatura system
router.get(
  "/status/:invoiceId",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = await eFaturaService.checkInvoiceStatus(
        req.context!.tenantId!,
        req.params.invoiceId
      );
      res.json({ data: status });
    } catch (error) {
      next(error);
    }
  }
);

// Retry failed submissions
router.post(
  "/retry-failed",
  requirePermission("invoices:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const retryCount = await eFaturaService.retryFailedSubmissions(req.context!.tenantId!);
      res.json({
        data: {
          retryCount,
          message: `${retryCount} fatura tekrar gönderildi.`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

