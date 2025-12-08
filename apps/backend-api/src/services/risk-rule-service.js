"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskRuleService = exports.RiskRuleService = void 0;
const prisma_1 = require("../lib/prisma");
const shared_utils_1 = require("@repo/shared-utils");
class RiskRuleService {
    mapToRiskRule(rule) {
        return {
            id: rule.id,
            tenantId: rule.tenantId,
            scope: rule.scope,
            code: rule.code,
            description: rule.description,
            weight: Number(rule.weight),
            isActive: rule.isActive,
            defaultSeverity: rule.defaultSeverity,
            config: rule.config,
            createdAt: rule.createdAt,
            updatedAt: rule.updatedAt,
        };
    }
    /**
     * Load all active rules for a tenant
     * Global rules (tenantId=null) are included, tenant-specific rules override global ones by code
     */
    async loadActiveRules(tenantId) {
        // Load global rules (tenantId = null)
        const globalRules = await prisma_1.prisma.riskRule.findMany({
            where: {
                tenantId: null,
                isActive: true,
            },
        });
        // Load tenant-specific rules
        const tenantRules = await prisma_1.prisma.riskRule.findMany({
            where: {
                tenantId,
                isActive: true,
            },
        });
        // Create a map of tenant rules by code (these override global rules)
        const tenantRuleMap = new Map();
        tenantRules.forEach((rule) => {
            tenantRuleMap.set(rule.code, this.mapToRiskRule(rule));
        });
        // Combine: use tenant rules if they exist, otherwise use global rules
        const combinedRules = [];
        globalRules.forEach((rule) => {
            const tenantRule = tenantRuleMap.get(rule.code);
            if (tenantRule) {
                combinedRules.push(tenantRule);
                tenantRuleMap.delete(rule.code); // Remove from map so we don't add it twice
            }
            else {
                combinedRules.push(this.mapToRiskRule(rule));
            }
        });
        // Add any tenant-specific rules that don't have global counterparts
        tenantRuleMap.forEach((rule) => {
            combinedRules.push(rule);
        });
        return combinedRules;
    }
    /**
     * Get a rule by code for a tenant
     * Returns tenant-specific rule if exists, otherwise global rule
     */
    async getRuleByCode(tenantId, code) {
        // Try tenant-specific rule first
        const tenantRule = await prisma_1.prisma.riskRule.findUnique({
            where: {
                tenantId_code: {
                    tenantId,
                    code,
                },
            },
        });
        if (tenantRule) {
            return this.mapToRiskRule(tenantRule);
        }
        // Fall back to global rule
        const globalRule = await prisma_1.prisma.riskRule.findUnique({
            where: {
                tenantId_code: {
                    tenantId: null,
                    code,
                },
            },
        });
        return globalRule ? this.mapToRiskRule(globalRule) : null;
    }
    /**
     * Create a new risk rule
     */
    async createRule(tenantId, input) {
        const rule = await prisma_1.prisma.riskRule.create({
            data: {
                tenantId: input.tenantId ?? tenantId,
                scope: input.scope,
                code: input.code,
                description: input.description,
                weight: input.weight,
                isActive: input.isActive ?? true,
                defaultSeverity: input.defaultSeverity,
                config: input.config ?? {},
            },
        });
        return this.mapToRiskRule(rule);
    }
    /**
     * Update a risk rule
     */
    async updateRule(tenantId, ruleId, input) {
        // Verify rule belongs to tenant (or is global)
        const existingRule = await prisma_1.prisma.riskRule.findUnique({
            where: { id: ruleId },
        });
        if (!existingRule) {
            throw new shared_utils_1.NotFoundError("Risk kuralı bulunamadı.");
        }
        if (tenantId && existingRule.tenantId !== tenantId && existingRule.tenantId !== null) {
            throw new shared_utils_1.NotFoundError("Risk kuralı bulunamadı.");
        }
        const rule = await prisma_1.prisma.riskRule.update({
            where: { id: ruleId },
            data: {
                description: input.description,
                weight: input.weight,
                isActive: input.isActive,
                defaultSeverity: input.defaultSeverity,
                config: input.config,
            },
        });
        return this.mapToRiskRule(rule);
    }
    /**
     * Delete a risk rule
     */
    async deleteRule(tenantId, ruleId) {
        const existingRule = await prisma_1.prisma.riskRule.findUnique({
            where: { id: ruleId },
        });
        if (!existingRule) {
            throw new shared_utils_1.NotFoundError("Risk kuralı bulunamadı.");
        }
        if (tenantId && existingRule.tenantId !== tenantId && existingRule.tenantId !== null) {
            throw new shared_utils_1.NotFoundError("Risk kuralı bulunamadı.");
        }
        await prisma_1.prisma.riskRule.delete({
            where: { id: ruleId },
        });
    }
    /**
     * List all rules for a tenant (including global)
     */
    async listRules(tenantId) {
        const [globalRules, tenantRules] = await Promise.all([
            prisma_1.prisma.riskRule.findMany({
                where: {
                    tenantId: null,
                },
            }),
            prisma_1.prisma.riskRule.findMany({
                where: {
                    tenantId,
                },
            }),
        ]);
        return [...globalRules.map((r) => this.mapToRiskRule(r)), ...tenantRules.map((r) => this.mapToRiskRule(r))];
    }
}
exports.RiskRuleService = RiskRuleService;
exports.riskRuleService = new RiskRuleService();
//# sourceMappingURL=risk-rule-service.js.map