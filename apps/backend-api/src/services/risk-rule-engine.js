"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskRuleEngine = exports.RiskRuleEngine = void 0;
const prisma_1 = require("../lib/prisma");
const risk_rule_service_1 = require("./risk-rule-service");
class RiskRuleEngine {
    /**
     * Evaluate risk for a document
     */
    async evaluateDocument(tenantId, documentId, riskFeatures) {
        // Load active document-scope rules
        const allRules = await risk_rule_service_1.riskRuleService.loadActiveRules(tenantId);
        const documentRules = allRules.filter((r) => r.scope === "document");
        // Fetch risk features if not provided
        let features;
        if (riskFeatures) {
            features = riskFeatures;
        }
        else {
            const riskFeaturesData = await prisma_1.prisma.documentRiskFeatures.findUnique({
                where: { documentId },
            });
            if (!riskFeaturesData || riskFeaturesData.tenantId !== tenantId) {
                throw new Error("Document risk features not found");
            }
            features = {
                id: riskFeaturesData.id,
                tenantId: riskFeaturesData.tenantId,
                documentId: riskFeaturesData.documentId,
                features: riskFeaturesData.features,
                riskFlags: riskFeaturesData.riskFlags,
                riskScore: riskFeaturesData.riskScore ? Number(riskFeaturesData.riskScore) : null,
                generatedAt: riskFeaturesData.generatedAt,
                createdAt: riskFeaturesData.createdAt,
                updatedAt: riskFeaturesData.updatedAt,
            };
        }
        // Fetch related invoice/transaction if needed
        const document = await prisma_1.prisma.document.findUnique({
            where: { id: documentId },
            include: {
                relatedInvoice: true,
                relatedTransaction: true,
            },
        });
        if (!document || document.tenantId !== tenantId) {
            throw new Error("Document not found");
        }
        // Evaluate each rule
        let score = 0;
        const triggeredRuleCodes = [];
        for (const rule of documentRules) {
            if (this.evaluateRuleCondition(rule, features, document)) {
                score += rule.weight;
                triggeredRuleCodes.push(rule.code);
            }
        }
        // Cap score at 100
        score = Math.min(100, Math.max(0, score));
        // Map to severity
        const severity = this.mapScoreToSeverity(score);
        // Save or update DocumentRiskScore
        const riskScoreData = {
            tenantId,
            documentId,
            score,
            severity,
            triggeredRuleCodes,
            generatedAt: new Date(),
        };
        const existing = await prisma_1.prisma.documentRiskScore.findUnique({
            where: { documentId },
        });
        let riskScore;
        if (existing) {
            const updated = await prisma_1.prisma.documentRiskScore.update({
                where: { id: existing.id },
                data: {
                    score: riskScoreData.score,
                    severity: riskScoreData.severity,
                    triggeredRuleCodes: riskScoreData.triggeredRuleCodes,
                    generatedAt: riskScoreData.generatedAt,
                },
            });
            riskScore = this.mapToDocumentRiskScore(updated);
        }
        else {
            const created = await prisma_1.prisma.documentRiskScore.create({
                data: {
                    tenantId: riskScoreData.tenantId,
                    documentId: riskScoreData.documentId,
                    score: riskScoreData.score,
                    severity: riskScoreData.severity,
                    triggeredRuleCodes: riskScoreData.triggeredRuleCodes,
                    generatedAt: riskScoreData.generatedAt,
                },
            });
            riskScore = this.mapToDocumentRiskScore(created);
        }
        return riskScore;
    }
    /**
     * Evaluate risk for a client company
     */
    async evaluateClientCompany(tenantId, clientCompanyId) {
        // Load active company-scope rules
        const allRules = await risk_rule_service_1.riskRuleService.loadActiveRules(tenantId);
        const companyRules = allRules.filter((r) => r.scope === "company");
        // Verify company belongs to tenant
        const company = await prisma_1.prisma.clientCompany.findUnique({
            where: { id: clientCompanyId },
        });
        if (!company || company.tenantId !== tenantId) {
            throw new Error("Client company not found");
        }
        // Build evaluation context
        const context = await this.buildCompanyContext(tenantId, clientCompanyId);
        // Evaluate each rule
        let score = 0;
        const triggeredRuleCodes = [];
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
        const riskScoreData = {
            tenantId,
            clientCompanyId,
            score,
            severity,
            triggeredRuleCodes,
            generatedAt: new Date(),
        };
        const existing = await prisma_1.prisma.clientCompanyRiskScore.findFirst({
            where: {
                tenantId,
                clientCompanyId,
            },
            orderBy: { generatedAt: "desc" },
        });
        let riskScore;
        if (existing) {
            const updated = await prisma_1.prisma.clientCompanyRiskScore.update({
                where: { id: existing.id },
                data: {
                    score: riskScoreData.score,
                    severity: riskScoreData.severity,
                    triggeredRuleCodes: riskScoreData.triggeredRuleCodes,
                    generatedAt: riskScoreData.generatedAt,
                },
            });
            riskScore = this.mapToClientCompanyRiskScore(updated);
        }
        else {
            const created = await prisma_1.prisma.clientCompanyRiskScore.create({
                data: {
                    tenantId: riskScoreData.tenantId,
                    clientCompanyId: riskScoreData.clientCompanyId,
                    score: riskScoreData.score,
                    severity: riskScoreData.severity,
                    triggeredRuleCodes: riskScoreData.triggeredRuleCodes,
                    generatedAt: riskScoreData.generatedAt,
                },
            });
            riskScore = this.mapToClientCompanyRiskScore(created);
        }
        return riskScore;
    }
    /**
     * Evaluate a document rule condition
     */
    evaluateRuleCondition(rule, riskFeatures, document) {
        const features = riskFeatures.features;
        const config = rule.config || {};
        switch (rule.code) {
            case "INV_DUE_BEFORE_ISSUE":
                return features.dateInconsistency === true;
            case "INV_TOTAL_MISMATCH":
                return features.amountMismatch === true;
            case "INV_DUPLICATE_NUMBER":
                return features.duplicateInvoiceNumber === true;
            case "INV_MISSING_TAX_NUMBER":
                return features.hasMissingFields === true && features.duplicateInvoiceNumber !== true;
            case "DOC_PARSING_FAILED":
                return riskFeatures.riskScore === null || riskFeatures.riskFlags.length === 0;
            default:
                // Generic check: look for rule code in risk flags
                return riskFeatures.riskFlags.some((flag) => flag.code === rule.code);
        }
    }
    /**
     * Evaluate a company rule condition
     */
    evaluateCompanyRuleCondition(rule, context) {
        const config = rule.config || {};
        switch (rule.code) {
            case "COMP_MANY_HIGH_RISK_DOCS": {
                const threshold = config.threshold || 5;
                const days = config.days || 90;
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);
                const highRiskInPeriod = context.documentRiskScores.filter((score) => score.severity === "high" && score.generatedAt >= cutoffDate).length;
                return highRiskInPeriod > threshold;
            }
            case "COMP_HIGH_RISK_RATIO": {
                const threshold = config.threshold || 0.3; // 30%
                if (context.totalInvoiceCount === 0)
                    return false;
                const ratio = context.highRiskInvoiceCount / context.totalInvoiceCount;
                return ratio > threshold;
            }
            case "COMP_FREQUENT_DUPLICATES": {
                const threshold = config.threshold || 3;
                return context.duplicateInvoiceNumbers.length > threshold;
            }
            default:
                return false;
        }
    }
    /**
     * Build company evaluation context
     */
    async buildCompanyContext(tenantId, clientCompanyId) {
        // Get document risk scores for this company (last 90 days)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        const documentRiskScores = await prisma_1.prisma.documentRiskScore.findMany({
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
        const mappedScores = documentRiskScores.map((s) => this.mapToDocumentRiskScore(s));
        // Count high-risk documents
        const highRiskDocumentCount = mappedScores.filter((s) => s.severity === "high").length;
        // Count invoices and high-risk invoices
        const invoices = await prisma_1.prisma.invoice.findMany({
            where: {
                tenantId,
                clientCompanyId,
            },
        });
        const totalInvoiceCount = invoices.length;
        // Get high-risk invoices (documents linked to invoices with high risk)
        const highRiskInvoiceIds = new Set(mappedScores
            .filter((s) => s.severity === "high" && s.documentId)
            .map((s) => {
            const doc = documentRiskScores.find((ds) => ds.id === s.id);
            return doc?.document?.relatedInvoiceId;
        })
            .filter((id) => !!id));
        const highRiskInvoiceCount = highRiskInvoiceIds.size;
        // Find duplicate invoice numbers
        const invoiceNumbers = new Map();
        for (const invoice of invoices) {
            if (invoice.externalId) {
                invoiceNumbers.set(invoice.externalId, (invoiceNumbers.get(invoice.externalId) || 0) + 1);
            }
        }
        const duplicateInvoiceNumbers = Array.from(invoiceNumbers.entries())
            .filter(([_, count]) => count > 1)
            .map(([number, _]) => number);
        return {
            documentRiskScores: mappedScores,
            highRiskDocumentCount,
            totalInvoiceCount,
            highRiskInvoiceCount,
            duplicateInvoiceNumbers,
        };
    }
    /**
     * Map score to severity
     */
    mapScoreToSeverity(score) {
        if (score <= 30)
            return "low";
        if (score <= 65)
            return "medium";
        return "high";
    }
    mapToDocumentRiskScore(score) {
        return {
            id: score.id,
            tenantId: score.tenantId,
            documentId: score.documentId,
            score: Number(score.score),
            severity: score.severity,
            triggeredRuleCodes: score.triggeredRuleCodes,
            generatedAt: score.generatedAt,
            createdAt: score.createdAt,
            updatedAt: score.updatedAt,
        };
    }
    mapToClientCompanyRiskScore(score) {
        return {
            id: score.id,
            tenantId: score.tenantId,
            clientCompanyId: score.clientCompanyId,
            score: Number(score.score),
            severity: score.severity,
            triggeredRuleCodes: score.triggeredRuleCodes,
            generatedAt: score.generatedAt,
            createdAt: score.createdAt,
            updatedAt: score.updatedAt,
        };
    }
}
exports.RiskRuleEngine = RiskRuleEngine;
exports.riskRuleEngine = new RiskRuleEngine();
//# sourceMappingURL=risk-rule-engine.js.map