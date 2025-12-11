import { Router, type Router as ExpressRouter } from "express";
import type { NextFunction, Response } from "express";
import { z } from "zod";
import { documentRequirementService } from "../services/document-requirement-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const createDocumentRequirementSchema = z.object({
  clientCompanyId: z.string().min(1, "Müşteri şirketi gerekli."),
  documentType: z.string().min(1, "Belge tipi gerekli."),
  requiredByDate: z.string().datetime(),
  description: z.string().optional().nullable(),
});

const updateDocumentRequirementSchema = createDocumentRequirementSchema.partial().extend({
  status: z.enum(["pending", "received", "overdue"]).optional(),
  receivedDocumentId: z.string().optional().nullable(),
});

// List document requirements
router.get(
  "/",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = {
        clientCompanyId: req.query.clientCompanyId as string | undefined,
        documentType: req.query.documentType as string | undefined,
        status: req.query.status as "pending" | "received" | "overdue" | undefined,
        overdue: req.query.overdue === "true",
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      };

      const result = await documentRequirementService.listRequirements(
        req.context!.tenantId!,
        filters
      );

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Get requirement by ID
router.get(
  "/:id",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const requirement = await documentRequirementService.getRequirementById(
        req.context!.tenantId!,
        req.params.id
      );

      res.json({ data: requirement });
    } catch (error) {
      next(error);
    }
  }
);

// Create requirement
router.post(
  "/",
  requirePermission("documents:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = createDocumentRequirementSchema.parse(req.body);
      const requirement = await documentRequirementService.createRequirement(
        req.context!.tenantId!,
        {
          tenantId: req.context!.tenantId!,
          clientCompanyId: body.clientCompanyId,
          documentType: body.documentType,
          requiredByDate: new Date(body.requiredByDate),
          description: body.description,
        }
      );

      res.status(201).json({ data: requirement });
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

// Update requirement
router.patch(
  "/:id",
  requirePermission("documents:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = updateDocumentRequirementSchema.parse(req.body);
      const requirement = await documentRequirementService.updateRequirement(
        req.context!.tenantId!,
        req.params.id,
        {
          documentType: body.documentType,
          requiredByDate: body.requiredByDate ? new Date(body.requiredByDate) : undefined,
          status: body.status,
          receivedDocumentId: body.receivedDocumentId,
          description: body.description,
        }
      );

      res.json({ data: requirement });
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

// Delete requirement
router.delete(
  "/:id",
  requirePermission("documents:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await documentRequirementService.deleteRequirement(req.context!.tenantId!, req.params.id);

      res.json({ data: { message: "Belge gereksinimi silindi." } });
    } catch (error) {
      next(error);
    }
  }
);

// Check and update missing documents (admin endpoint)
router.post(
  "/check-missing",
  requirePermission("documents:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await documentRequirementService.checkAndUpdateMissingDocuments(
        req.context!.tenantId!
      );

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
