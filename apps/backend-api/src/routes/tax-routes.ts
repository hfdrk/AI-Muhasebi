import { Router, type Router as ExpressRouter } from "express";
import type { NextFunction, Response } from "express";
import { z } from "zod";
import { vatOptimizationService } from "../services/vat-optimization-service";
import { taxComplianceService } from "../services/tax-compliance-service";
import { taxReportingService } from "../services/tax-reporting-service";
import { tmsComplianceService } from "../services/tms-compliance-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const analyzeVATSchema = z.object({
  clientCompanyId: z.string().min(1, "Müşteri şirketi ID gerekli."),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
});

// Analyze VAT for a period
router.post(
  "/vat/analyze",
  requirePermission("reports:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = analyzeVATSchema.parse(req.body);
      const analysis = await vatOptimizationService.analyzeVAT(
        req.context!.tenantId!,
        body.clientCompanyId,
        body.startDate,
        body.endDate
      );
      
      // Transform backend response to match frontend interface
      res.json({ 
        data: {
          totalVAT: analysis.totalInputVAT + analysis.totalOutputVAT,
          inputVAT: analysis.totalInputVAT,
          outputVAT: analysis.totalOutputVAT,
          netVAT: analysis.netVAT,
          inconsistencies: analysis.suggestions
            .filter(s => s.type === "compliance" || s.type === "warning")
            .map(s => ({
              type: s.type,
              description: s.description,
              severity: s.type === "warning" ? "high" : "medium" as "low" | "medium" | "high",
            })),
        }
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

// Check VAT inconsistencies
router.get(
  "/vat/inconsistencies/:clientCompanyId",
  requirePermission("reports:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const inconsistencies = await vatOptimizationService.checkVATInconsistencies(
        req.context!.tenantId!,
        req.params.clientCompanyId
      );
      res.json({ data: inconsistencies });
    } catch (error) {
      next(error);
    }
  }
);

// Prepare VAT return
router.post(
  "/vat/prepare-return",
  requirePermission("reports:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = analyzeVATSchema.parse(req.body);
      const vatReturn = await vatOptimizationService.prepareVATReturn(
        req.context!.tenantId!,
        body.clientCompanyId,
        body.startDate,
        body.endDate
      );
      res.json({ data: vatReturn });
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

// Check tax compliance
router.get(
  "/compliance/:clientCompanyId",
  requirePermission("reports:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const compliance = await taxComplianceService.checkCompliance(
        req.context!.tenantId!,
        req.params.clientCompanyId
      );
      // Transform backend response to match frontend expectations
      res.json({
        data: {
          isCompliant: compliance.compliant,
          issues: compliance.issues.map((issue) => ({
            type: issue.type,
            description: issue.description,
            severity: issue.severity,
          })),
          deadlines: compliance.nextDeadlines.map((deadline) => ({
            type: deadline.type,
            dueDate: deadline.deadline.toISOString(),
            description: deadline.description,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Generate VAT declaration
router.post(
  "/reports/vat-declaration",
  requirePermission("reports:manage"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = analyzeVATSchema.parse(req.body);
      const declaration = await taxReportingService.generateVATDeclaration(
        req.context!.tenantId!,
        body.clientCompanyId,
        body.startDate,
        body.endDate
      );
      res.json({ data: declaration });
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

// Generate corporate tax report
router.get(
  "/reports/corporate-tax/:clientCompanyId/:year",
  requirePermission("reports:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const year = parseInt(req.params.year, 10);
      const report = await taxReportingService.generateCorporateTaxReport(
        req.context!.tenantId!,
        req.params.clientCompanyId,
        year
      );
      res.json({ data: report });
    } catch (error) {
      next(error);
    }
  }
);

// Generate withholding tax report
router.post(
  "/reports/withholding-tax",
  requirePermission("reports:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = analyzeVATSchema.parse(req.body);
      const report = await taxReportingService.generateWithholdingTaxReport(
        req.context!.tenantId!,
        body.clientCompanyId,
        body.startDate,
        body.endDate
      );
      res.json({ data: report });
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

// Generate monthly tax summary
router.get(
  "/reports/monthly-summary/:clientCompanyId/:year/:month",
  requirePermission("reports:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const year = parseInt(req.params.year, 10);
      const month = parseInt(req.params.month, 10);
      const summary = await taxReportingService.generateMonthlyTaxSummary(
        req.context!.tenantId!,
        req.params.clientCompanyId,
        year,
        month
      );
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  }
);

// TMS Compliance routes
const validateTMSComplianceSchema = z.object({
  clientCompanyId: z.string().min(1, "Müşteri şirketi ID gerekli."),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
});

// Validate TMS compliance
router.post(
  "/tms/validate",
  requirePermission("reports:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = validateTMSComplianceSchema.parse(req.body);
      const validation = await tmsComplianceService.validateTMSCompliance(
        req.context!.tenantId!,
        body.clientCompanyId,
        body.startDate,
        body.endDate
      );
      
      // Transform backend response to match frontend interface
      const violations = validation.issues.filter(i => i.severity === "high" || i.severity === "medium");
      const recommendations = validation.issues
        .filter(i => i.severity === "low")
        .map(i => ({
          type: i.type,
          description: i.recommendation || i.description,
          priority: i.severity === "low" ? "low" : i.severity === "medium" ? "medium" : "high" as "low" | "medium" | "high",
        }));
      
      res.json({ 
        data: {
          isCompliant: validation.compliant,
          violations: violations.map(v => ({
            type: v.type,
            description: v.description,
            severity: v.severity,
          })),
          recommendations,
        }
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

// Generate TMS balance sheet
router.get(
  "/tms/balance-sheet/:clientCompanyId",
  requirePermission("reports:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();
      const balanceSheet = await tmsComplianceService.generateBalanceSheet(
        req.context!.tenantId!,
        req.params.clientCompanyId,
        asOfDate
      );
      res.json({ data: balanceSheet });
    } catch (error) {
      next(error);
    }
  }
);

// Generate TMS income statement
router.post(
  "/tms/income-statement",
  requirePermission("reports:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = validateTMSComplianceSchema.parse(req.body);
      const incomeStatement = await tmsComplianceService.generateIncomeStatement(
        req.context!.tenantId!,
        body.clientCompanyId,
        body.startDate,
        body.endDate
      );
      res.json({ data: incomeStatement });
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

export default router;

