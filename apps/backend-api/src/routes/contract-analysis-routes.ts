import { Router, type Router as ExpressRouter, type Response, type NextFunction } from "express";
import { z } from "zod";
import { contractAnalysisService } from "../services/contract-analysis-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/v1/contracts - Get all contracts for tenant with optional filters
router.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.context?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: { message: "Kiracı bilgisi bulunamadı." } });
    }
    const querySchema = z.object({
      clientCompanyId: z.string().optional(),
      contractType: z.string().optional(),
      status: z.enum(["all", "expiring", "expired", "active"]).optional(),
      minValue: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
      maxValue: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
    });

    const filters = querySchema.parse(req.query);
    const contracts = await contractAnalysisService.getContracts(tenantId, filters);
    res.json({ data: contracts });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: { message: "Geçersiz istek parametreleri." } });
    } else {
      next(error);
    }
  }
});

// GET /api/v1/contracts/expiring - Get contracts expiring within specified days
router.get("/expiring", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.context?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: { message: "Kiracı bilgisi bulunamadı." } });
    }
    const querySchema = z.object({
      days: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 90)),
    });

    const { days } = querySchema.parse(req.query);
    const contracts = await contractAnalysisService.getExpiringContracts(tenantId, days);
    res.json({ data: contracts });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: { message: "Geçersiz istek parametreleri." } });
    } else {
      next(error);
    }
  }
});

// GET /api/v1/contracts/expired - Get expired contracts
router.get("/expired", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.context?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: { message: "Kiracı bilgisi bulunamadı." } });
    }
    const contracts = await contractAnalysisService.getExpiredContracts(tenantId);
    res.json({ data: contracts });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/contracts/summary - Get contract analysis summary
router.get("/summary", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.context?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: { message: "Kiracı bilgisi bulunamadı." } });
    }
    const summary = await contractAnalysisService.getContractSummary(tenantId);
    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/contracts/check-expirations - Manually trigger expiration check
router.post(
  "/check-expirations",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.context?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: { message: "Kiracı bilgisi bulunamadı." } });
      }
      const result = await contractAnalysisService.checkContractExpirations(tenantId);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
