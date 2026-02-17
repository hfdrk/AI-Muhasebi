import { prisma } from "../lib/prisma";
import { riskRuleService } from "./risk-rule-service";
import type {
  RiskRule,
  DocumentRiskScore,
  ClientCompanyRiskScore,
  CreateDocumentRiskScoreInput,
  CreateClientCompanyRiskScoreInput,
  RiskSeverity,
} from "@repo/core-domain";
import type { DocumentRiskFeatures, RiskFeatureMap } from "@repo/core-domain";

export interface DocumentEvaluationContext {
  riskFeatures: DocumentRiskFeatures;
  invoice?: any;
  transaction?: any;
}

export interface DocumentRuleContext {
  riskFeatures: DocumentRiskFeatures;
  document: any;
  // Pre-computed fraud detection results
  benfordsViolation: boolean;
  roundNumberSuspicious: boolean;
  unusualTiming: boolean;
  counterpartyAnalysis: { isNew: boolean; isUnusual: boolean } | null;
  isDuplicateInvoice: boolean;
}

export interface CompanyEvaluationContext {
  documentRiskScores: DocumentRiskScore[];
  highRiskDocumentCount: number;
  totalInvoiceCount: number;
  highRiskInvoiceCount: number;
  duplicateInvoiceNumbers: string[];
  // Fraud pattern detection results
  benfordsViolation: boolean;
  hasCircularTransactions: boolean;
  hasUnusualVatPatterns: boolean;
  hasDateManipulation: boolean;
  fraudPatternCount: number;
}

