import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { turkishAccountingAIService } from "../services/turkish-accounting-ai-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: Router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// ==================== Validation Schemas ====================

const hesapOneriSchema = z.object({
  islemAciklamasi: z
    .string()
    .min(3, "İşlem açıklaması en az 3 karakter olmalı.")
    .max(1000, "İşlem açıklaması en fazla 1000 karakter olabilir."),
  tutar: z.number().positive("Tutar pozitif olmalı.").optional(),
  tur: z.enum(["alis", "satis", "gider", "gelir", "diger"]).optional(),
  includeAIAnalysis: z.boolean().default(true).optional(),
  maxSonuc: z.number().int().min(1).max(20).default(5).optional(),
});

const islemAnaliziSchema = z.object({
  aciklama: z
    .string()
    .min(3, "Açıklama en az 3 karakter olmalı.")
    .max(2000, "Açıklama en fazla 2000 karakter olabilir."),
  tutar: z.number().positive("Tutar pozitif olmalı."),
  tarih: z.string().datetime().optional(),
  karsiTaraf: z.string().max(500).optional(),
  belgeTipi: z.string().max(100).optional(),
});

const babsKontrolSchema = z.object({
  karsiTarafVkn: z
    .string()
    .min(10, "VKN/TCKN en az 10 karakter olmalı.")
    .max(11, "VKN/TCKN en fazla 11 karakter olabilir.")
    .regex(/^\d+$/, "VKN/TCKN sadece rakamlardan oluşmalı.")
    .optional(),
  karsiTarafUnvan: z.string().min(1).max(500, "Ünvan en fazla 500 karakter olabilir.").optional(),
  tutar: z.number().positive("Tutar pozitif olmalı."),
  islemTuru: z.enum(["alis", "satis"]),
  faturaTarihi: z.string().datetime().optional(),
});

const muhasebeFisiSchema = z.object({
  aciklama: z
    .string()
    .min(3, "İşlem açıklaması en az 3 karakter olmalı.")
    .max(2000, "İşlem açıklaması en fazla 2000 karakter olabilir."),
  tutar: z.number().positive("Tutar pozitif olmalı."),
  tarih: z.string().datetime().optional(),
  kdvDahil: z.boolean().default(true).optional(),
  kdvOrani: z.number().min(0).max(100).optional(),
  fisNo: z.string().max(100).optional(),
});

const soruCevapSchema = z.object({
  question: z
    .string()
    .min(5, "Soru en az 5 karakter olmalı.")
    .max(2000, "Soru en fazla 2000 karakter olabilir."),
  context: z
    .object({
      documentId: z.string().optional(),
      invoiceId: z.string().optional(),
      transactionId: z.string().optional(),
      clientCompanyId: z.string().optional(),
    })
    .optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(5000),
      })
    )
    .max(20)
    .optional(),
});

const terimAramaSchema = z.object({
  terim: z.string().min(2, "Arama terimi en az 2 karakter olmalı.").max(100),
});

// ==================== Routes ====================

/**
 * POST /api/v1/turkish-accounting-ai/hesap-onerileri
 * Get intelligent account code suggestions for a transaction
 */
