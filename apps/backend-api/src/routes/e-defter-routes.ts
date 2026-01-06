import { Router, type Router as ExpressRouter } from "express";
import type { NextFunction, Response } from "express";
import { z } from "zod";
import { eDefterService } from "../services/e-defter-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const generateLedgerSchema = z.object({
  clientCompanyId: z.string().min(1, "Müşteri şirketi ID gerekli."),
  periodStart: z.string().transform((val) => new Date(val)),
  periodEnd: z.string().transform((val) => new Date(val)),
  periodType: z.enum(["monthly", "quarterly", "yearly"]),
});

const submitLedgerSchema = z.object({
  clientCompanyId: z.string().min(1, "Müşteri şirketi ID gerekli."),
  ledgerId: z.string().min(1, "E-Defter ID gerekli."),
});

// Generate E-Defter for a period
router.post(
  "/generate",
  requirePermission("invoices:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = generateLedgerSchema.parse(req.body);
      const result = await eDefterService.generateLedger(
        req.context!.tenantId!,
        body.clientCompanyId,
        {
          startDate: body.periodStart,
          endDate: body.periodEnd,
          periodType: body.periodType,
        }
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

// Submit E-Defter to GIB
router.post(
  "/submit",
  requirePermission("invoices:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = submitLedgerSchema.parse(req.body);
      const result = await eDefterService.submitLedger(
        req.context!.tenantId!,
        body.clientCompanyId,
        body.ledgerId
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

// Get ledger by ID
router.get(
  "/:clientCompanyId/:ledgerId",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await eDefterService.getLedger(
        req.context!.tenantId!,
        req.params.clientCompanyId,
        req.params.ledgerId
      );
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// List ledgers for a company
router.get(
  "/:clientCompanyId",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await eDefterService.listLedgers(
        req.context!.tenantId!,
        req.params.clientCompanyId
      );
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;