export class RiskRuleEngine {
  /**
   * Evaluate risk for a document
   */
  async evaluateDocument(
    tenantId: string,
    documentId: string,
    riskFeatures?: DocumentRiskFeatures
  ): Promise<DocumentRiskScore> {
    // Load active document-scope rules
    const allRules = await riskRuleService.loadActiveRules(tenantId);
    const documentRules = allRules.filter((r) => r.scope === "document");

    // Fetch risk features if not provided
    let features: DocumentRiskFeatures;
    if (riskFeatures) {
      features = riskFeatures;
    } else {
      const riskFeaturesData = await prisma.documentRiskFeatures.findUnique({
        where: { documentId },
      });

      if (!riskFeaturesData || riskFeaturesData.tenantId !== tenantId) {
        throw new Error("Document risk features not found");
      }

      features = {
        id: riskFeaturesData.id,
        tenantId: riskFeaturesData.tenantId,
        documentId: riskFeaturesData.documentId,
        features: riskFeaturesData.features as RiskFeatureMap,
        riskFlags: riskFeaturesData.riskFlags as any[],
        riskScore: riskFeaturesData.riskScore ? Number(riskFeaturesData.riskScore) : null,
        generatedAt: riskFeaturesData.generatedAt,
        createdAt: riskFeaturesData.createdAt,
        updatedAt: riskFeaturesData.updatedAt,
      };
    }

    // Fetch related invoice/transaction if needed
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        relatedInvoice: true,
        relatedTransaction: true,
      },
    });

    if (!document || document.tenantId !== tenantId) {
      throw new Error("Document not found");
    }

    // Pre-compute fraud detection results for this document's company
    const clientCompanyId = document.clientCompanyId;
    let benfordsViolation = false;
    let roundNumberSuspicious = false;
    let unusualTiming = false;
    let counterpartyResult: { isNew: boolean; isUnusual: boolean } | null = null;
    let isDuplicateInvoice = false;

    if (clientCompanyId) {
      try {
        const { fraudPatternDetectorService } = await import("./fraud-pattern-detector-service");

        // Get transactions for Benford's / round number / timing analysis
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const transactions = await prisma.transaction.findMany({
          where: { tenantId, clientCompanyId, date: { gte: twelveMonthsAgo } },
          include: { lines: true },
          orderBy: { date: "desc" },
        });

        const amounts = transactions.map((txn) =>
          txn.lines.reduce((sum, line) => sum + Number(line.debitAmount) + Number(line.creditAmount), 0)
        );
        const dates = transactions.map((txn) => txn.date);

        // Benford's Law analysis (needs at least 20 data points)
        if (amounts.length >= 20) {
          const benfordsResult = fraudPatternDetectorService.analyzeBenfordsLaw(amounts);
          benfordsViolation = benfordsResult.violation;
        }

        // Round number detection (suspicious if >30% are round)
        const roundNumbers = fraudPatternDetectorService.detectRoundNumbers(amounts);
        roundNumberSuspicious = amounts.length > 0 && roundNumbers.length > amounts.length * 0.3;

        // Timing pattern analysis
        if (dates.length > 0) {
          const timingResult = fraudPatternDetectorService.analyzeTimingPatterns(dates);
          unusualTiming = timingResult.unusualTiming;
        }
      } catch {
        // Fraud pattern detection failed – continue with defaults (false)
      }
    }

    // Counterparty analysis for invoice-linked documents
    if (document.relatedInvoice?.counterpartyName && (clientCompanyId || document.clientCompanyId)) {
      try {
        const { counterpartyAnalysisService } = await import("./counterparty-analysis-service");
        const invoice = document.relatedInvoice;
        const analysis = await counterpartyAnalysisService.analyzeCounterparty(
          tenantId,
          clientCompanyId || document.clientCompanyId || "",
          invoice.counterpartyName,
          invoice.counterpartyTaxNumber || null,
          Number(invoice.totalAmount),
          invoice.issueDate
        );
        counterpartyResult = {
          isNew: analysis.isNewCounterparty,
          isUnusual: analysis.isUnusualCounterparty,
        };
      } catch {
        // Counterparty analysis failed – continue with null
      }
    }

    // Duplicate invoice check
    if (document.relatedInvoice) {
      try {
        const inv = document.relatedInvoice;
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const duplicates = await prisma.invoice.findMany({
          where: {
            tenantId,
            id: { not: inv.id },
            totalAmount: inv.totalAmount,
            ...(inv.counterpartyName ? { counterpartyName: inv.counterpartyName } : {}),
            issueDate: {
              gte: new Date(new Date(inv.issueDate).getTime() - thirtyDaysMs),
              lte: new Date(new Date(inv.issueDate).getTime() + thirtyDaysMs),
            },
          },
          take: 1,
        });
        isDuplicateInvoice = duplicates.length > 0;
      } catch {
        // Duplicate check failed – continue with false
      }
    }

    // Build the enriched rule context with pre-computed fraud detection results
    const ruleContext: DocumentRuleContext = {
      riskFeatures: features,
      document,
      benfordsViolation,
      roundNumberSuspicious,
      unusualTiming,
      counterpartyAnalysis: counterpartyResult,
      isDuplicateInvoice,
    };

    // Evaluate each rule
    let score = 0;
    const triggeredRuleCodes: string[] = [];

    for (const rule of documentRules) {
      if (this.evaluateRuleCondition(rule, ruleContext)) {
        score += rule.weight;
        triggeredRuleCodes.push(rule.code);
      }
    }

    // Cap score at 100
    score = Math.min(100, Math.max(0, score));

    // Map to severity
    const severity = this.mapScoreToSeverity(score);

    // Save or update DocumentRiskScore
    const generatedAt = new Date();
    const riskScoreData: CreateDocumentRiskScoreInput = {
      tenantId,
      documentId,
      score,
      severity,
      triggeredRuleCodes,
      generatedAt,
    };

    const existing = await prisma.documentRiskScore.findUnique({
      where: { documentId },
    });

    let riskScore: DocumentRiskScore;
    if (existing) {
      const updated = await prisma.documentRiskScore.update({
        where: { id: existing.id },
        data: {
          score: riskScoreData.score,
          severity: riskScoreData.severity,
          triggeredRuleCodes: riskScoreData.triggeredRuleCodes,
          generatedAt: generatedAt,
        },
      });
      riskScore = this.mapToDocumentRiskScore(updated);
    } else {
      const created = await prisma.documentRiskScore.create({
        data: {
          tenantId: riskScoreData.tenantId,
          documentId: riskScoreData.documentId,
          score: riskScoreData.score,
          severity: riskScoreData.severity,
          triggeredRuleCodes: riskScoreData.triggeredRuleCodes,
          generatedAt: generatedAt,
        },
      });
      riskScore = this.mapToDocumentRiskScore(created);
    }

    // Store history
    const { riskTrendService } = await import("./risk-trend-service");
    await riskTrendService.storeRiskScoreHistory(
      tenantId,
      "document",
      documentId,
      Number(riskScore.score),
      riskScore.severity as "low" | "medium" | "high"
    );

    return riskScore;
  }

  /**
   * Evaluate risk for a client company
   */
  async evaluateClientCompany(tenantId: string, clientCompanyId: string): Promise<ClientCompanyRiskScore> {
    // Load active company-scope rules
    const allRules = await riskRuleService.loadActiveRules(tenantId);
    const companyRules = allRules.filter((r) => r.scope === "company");

    // Verify company belongs to tenant
    const company = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });

    if (!company || company.tenantId !== tenantId) {
      throw new Error("Client company not found");
    }

    // Build evaluation context
    const context = await this.buildCompanyContext(tenantId, clientCompanyId);

    // Evaluate each rule
    let score = 0;
    const triggeredRuleCodes: string[] = [];

    for (const rule of companyRules) {
      if (this.evaluateCompanyRuleCondition(rule, context)) {
        score += rule.weight;
        triggeredRuleCodes.push(rule.code);
      }
    }

    // Cap score at 100
    score = Math.min(100, Math.max(0, score));

    // Map to severity
    const severity = this.mapScoreToSeverity(score);

    // Save or update ClientCompanyRiskScore
    const generatedAt = new Date();
    const riskScoreData: CreateClientCompanyRiskScoreInput = {
      tenantId,
      clientCompanyId,
      score,
      severity,
      triggeredRuleCodes,
      generatedAt,
    };

    const existing = await prisma.clientCompanyRiskScore.findFirst({
      where: {
        tenantId,
        clientCompanyId,
      },
      orderBy: { generatedAt: "desc" },
    });

    let riskScore: ClientCompanyRiskScore;
    if (existing) {
      const updated = await prisma.clientCompanyRiskScore.update({
        where: { id: existing.id },
        data: {
          score: riskScoreData.score,
          severity: riskScoreData.severity,
          triggeredRuleCodes: riskScoreData.triggeredRuleCodes,
          generatedAt: generatedAt,
        },
      });
      riskScore = this.mapToClientCompanyRiskScore(updated);
    } else {
      const created = await prisma.clientCompanyRiskScore.create({
        data: {
          tenantId: riskScoreData.tenantId,
          clientCompanyId: riskScoreData.clientCompanyId,
          score: riskScoreData.score,
          severity: riskScoreData.severity,
          triggeredRuleCodes: riskScoreData.triggeredRuleCodes,
          generatedAt: generatedAt,
        },
      });
      riskScore = this.mapToClientCompanyRiskScore(created);
    }

    // Store history
    const { riskTrendService } = await import("./risk-trend-service");
    await riskTrendService.storeRiskScoreHistory(
      tenantId,
      "company",
      clientCompanyId,
      Number(riskScore.score),
      riskScore.severity as "low" | "medium" | "high"
    );

    return riskScore;
  }

  /**
   * Evaluate a document rule condition using pre-computed fraud detection context
   */
  private evaluateRuleCondition(
    rule: RiskRule,
    context: DocumentRuleContext
  ): boolean {
    const features = context.riskFeatures.features;
    const _config = rule.config || {};

    switch (rule.code) {
      case "INV_DUE_BEFORE_ISSUE":
        return features.dateInconsistency === true;

      case "INV_TOTAL_MISMATCH":
        return features.amountMismatch === true;

      case "VAT_RATE_INCONSISTENCY":
        return features.vatRateInconsistency === true;

      case "AMOUNT_DATE_INCONSISTENCY":
        return features.amountDateInconsistency === true;

      case "CHART_MISMATCH":
        return features.chartMismatch === true;

      case "INV_DUPLICATE_NUMBER":
        return features.duplicateInvoiceNumber === true;

      case "INV_DUPLICATE_INVOICE":
        // Duplicate invoice detection: same amount + counterparty + similar date within 30 days
        return context.isDuplicateInvoice;

      case "UNUSUAL_COUNTERPARTY":
        // Counterparty shows unusual patterns (dormant reactivation, abnormal amount, etc.)
        return context.counterpartyAnalysis?.isUnusual ?? false;

      case "NEW_COUNTERPARTY":
        // Counterparty has never been seen before for this client company
        return context.counterpartyAnalysis?.isNew ?? false;

      case "BENFORDS_LAW_VIOLATION":
        // Benford's Law chi-square test on company transaction amounts
        return context.benfordsViolation;

      case "ROUND_NUMBER_SUSPICIOUS":
        // More than 30% of company transaction amounts are suspiciously round
        return context.roundNumberSuspicious;

      case "UNUSUAL_TIMING":
        // Transactions outside business hours, on weekends, or clustered at month-end
        return context.unusualTiming;

      case "INV_MISSING_TAX_NUMBER":
        return features.hasMissingFields === true && features.duplicateInvoiceNumber !== true;

      case "DOC_PARSING_FAILED":
        return context.riskFeatures.riskScore === null || context.riskFeatures.riskFlags.length === 0;

      default:
        // Generic check: look for rule code in risk flags
        return context.riskFeatures.riskFlags.some((flag: any) => flag.code === rule.code);
    }
  }

  /**
   * Evaluate a company rule condition
   */
  private evaluateCompanyRuleCondition(rule: RiskRule, context: CompanyEvaluationContext): boolean {
    const config = rule.config || {};

    switch (rule.code) {
      case "COMP_MANY_HIGH_RISK_DOCS": {
        const threshold = (config.threshold as number) || 5;
        const days = (config.days as number) || 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const highRiskInPeriod = context.documentRiskScores.filter(
          (score) => score.severity === "high" && score.generatedAt >= cutoffDate
        ).length;

        return highRiskInPeriod > threshold;
      }

      case "COMP_HIGH_RISK_RATIO": {
        const threshold = (config.threshold as number) || 0.3; // 30%
        if (context.totalInvoiceCount === 0) return false;
        const ratio = context.highRiskInvoiceCount / context.totalInvoiceCount;
        return ratio > threshold;
      }

      case "COMP_FREQUENT_DUPLICATES": {
        const threshold = (config.threshold as number) || 3;
        return context.duplicateInvoiceNumbers.length > threshold;
      }

      case "COMP_BENFORDS_LAW_VIOLATION":
        // Benford's Law violation detected across all company transactions
        return context.benfordsViolation;

      case "COMP_CIRCULAR_TRANSACTIONS":
        // Circular transaction patterns (A->B->C->A) detected
        return context.hasCircularTransactions;

      case "COMP_UNUSUAL_VAT_PATTERNS":
        // Unusual VAT rate patterns across company invoices
        return context.hasUnusualVatPatterns;

      case "COMP_DATE_MANIPULATION":
        // Date manipulation detected (future dates, backdating, due before issue)
        return context.hasDateManipulation;

      case "COMP_HIGH_FRAUD_PATTERNS": {
        // Too many fraud patterns detected overall
        const fraudThreshold = (config.threshold as number) || 3;
        return context.fraudPatternCount > fraudThreshold;
      }

      default:
        return false;
    }
  }

  /**
   * Build company evaluation context
   */
  private async buildCompanyContext(tenantId: string, clientCompanyId: string): Promise<CompanyEvaluationContext> {
    // Get document risk scores for this company (last 90 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const documentRiskScores = await prisma.documentRiskScore.findMany({
      where: {
        tenantId,
        document: {
          clientCompanyId,
          isDeleted: false,
        },
        generatedAt: {
          gte: cutoffDate,
        },
      },
      include: {
        document: {
          include: {
            relatedInvoice: true,
          },
        },
      },
    });

    const mappedScores: DocumentRiskScore[] = documentRiskScores.map((s) => this.mapToDocumentRiskScore(s));

    // Count high-risk documents
    const highRiskDocumentCount = mappedScores.filter((s) => s.severity === "high").length;

    // Count invoices and high-risk invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientCompanyId,
      },
    });

    const totalInvoiceCount = invoices.length;

    // Get high-risk invoices (documents linked to invoices with high risk)
    const highRiskInvoiceIds = new Set(
      mappedScores
        .filter((s) => s.severity === "high" && s.documentId)
        .map((s) => {
          const doc = documentRiskScores.find((ds) => ds.id === s.id);
          return doc?.document?.relatedInvoiceId;
        })
        .filter((id): id is string => !!id)
    );

    const highRiskInvoiceCount = highRiskInvoiceIds.size;

    // Find duplicate invoice numbers
    const invoiceNumbers = new Map<string, number>();
    for (const invoice of invoices) {
      if (invoice.externalId) {
        invoiceNumbers.set(invoice.externalId, (invoiceNumbers.get(invoice.externalId) || 0) + 1);
      }
    }

    const duplicateInvoiceNumbers = Array.from(invoiceNumbers.entries())
      .filter(([_, count]) => count > 1)
      .map(([number, _]) => number);

    // Run fraud pattern detection for the company
    let benfordsViolation = false;
    let hasCircularTransactions = false;
    let hasUnusualVatPatterns = false;
    let hasDateManipulation = false;
    let fraudPatternCount = 0;

    try {
      const { fraudPatternDetectorService } = await import("./fraud-pattern-detector-service");
      const fraudResult = await fraudPatternDetectorService.detectFraudPatterns(tenantId, clientCompanyId);

      benfordsViolation = fraudResult.benfordsLawViolation;
      hasCircularTransactions = fraudResult.patterns.some((p) => p.type === "circular_transaction");
      hasUnusualVatPatterns = fraudResult.patterns.some((p) => p.type === "vat_pattern");
      hasDateManipulation = fraudResult.patterns.some((p) => p.type === "date_manipulation");
      fraudPatternCount = fraudResult.patterns.length;
    } catch {
      // Fraud pattern detection failed – continue with defaults (false / 0)
    }

    return {
      documentRiskScores: mappedScores,
      highRiskDocumentCount,
      totalInvoiceCount,
      highRiskInvoiceCount,
      duplicateInvoiceNumbers,
      benfordsViolation,
      hasCircularTransactions,
      hasUnusualVatPatterns,
      hasDateManipulation,
      fraudPatternCount,
    };
  }

  /**
   * Map score to severity
   */
  private mapScoreToSeverity(score: number): RiskSeverity {
    if (score <= 30) return "low";
    if (score <= 65) return "medium";
    return "high";
  }

  private mapToDocumentRiskScore(score: any): DocumentRiskScore {
    return {
      id: score.id,
      tenantId: score.tenantId,
      documentId: score.documentId,
      score: Number(score.score),
      severity: score.severity as RiskSeverity,
      triggeredRuleCodes: score.triggeredRuleCodes as string[],
      generatedAt: score.generatedAt,
      createdAt: score.createdAt,
      updatedAt: score.updatedAt,
    };
  }

  private mapToClientCompanyRiskScore(score: any): ClientCompanyRiskScore {
    return {
      id: score.id,
      tenantId: score.tenantId,
      clientCompanyId: score.clientCompanyId,
      score: Number(score.score),
      severity: score.severity as RiskSeverity,
      triggeredRuleCodes: score.triggeredRuleCodes as string[],
      generatedAt: score.generatedAt,
      createdAt: score.createdAt,
      updatedAt: score.updatedAt,
    };
  }
}

export const riskRuleEngine = new RiskRuleEngine();




