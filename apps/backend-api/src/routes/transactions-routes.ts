import { z } from "zod";
import type { NextFunction } from "express";
import { ValidationError } from "@repo/shared-utils";
import { transactionService } from "../services/transaction-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission, requireRole } from "../middleware/rbac-middleware";
import { TENANT_ROLES } from "@repo/core-domain";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response } from "express";
import { enforceCustomerIsolation } from "../utils/customer-isolation";

import { Router, type Router as ExpressRouter } from "express";
const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const createTransactionLineSchema = z.object({
  ledgerAccountId: z.string().min(1, "Hesap kodu gerekli."),
  debitAmount: z.number().nonnegative(),
  creditAmount: z.number().nonnegative(),
  description: z.string().optional().nullable(),
});

const createTransactionSchema = z.object({
  clientCompanyId: z.string().optional().nullable(),
  date: z.string().datetime(),
  referenceNo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  source: z.enum(["manual", "import", "integration"]).optional(),
  lines: z.array(createTransactionLineSchema).min(1, "En az bir hareket satırı gerekli."),
});

const updateTransactionSchema = createTransactionSchema.partial().extend({
  lines: z.array(createTransactionLineSchema).optional(),
});

router.get(
  "/",
  requirePermission("invoices:read"), // Using invoices:read for now, can add transactions:read later
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Enforce customer isolation for ReadOnly users
      const isolationFilter = await enforceCustomerIsolation(req.context!, {
        clientCompanyId: req.query.clientCompanyId as string | undefined,
      });

      const filters = {
        clientCompanyId: isolationFilter.clientCompanyId || undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        referenceNo: req.query.referenceNo as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      };

      const result = await transactionService.listTransactions(
        req.context!.tenantId!,
        filters
      );

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const transaction = await transactionService.getTransactionById(
        req.context!.tenantId!,
        req.params.id
      );

      res.json({ data: transaction });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  requirePermission("invoices:create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = createTransactionSchema.parse(req.body);
      const transaction = await transactionService.createTransaction(
        req.context!.tenantId!,
        {
          ...body,
          date: new Date(body.date),
        }
      );

      res.status(201).json({ data: transaction });
    } catch (error) {
      if (error instanceof z.ZodError && error.issues && error.issues.length > 0) {
        return next(new ValidationError(error.issues[0].message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

router.patch(
  "/:id",
  requirePermission("invoices:update"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = updateTransactionSchema.parse(req.body);
      const transaction = await transactionService.updateTransaction(
        req.context!.tenantId!,
        req.params.id,
        {
          ...body,
          date: body.date ? new Date(body.date) : undefined,
        }
      );

      res.json({ data: transaction });
    } catch (error) {
      if (error instanceof z.ZodError && error.issues && error.issues.length > 0) {
        return next(new ValidationError(error.issues[0].message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

router.delete(
  "/:id",
  requireRole(TENANT_ROLES.TENANT_OWNER), // Only Accountant role can update
  async (req: AuthenticatedRequest, res: Response) => {
    await transactionService.deleteTransaction(
      req.context!.tenantId!,
      req.params.id
    );

    res.json({ data: { message: "Mali hareket silindi." } });
  }
);

router.get(
  "/trial-balance",
  requirePermission("reports:view"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = z.object({
        clientCompanyId: z.string().optional().nullable(),
        dateFrom: z.string().datetime(),
        dateTo: z.string().datetime(),
      }).parse(req.query);

      const result = await transactionService.getTrialBalance(
        req.context!.tenantId!,
        query.clientCompanyId || null,
        new Date(query.dateFrom),
        new Date(query.dateTo)
      );

      res.json({ data: result });
    } catch (error) {
      if (error instanceof z.ZodError && error.issues && error.issues.length > 0) {
        return next(new ValidationError(error.issues[0].message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

export default router;