router.post(
  "/hesap-onerileri",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = hesapOneriSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;

      const oneriler = await turkishAccountingAIService.getHesapKoduOnerileri(
        tenantId,
        body.islemAciklamasi,
        {
          tutar: body.tutar,
          tur: body.tur,
          includeAIAnalysis: body.includeAIAnalysis,
        }
      );

      res.json({
        data: {
          oneriler,
          toplamOneri: oneriler.length,
          islemAciklamasi: body.islemAciklamasi,
        },
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return next(new Error(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/turkish-accounting-ai/islem-analizi
 * Analyze a transaction for accounting purposes
 */
router.post(
  "/islem-analizi",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = islemAnaliziSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;

      const analiz = await turkishAccountingAIService.analyzeTransaction(tenantId, {
        aciklama: body.aciklama,
        tutar: body.tutar,
        tarih: body.tarih ? new Date(body.tarih) : new Date(),
        karsiTaraf: body.karsiTaraf,
        belgeTipi: body.belgeTipi,
      });

      res.json({
        data: analiz,
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return next(new Error(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/turkish-accounting-ai/babs-kontrol
 * Check if a transaction requires Ba-Bs reporting
 */
router.post(
  "/babs-kontrol",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = babsKontrolSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;

      const kontrol = await turkishAccountingAIService.checkBaBsRequirement(tenantId, {
        tutar: body.tutar,
        karsiTarafVkn: body.karsiTarafVkn,
        karsiTarafUnvan: body.karsiTarafUnvan,
        islemTuru: body.islemTuru,
        faturaTarihi: body.faturaTarihi ? new Date(body.faturaTarihi) : new Date(),
      });

      res.json({
        data: kontrol,
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return next(new Error(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/turkish-accounting-ai/muhasebe-fisi
 * Generate accounting voucher (muhasebe fişi) from transaction details
 */
router.post(
  "/muhasebe-fisi",
  requirePermission("documents:create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = muhasebeFisiSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;

      const fis = await turkishAccountingAIService.generateMuhasebeFisi(tenantId, {
        aciklama: body.aciklama,
        tutar: body.tutar,
        tarih: body.tarih ? new Date(body.tarih) : new Date(),
        kdvDahil: body.kdvDahil,
        kdvOrani: body.kdvOrani,
        fisNo: body.fisNo,
      });

      res.json({
        data: fis,
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return next(new Error(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/turkish-accounting-ai/soru-cevap
 * AI-powered Turkish accounting Q&A
 */
router.post(
  "/soru-cevap",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = soruCevapSchema.parse(req.body);
      const tenantId = req.context!.tenantId!;

      const cevap = await turkishAccountingAIService.answerAccountingQuestion(tenantId, {
        question: body.question,
        context: body.context,
        conversationHistory: body.conversationHistory as Array<{
          role: "user" | "assistant";
          content: string;
        }> | undefined,
      });

      res.json({
        data: cevap,
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return next(new Error(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/turkish-accounting-ai/terimler
 * Get all Turkish accounting terminology
 */
router.get(
  "/terimler",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const terimler = turkishAccountingAIService.getAllTerms();

      res.json({
        data: {
          terimler,
          toplam: terimler.length,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/turkish-accounting-ai/terimler/:terim
 * Get explanation for a specific Turkish accounting term
 */
router.get(
  "/terimler/:terim",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { terim } = terimAramaSchema.parse({ terim: req.params.terim });

      const aciklama = turkishAccountingAIService.getTermExplanation(terim);

      if (!aciklama) {
        return res.status(404).json({
          error: {
            message: `"${terim}" terimi bulunamadı.`,
            code: "TERM_NOT_FOUND",
          },
        });
      }

      res.json({
        data: aciklama,
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return next(new Error(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/turkish-accounting-ai/terimler/ara
 * Search accounting terms
 */
router.post(
  "/terimler/ara",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { terim } = terimAramaSchema.parse(req.body);

      const tumTerimler = turkishAccountingAIService.getAllTerms();
      const aramaMetni = terim.toLowerCase();

      const sonuclar = tumTerimler.filter(
        (t) =>
          t.turkce.toLowerCase().includes(aramaMetni) ||
          t.ingilizce.toLowerCase().includes(aramaMetni) ||
          t.aciklama.toLowerCase().includes(aramaMetni)
      );

      res.json({
        data: {
          sonuclar,
          toplam: sonuclar.length,
          aramaMetni: terim,
        },
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return next(new Error(error.issues[0]?.message || "Geçersiz bilgiler."));
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/turkish-accounting-ai/hesap-plani
 * Get complete Turkish Uniform Chart of Accounts (Tek Düzen Hesap Planı)
 */
router.get(
  "/hesap-plani",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { TEK_DUZEN_HESAP_PLANI } = await import(
        "../services/turkish-accounting-knowledge"
      );

      // Group accounts by category
      const gruplar: Record<string, typeof TEK_DUZEN_HESAP_PLANI> = {};

      for (const hesap of TEK_DUZEN_HESAP_PLANI) {
        if (!gruplar[hesap.grup]) {
          gruplar[hesap.grup] = [];
        }
        gruplar[hesap.grup].push(hesap);
      }

      res.json({
        data: {
          hesapPlani: TEK_DUZEN_HESAP_PLANI,
          gruplar,
          toplamHesap: TEK_DUZEN_HESAP_PLANI.length,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/turkish-accounting-ai/hesap-plani/:kod
 * Get details for a specific account code
 */
router.get(
  "/hesap-plani/:kod",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const kod = req.params.kod;

      const { TEK_DUZEN_HESAP_PLANI, iliskiliHesaplariGetir } = await import(
        "../services/turkish-accounting-knowledge"
      );

      const hesap = TEK_DUZEN_HESAP_PLANI.find((h) => h.kod === kod);

      if (!hesap) {
        return res.status(404).json({
          error: {
            message: `"${kod}" hesap kodu bulunamadı.`,
            code: "ACCOUNT_NOT_FOUND",
          },
        });
      }

      const iliskiliHesaplar = iliskiliHesaplariGetir(kod);

      res.json({
        data: {
          hesap,
          iliskiliHesaplar,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/turkish-accounting-ai/vergi-oranlari
 * Get current Turkish tax rates
 */
router.get(
  "/vergi-oranlari",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        KDV_ORANLARI,
        STOPAJ_ORANLARI,
        KURUMLAR_VERGISI_ORANI,
        SGK_ORANLARI,
      } = await import("../services/turkish-accounting-knowledge");

      res.json({
        data: {
          kdv: KDV_ORANLARI,
          stopaj: STOPAJ_ORANLARI,
          kurumlarVergisi: KURUMLAR_VERGISI_ORANI,
          sgk: SGK_ORANLARI,
          guncellenmeTarihi: new Date().toISOString(),
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/turkish-accounting-ai/muhasebe-senaryolari
 * Get common accounting scenarios with example journal entries
 */
router.get(
  "/muhasebe-senaryolari",
  requirePermission("documents:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { MUHASEBE_SENARYOLARI } = await import(
        "../services/turkish-accounting-knowledge"
      );

      res.json({
        data: {
          senaryolar: MUHASEBE_SENARYOLARI,
          toplam: MUHASEBE_SENARYOLARI.length,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

export default router;
