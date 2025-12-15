import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import type { NextFunction, Response } from "express";
import { ValidationError, AuthorizationError } from "@repo/shared-utils";
import { clientCompanyService } from "../services/client-company-service";
import { bankAccountService } from "../services/bank-account-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import { getCustomerCompanyId } from "../utils/customer-isolation";

const router: ExpressRouter = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

const createClientCompanySchema = z.object({
  name: z.string().min(1, "Şirket adı gerekli."),
  legalType: z.enum(["Şahıs", "Limited", "Anonim", "Kollektif", "Komandit"]),
  taxNumber: z.string().min(1, "Vergi numarası gerekli."),
  tradeRegistryNumber: z.string().optional().nullable(),
  sector: z.string().optional().nullable(),
  contactPersonName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email("Geçerli bir e-posta adresi giriniz.").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateClientCompanySchema = createClientCompanySchema.partial().omit({ taxNumber: true });

const createBankAccountSchema = z.object({
  bankName: z.string().min(1, "Banka adı gerekli."),
  iban: z.string().min(1, "IBAN gerekli."),
  accountNumber: z.string().optional().nullable(),
  currency: z.string().default("TRY"),
  isPrimary: z.boolean().optional(),
});

const updateBankAccountSchema = createBankAccountSchema.partial();

// GET /api/v1/client-companies/my-company - Get current user's client company (for ReadOnly users)
router.get(
  "/my-company",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.context) {
        return res.status(401).json({
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "Yetkilendirme gerekli.",
          },
        });
      }

      const context = req.context;
      const clientCompanyId = await getCustomerCompanyId(context);

      if (!clientCompanyId) {
        return res.json({ data: null });
      }

      const company = await clientCompanyService.getClientCompanyById(
        context.tenantId!,
        clientCompanyId
      );

      res.json({ data: company });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/",
  requirePermission("clients:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.context || !req.context.tenantId) {
        return res.status(401).json({
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "Yetkilendirme gerekli.",
          },
        });
      }

      // For ReadOnly users, only return their own company
      const customerCompanyId = await getCustomerCompanyId(req.context);
      
      if (customerCompanyId) {
        // ReadOnly user - only return their own company
        const company = await clientCompanyService.getClientCompanyById(
          req.context.tenantId,
          customerCompanyId
        );
        res.json({ 
          data: {
            data: [company],
            total: 1,
            page: 1,
            pageSize: 1,
            totalPages: 1,
          }
        });
        return;
      }

      // Non-ReadOnly users - return all companies with filters
      const filters = {
        isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      };

      const result = await clientCompanyService.listClientCompanies(
        req.context.tenantId,
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
  requirePermission("clients:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.context || !req.context.tenantId) {
        return res.status(401).json({
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "Yetkilendirme gerekli.",
          },
        });
      }

      // For ReadOnly users, only allow access to their own company
      const customerCompanyId = await getCustomerCompanyId(req.context);
      
      if (customerCompanyId && req.params.id !== customerCompanyId) {
        throw new AuthorizationError("Bu müşteri şirketine erişim yetkiniz yok.");
      }

      const client = await clientCompanyService.getClientCompanyById(
        req.context.tenantId,
        req.params.id
      );

      res.json({ data: client });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  requirePermission("clients:create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = createClientCompanySchema.parse(req.body);
      const client = await clientCompanyService.createClientCompany(
        req.context!.tenantId!,
        {
          ...body,
          startDate: body.startDate ? new Date(body.startDate) : null,
        }
      );

      res.status(201).json({ data: client });
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
  requirePermission("clients:update"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = updateClientCompanySchema.parse(req.body);
      const client = await clientCompanyService.updateClientCompany(
        req.context!.tenantId!,
        req.params.id,
        {
          ...body,
          startDate: body.startDate ? new Date(body.startDate) : null,
        }
      );

      res.json({ data: client });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

router.delete(
  "/:id",
  requirePermission("clients:delete"),
  async (req: AuthenticatedRequest, res: Response) => {
    await clientCompanyService.deleteClientCompany(
      req.context!.tenantId!,
      req.params.id
    );

    res.json({ data: { message: "Müşteri şirketi silindi." } });
  }
);

// Bank account routes
router.get(
  "/:id/bank-accounts",
  requirePermission("clients:read"),
  async (req: AuthenticatedRequest, res: Response) => {
    const accounts = await bankAccountService.listBankAccounts(
      req.context!.tenantId!,
      req.params.id
    );

    res.json({ data: accounts });
  }
);

router.post(
  "/:id/bank-accounts",
  requirePermission("clients:update"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = createBankAccountSchema.parse(req.body);
      const account = await bankAccountService.createBankAccount(
        req.context!.tenantId!,
        req.params.id,
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
  "/:id/bank-accounts/:accountId",
  requirePermission("clients:update"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = updateBankAccountSchema.parse(req.body);
      const account = await bankAccountService.updateBankAccount(
        req.context!.tenantId!,
        req.params.id,
        req.params.accountId,
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

router.delete(
  "/:id/bank-accounts/:accountId",
  requirePermission("clients:update"),
  async (req: AuthenticatedRequest, res: Response) => {
    await bankAccountService.deleteBankAccount(
      req.context!.tenantId!,
      req.params.id,
      req.params.accountId
    );

    res.json({ data: { message: "Banka hesabı silindi." } });
  }
);

export default router;

