import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import { cacheMiddleware } from "../middleware/cache-middleware";
import { validate } from "../middleware/validation-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import type { Response, NextFunction } from "express";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ─── Schemas ─────────────────────────────────────────────────────────

const historyQuery = z.object({
  baseCurrency: z.string().length(3, "Döviz kodu 3 karakter olmalı"),
  quoteCurrency: z.string().length(3).default("TRY"),
  dateStart: z.string().min(1, "Başlangıç tarihi gerekli"),
  dateEnd: z.string().min(1, "Bitiş tarihi gerekli"),
});

const convertQuery = z.object({
  amount: z.coerce.number().positive("Tutar pozitif olmalı"),
  from: z.string().length(3, "Kaynak döviz kodu gerekli"),
  to: z.string().length(3, "Hedef döviz kodu gerekli"),
  date: z.string().optional(),
});

const addRateBody = z.object({
  baseCurrency: z.string().length(3, "Döviz kodu 3 karakter olmalı"),
  quoteCurrency: z.string().length(3).default("TRY"),
  buyRate: z.number().positive("Alış kuru pozitif olmalı"),
  sellRate: z.number().positive("Satış kuru pozitif olmalı"),
  rateDate: z.string().min(1, "Tarih gerekli"),
  source: z.string().optional(),
});

// ─── Routes ──────────────────────────────────────────────────────────

// GET / - Latest rates
router.get(
  "/",
  requirePermission("exchange_rates:view"),
  cacheMiddleware(900000),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { exchangeRateService } = await import("../services/exchange-rate-service");
      const baseCurrency = req.query.baseCurrency as string | undefined;
      const rates = await exchangeRateService.getLatestRates(baseCurrency);
      res.json(rates);
    } catch (error) { next(error); }
  }
);

// GET /currencies - Supported currencies
router.get(
  "/currencies",
  requirePermission("exchange_rates:view"),
  cacheMiddleware(900000),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { exchangeRateService } = await import("../services/exchange-rate-service");
      res.json(exchangeRateService.getSupportedCurrencies());
    } catch (error) { next(error); }
  }
);

// GET /history - Historical rates
router.get(
  "/history",
  requirePermission("exchange_rates:view"),
  validate({ query: historyQuery }),
  cacheMiddleware(900000),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { exchangeRateService } = await import("../services/exchange-rate-service");
      const { baseCurrency, quoteCurrency, dateStart, dateEnd } = req.query as any;
      const history = await exchangeRateService.getHistory(baseCurrency, quoteCurrency, { dateStart, dateEnd });
      res.json(history);
    } catch (error) { next(error); }
  }
);

// GET /convert - Convert amount
router.get(
  "/convert",
  requirePermission("exchange_rates:view"),
  validate({ query: convertQuery }),
  cacheMiddleware(900000),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { exchangeRateService } = await import("../services/exchange-rate-service");
      const { amount, from, to, date } = req.query as any;
      const result = await exchangeRateService.convert(
        parseFloat(amount), from, to, date ? new Date(date) : undefined
      );
      res.json(result);
    } catch (error) { next(error); }
  }
);

// POST / - Add manual rate
router.post(
  "/",
  requirePermission("exchange_rates:manage"),
  validate({ body: addRateBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { exchangeRateService } = await import("../services/exchange-rate-service");
      const rate = await exchangeRateService.addRate({ ...req.body, tenantId: req.context?.tenantId });
      res.status(201).json(rate);
    } catch (error) { next(error); }
  }
);

// POST /fetch-tcmb - Trigger TCMB rate fetch
router.post(
  "/fetch-tcmb",
  requirePermission("exchange_rates:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { exchangeRateService } = await import("../services/exchange-rate-service");
      const result = await exchangeRateService.fetchTCMBRates();
      res.json(result);
    } catch (error) { next(error); }
  }
);

export default router;
