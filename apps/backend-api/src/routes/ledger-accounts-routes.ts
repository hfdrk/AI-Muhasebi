import { Router } from "express";
import { z } from "zod";
import { ledgerAccountService } from "../services/ledger-account-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requireRole } from "../middleware/rbac-middleware";
import { TENANT_ROLES } from "@repo/core-domain";
import type { AuthenticatedRequest, Response } from "../types/request-context";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const createLedgerAccountSchema = z.object({
  code: z.string().min(1, "Hesap kodu gerekli."),
  name: z.string().min(1, "Hesap adı gerekli."),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  isActive: z.boolean().optional(),
});

const updateLedgerAccountSchema = createLedgerAccountSchema.partial();

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const accounts = await ledgerAccountService.listLedgerAccounts(
    req.context!.tenantId!
  );

  res.json({ data: accounts });
});

router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const account = await ledgerAccountService.getLedgerAccountById(
    req.context!.tenantId!,
    req.params.id
  );

  res.json({ data: account });
});

router.post(
  "/",
  requireRole(TENANT_ROLES.TENANT_OWNER, TENANT_ROLES.ACCOUNTANT),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = createLedgerAccountSchema.parse(req.body);
      const account = await ledgerAccountService.createLedgerAccount(
        req.context!.tenantId!,
        body
      );

      res.status(201).json({ data: account });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0]?.message || "Geçersiz bilgiler.");
      }
      throw error;
    }
  }
);

router.patch(
  "/:id",
  requireRole(TENANT_ROLES.TENANT_OWNER, TENANT_ROLES.ACCOUNTANT),
  async (req: AuthenticatedRequest, res: Response) => {
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
        throw new Error(error.errors[0]?.message || "Geçersiz bilgiler.");
      }
      throw error;
    }
  }
);

export default router;

