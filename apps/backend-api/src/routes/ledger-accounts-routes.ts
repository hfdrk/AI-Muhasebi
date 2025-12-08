import { z } from "zod";
import type { NextFunction } from "express";
import { ValidationError } from "@repo/shared-utils";
import { ledgerAccountService } from "../services/ledger-account-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requireRole } from "../middleware/rbac-middleware";
import { TENANT_ROLES } from "@repo/core-domain";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response } from "express";

import { Router, type Router as ExpressRouter } from "express";
const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const createLedgerAccountSchema = z.object({
  code: z.string().min(1, "Hesap kodu gerekli."),
  name: z.string().min(1, "Hesap adı gerekli."),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  isActive: z.boolean().optional(),
});

const updateLedgerAccountSchema = createLedgerAccountSchema.partial();

router.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const accounts = await ledgerAccountService.listLedgerAccounts(
      req.context!.tenantId!
    );

    res.json({ data: accounts });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const account = await ledgerAccountService.getLedgerAccountById(
      req.context!.tenantId!,
      req.params.id
    );

    res.json({ data: account });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireRole(TENANT_ROLES.TENANT_OWNER, TENANT_ROLES.ACCOUNTANT),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = createLedgerAccountSchema.parse(req.body);
      const account = await ledgerAccountService.createLedgerAccount(
        req.context!.tenantId!,
        body
      );

      res.status(201).json({ data: account });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

router.patch(
  "/:id",
  requireRole(TENANT_ROLES.TENANT_OWNER, TENANT_ROLES.ACCOUNTANT),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = updateLedgerAccountSchema.parse(req.body);
      const account = await ledgerAccountService.updateLedgerAccount(
        req.context!.tenantId!,
        req.params.id,
        body
      );

      res.json({ data: account });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

export default router;

