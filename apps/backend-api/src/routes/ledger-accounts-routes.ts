import { z } from "zod";
import type { NextFunction } from "express";
import { ValidationError } from "@repo/shared-utils";
import { ledgerAccountService } from "../services/ledger-account-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requireRole } from "../middleware/rbac-middleware";
import { cacheMiddleware } from "../middleware/cache-middleware";
import { TENANT_ROLES } from "@repo/core-domain";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response } from "express";

import { Router, type Router as ExpressRouter } from "express";
const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const createLedgerAccountSchema = z.object({
  code: z.string().min(1, "Hesap kodu gerekli.").max(50, "Hesap kodu en fazla 50 karakter olabilir."),
  name: z.string().min(1, "Hesap adı gerekli.").max(255, "Hesap adı en fazla 255 karakter olabilir."),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  isActive: z.boolean().optional(),
});

const updateLedgerAccountSchema = createLedgerAccountSchema.partial();

router.get("/", cacheMiddleware(600000), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const accounts = await ledgerAccountService.listLedgerAccounts(
      req.context!.tenantId!
    );

    res.json({ data: accounts });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", cacheMiddleware(600000), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
  requireRole(TENANT_ROLES.TENANT_OWNER), // Only Accountant role can update
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = createLedgerAccountSchema.parse(req.body);
      const account = await ledgerAccountService.createLedgerAccount(
        req.context!.tenantId!,
        body as any
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
  requireRole(TENANT_ROLES.TENANT_OWNER), // Only Accountant role can update
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


