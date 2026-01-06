import { Router, type Router as ExpressRouter } from "express";
import type { NextFunction, Response } from "express";
import { z } from "zod";
import { eFaturaService } from "../services/e-fatura-service";
import { gibComplianceService } from "../services/gib-compliance-service";
import { qrCodeService } from "../services/qr-code-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ==================== Validation Schemas ====================

const submitInvoiceSchema = z.object({
  invoiceId: z.string().min(1, "Fatura ID gerekli."),
  config: z.record(z.unknown()).optional(),
});

const cancelInvoiceSchema = z.object({
  reason: z.string().min(10, "İptal sebebi en az 10 karakter olmalı.").max(500),
});

const vknCheckSchema = z.object({
  vkn: z
    .string()
    .min(10, "VKN en az 10 karakter olmalı.")
    .max(11, "VKN/TCKN en fazla 11 karakter olabilir.")
    .regex(/^\d+$/, "VKN sadece rakamlardan oluşmalı."),
});

const statsSchema = z.object({
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

const qrCodeSchema = z.object({
  format: z.enum(["svg", "png", "base64", "dataurl"]).optional(),
  size: z.number().min(64).max(1024).optional(),
});

const trKarekodSchema = z.object({
  iban: z.string().min(26).max(34),
  receiverName: z.string().min(1).max(70),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  reference: z.string().max(35).optional(),
});

// Submit invoice to E-Fatura system
router.post(
  "/submit",
  requirePermission("invoices:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = submitInvoiceSchema.parse(req.body);
      const result = await eFaturaService.submitInvoice(
        req.context!.tenantId!,
        body.invoiceId,
        body.config || {}
      );
      res.json({ data: result });
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

// Check invoice status in E-Fatura system
router.get(
  "/status/:invoiceId",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = await eFaturaService.checkInvoiceStatus(
        req.context!.tenantId!,
        req.params.invoiceId
      );
      res.json({ data: status });
    } catch (error) {
      next(error);
    }
  }
);

// Retry failed submissions
router.post(
  "/retry-failed",
  requirePermission("invoices:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const retryCount = await eFaturaService.retryFailedSubmissions(req.context!.tenantId!);
      res.json({
        data: {
          retryCount,
          message: `${retryCount} fatura tekrar gönderildi.`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Enhanced GİB Compliance Routes ====================

/**
 * POST /api/v1/e-fatura/validate/:invoiceId
 * Validate invoice before E-Fatura submission
 */
router.post(
  "/validate/:invoiceId",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await eFaturaService.validateInvoiceForEFatura(
        req.context!.tenantId!,
        req.params.invoiceId
      );

      res.json({
        data: {
          valid: result.valid,
          errors: result.errors,
          warnings: result.warnings,
          canSubmit: result.valid,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/e-fatura/cancel/:invoiceId
 * Cancel a submitted E-Fatura invoice
 */
router.post(
  "/cancel/:invoiceId",
  requirePermission("invoices:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = cancelInvoiceSchema.parse(req.body);

      const result = await eFaturaService.cancelInvoice(
        req.context!.tenantId!,
        req.params.invoiceId,
        body.reason
      );

      res.json({ data: result });
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

/**
 * GET /api/v1/e-fatura/invoice/:invoiceId/gib-status
 * Get invoice with enhanced GİB status information
 */
router.get(
  "/invoice/:invoiceId/gib-status",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await eFaturaService.getInvoiceWithGibStatus(
        req.context!.tenantId!,
        req.params.invoiceId
      );

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/e-fatura/check-registration
 * Check if a VKN is registered as E-Fatura mükellef
 */
router.post(
  "/check-registration",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = vknCheckSchema.parse(req.body);

      const result = await eFaturaService.checkEFaturaRegistration(body.vkn);

      res.json({
        data: {
          vkn: body.vkn,
          ...result,
          invoiceType: result.registered ? "E-Fatura" : "E-Arşiv",
        },
      });
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

/**
 * POST /api/v1/e-fatura/validate-vkn
 * Validate a VKN/TCKN format
 */
router.post(
  "/validate-vkn",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = vknCheckSchema.parse(req.body);

      const result = gibComplianceService.validateTaxId(body.vkn);

      res.json({
        data: {
          vkn: body.vkn,
          valid: result.valid,
          type: result.type,
          error: result.error,
        },
      });
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

/**
 * GET /api/v1/e-fatura/stats
 * Get E-Fatura submission statistics
 */
router.get(
  "/stats",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = statsSchema.parse(req.query);

      const dateRange = query.fromDate && query.toDate
        ? { from: new Date(query.fromDate), to: new Date(query.toDate) }
        : undefined;

      const stats = await eFaturaService.getSubmissionStats(
        req.context!.tenantId!,
        dateRange
      );

      res.json({ data: stats });
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

/**
 * GET /api/v1/e-fatura/scenarios
 * Get available E-Fatura scenarios
 */
router.get(
  "/scenarios",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    const scenarios = eFaturaService.getScenarios();
    const scenarioList = Object.entries(scenarios).map(([key, value]) => ({
      code: key,
      name: value,
      description: getScenarioDescription(key),
    }));

    res.json({ data: scenarioList });
  }
);

/**
 * GET /api/v1/e-fatura/invoice-types
 * Get available invoice types
 */
router.get(
  "/invoice-types",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    const types = eFaturaService.getInvoiceTypes();
    const typeList = Object.entries(types).map(([key, value]) => ({
      code: key,
      name: value,
      description: getInvoiceTypeDescription(key),
    }));

    res.json({ data: typeList });
  }
);

/**
 * POST /api/v1/e-fatura/generate-ettn
 * Generate a new ETTN for invoice
 */
router.post(
  "/generate-ettn",
  requirePermission("invoices:manage"),
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    const ettn = eFaturaService.generateETTN();

    res.json({
      data: {
        ettn,
        generatedAt: new Date().toISOString(),
      },
    });
  }
);

// ==================== QR Code Routes ====================

/**
 * GET /api/v1/e-fatura/qr/:invoiceId
 * Generate QR code for an E-Fatura invoice
 */
router.get(
  "/qr/:invoiceId",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = qrCodeSchema.parse(req.query);

      // Get invoice details
      const invoiceData = await eFaturaService.getInvoiceWithGibStatus(
        req.context!.tenantId!,
        req.params.invoiceId
      );

      if (!invoiceData.invoice) {
        res.status(404).json({
          error: { message: "Fatura bulunamadı." },
        });
        return;
      }

      const invoice = invoiceData.invoice;

      // Generate QR code based on invoice type
      let qrResult;

      if (invoice.gibStatus === "SUBMITTED" || invoice.gibStatus === "APPROVED") {
        // For submitted invoices, generate E-Fatura QR
        qrResult = await qrCodeService.generateEFaturaQR(
          {
            ettn: invoice.ettn || eFaturaService.generateETTN(),
            senderVkn: invoice.senderVkn || "",
            receiverVkn: invoice.receiverVkn || "",
            totalAmount: Number(invoice.total) || 0,
            invoiceDate: new Date(invoice.date),
            invoiceType: invoice.type,
          },
          {
            format: query.format,
            size: query.size,
          }
        );
      } else {
        // For draft invoices, generate simple QR with invoice info
        const invoiceUrl = `${process.env.FRONTEND_URL || "https://app.example.com"}/faturalar/${invoice.id}`;
        qrResult = await qrCodeService.generateSimpleQR(invoiceUrl, {
          format: query.format,
          size: query.size,
        });
      }

      res.json({
        data: {
          invoiceId: invoice.id,
          ettn: invoice.ettn,
          qrCode: qrResult.image,
          format: qrResult.format,
          content: qrResult.content,
          generatedAt: qrResult.generatedAt,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            message: error.issues[0]?.message || "Geçersiz parametreler.",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/e-fatura/qr/payment
 * Generate TR Karekod (payment QR) for invoice payment
 */
router.post(
  "/qr/payment",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = trKarekodSchema.parse(req.body);

      const qrResult = await qrCodeService.generateTRKarekodQR({
        iban: body.iban,
        receiverName: body.receiverName,
        amount: body.amount,
        currency: body.currency,
        reference: body.reference,
      });

      res.json({
        data: {
          qrCode: qrResult.image,
          format: qrResult.format,
          content: qrResult.content,
          generatedAt: qrResult.generatedAt,
        },
      });
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

/**
 * GET /api/v1/e-fatura/qr/e-arsiv/:invoiceId
 * Generate E-Arsiv QR code for invoice
 */
router.get(
  "/qr/e-arsiv/:invoiceId",
  requirePermission("invoices:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = qrCodeSchema.parse(req.query);

      // Get invoice details
      const invoiceData = await eFaturaService.getInvoiceWithGibStatus(
        req.context!.tenantId!,
        req.params.invoiceId
      );

      if (!invoiceData.invoice) {
        res.status(404).json({
          error: { message: "Fatura bulunamadı." },
        });
        return;
      }

      const invoice = invoiceData.invoice;

      // Generate E-Arsiv QR
      const qrResult = await qrCodeService.generateEArsivQR(
        {
          ettn: invoice.ettn || eFaturaService.generateETTN(),
          archiveId: invoice.archiveId || `ZRF${Date.now()}`,
          vkn: invoice.senderVkn || "",
          invoiceDate: new Date(invoice.date),
          totalAmount: Number(invoice.total) || 0,
        },
        {
          format: query.format,
          size: query.size,
        }
      );

      res.json({
        data: {
          invoiceId: invoice.id,
          ettn: invoice.ettn,
          archiveId: invoice.archiveId,
          qrCode: qrResult.image,
          format: qrResult.format,
          content: qrResult.content,
          generatedAt: qrResult.generatedAt,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            message: error.issues[0]?.message || "Geçersiz parametreler.",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  }
);

// ==================== Helper Functions ====================

function getScenarioDescription(scenario: string): string {
  const descriptions: Record<string, string> = {
    TICARIFATURA: "Ticari fatura - Standart satış faturası",
    TEMELFATURA: "Temel fatura - Basitleştirilmiş fatura",
    YOLCUBERABERI: "Yolcu beraberi - Turist satışları için",
    IHRACAT: "İhracat faturası - Yurt dışı satışlar için",
    KAMU: "Kamu faturası - Devlet kurumlarına",
    OZELFATURA: "Özel fatura - Özel durumlar için",
    HKS: "Hal Kayıt Sistemi - Tarım ürünleri için",
    SGK: "SGK faturası - Sosyal güvenlik kurumu için",
  };
  return descriptions[scenario] || scenario;
}

function getInvoiceTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    SATIS: "Satış faturası",
    IADE: "İade faturası",
    TEVKIFAT: "Tevkifatlı fatura - KDV tevkifatı uygulanan",
    ISTISNA: "İstisna faturası - KDV istisnası uygulanan",
    OZELMATRAH: "Özel matrah faturası",
    IHRACKAYITLI: "İhraç kayıtlı fatura",
  };
  return descriptions[type] || type;
}

export default router;


