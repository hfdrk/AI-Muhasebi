import { z } from "zod";
import type { NextFunction } from "express";
import { ValidationError } from "@repo/shared-utils";
import { invoiceService } from "../services/invoice-service";
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

const createInvoiceLineSchema = z.object({
  lineNumber: z.number().int().positive(),
  description: z.string().min(1, "Açıklama gerekli."),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
  vatRate: z.number().min(0).max(1),
  vatAmount: z.number().nonnegative(),
});

const createInvoiceSchema = z.object({
  clientCompanyId: z.string().min(1, "Müşteri şirketi gerekli."),
  externalId: z.string().optional().nullable(),
  type: z.enum(["SATIŞ", "ALIŞ"]),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime().optional().nullable(),
  totalAmount: z.number().nonnegative(),
  currency: z.string().default("TRY"),
  taxAmount: z.number().nonnegative(),
  netAmount: z.number().optional().nullable(),
  counterpartyName: z.string().optional().nullable(),
  counterpartyTaxNumber: z.string().optional().nullable(),
  status: z.enum(["taslak", "kesildi", "iptal", "muhasebeleştirilmiş"]).optional(),
  source: z.enum(["manual", "import", "integration"]).optional(),
  lines: z.array(createInvoiceLineSchema).min(1, "En az bir fatura satırı gerekli."),
});

const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  lines: z.array(createInvoiceLineSchema).optional(),
});

router.get(
  "/",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Enforce customer isolation for ReadOnly users
      const isolationFilter = await enforceCustomerIsolation(req.context!, {
        clientCompanyId: req.query.clientCompanyId as string | undefined,
      });

      // Parse date filters, handling empty strings and invalid dates
      let issueDateFrom: Date | undefined;
      let issueDateTo: Date | undefined;
      
      if (req.query.issueDateFrom && typeof req.query.issueDateFrom === "string" && req.query.issueDateFrom.trim() !== "") {
        const parsedDate = new Date(req.query.issueDateFrom);
        if (!isNaN(parsedDate.getTime())) {
          issueDateFrom = parsedDate;
        }
      }
      
      if (req.query.issueDateTo && typeof req.query.issueDateTo === "string" && req.query.issueDateTo.trim() !== "") {
        const parsedDate = new Date(req.query.issueDateTo);
        if (!isNaN(parsedDate.getTime())) {
          issueDateTo = parsedDate;
        }
      }

      const filters = {
        clientCompanyId: isolationFilter.clientCompanyId || undefined,
        issueDateFrom,
        issueDateTo,
        type: req.query.type as string | undefined,
        status: req.query.status as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      };

      const result = await invoiceService.listInvoices(req.context!.tenantId!, filters);

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
      const invoice = await invoiceService.getInvoiceById(
        req.context!.tenantId!,
        req.params.id
      );

      res.json({ data: invoice });
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
      const body = createInvoiceSchema.parse(req.body);
      const invoice = await invoiceService.createInvoice(req.context!.tenantId!, {
        ...body,
        issueDate: new Date(body.issueDate),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      });

      res.status(201).json({ data: invoice });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues?.[0]?.message || "Geçersiz bilgiler."));
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
      const body = updateInvoiceSchema.parse(req.body);
      const invoice = await invoiceService.updateInvoice(
        req.context!.tenantId!,
        req.params.id,
        {
          ...body,
          issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
          dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined,
        }
      );

      res.json({ data: invoice });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues?.[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

router.patch(
  "/:id/status",
  requireRole(TENANT_ROLES.TENANT_OWNER), // Only Accountant role can update
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = z.object({
        status: z.enum(["taslak", "kesildi", "iptal", "muhasebeleştirilmiş"]),
      }).parse(req.body);

      const invoice = await invoiceService.updateInvoiceStatus(
        req.context!.tenantId!,
        req.params.id,
        body.status
      );

      res.json({ data: invoice });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues?.[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

router.delete(
  "/:id",
  requirePermission("invoices:delete"),
  async (req: AuthenticatedRequest, res: Response) => {
    await invoiceService.deleteInvoice(req.context!.tenantId!, req.params.id);

    res.json({ data: { message: "Fatura silindi." } });
  }
);

export default router;

