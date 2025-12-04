import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import type {
  RiskRule,
  CreateRiskRuleInput,
  UpdateRiskRuleInput,
  RiskRuleScope,
} from "@repo/core-domain";

export class RiskRuleService {
  private mapToRiskRule(rule: any): RiskRule {
    return {
      id: rule.id,
      tenantId: rule.tenantId,
      scope: rule.scope as RiskRuleScope,
      code: rule.code,
      description: rule.description,
      weight: Number(rule.weight),
      isActive: rule.isActive,
      defaultSeverity: rule.defaultSeverity,
      config: rule.config as Record<string, unknown> | null,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  /**
   * Load all active rules for a tenant
   * Global rules (tenantId=null) are included, tenant-specific rules override global ones by code
   */
  async loadActiveRules(tenantId: string): Promise<RiskRule[]> {
    // Load global rules (tenantId = null)
    const globalRules = await prisma.riskRule.findMany({
      where: {
        tenantId: null,
        isActive: true,
      },
    });

    // Load tenant-specific rules
    const tenantRules = await prisma.riskRule.findMany({
      where: {
        tenantId,
        isActive: true,
      },
    });

    // Create a map of tenant rules by code (these override global rules)
    const tenantRuleMap = new Map<string, RiskRule>();
    tenantRules.forEach((rule) => {
      tenantRuleMap.set(rule.code, this.mapToRiskRule(rule));
    });

    // Combine: use tenant rules if they exist, otherwise use global rules
    const combinedRules: RiskRule[] = [];
    globalRules.forEach((rule) => {
      const tenantRule = tenantRuleMap.get(rule.code);
      if (tenantRule) {
        combinedRules.push(tenantRule);
        tenantRuleMap.delete(rule.code); // Remove from map so we don't add it twice
      } else {
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
  async getRuleByCode(tenantId: string, code: string): Promise<RiskRule | null> {
    // Try tenant-specific rule first
    const tenantRule = await prisma.riskRule.findUnique({
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
    const globalRule = await prisma.riskRule.findUnique({
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
  async createRule(tenantId: string | null, input: CreateRiskRuleInput): Promise<RiskRule> {
    const rule = await prisma.riskRule.create({
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
  async updateRule(
    tenantId: string | null,
    ruleId: string,
    input: UpdateRiskRuleInput
  ): Promise<RiskRule> {
    // Verify rule belongs to tenant (or is global)
    const existingRule = await prisma.riskRule.findUnique({
      where: { id: ruleId },
    });

    if (!existingRule) {
      throw new NotFoundError("Risk kuralı bulunamadı.");
    }

    if (tenantId && existingRule.tenantId !== tenantId && existingRule.tenantId !== null) {
      throw new NotFoundError("Risk kuralı bulunamadı.");
    }

    const rule = await prisma.riskRule.update({
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
  async deleteRule(tenantId: string | null, ruleId: string): Promise<void> {
    const existingRule = await prisma.riskRule.findUnique({
      where: { id: ruleId },
    });

    if (!existingRule) {
      throw new NotFoundError("Risk kuralı bulunamadı.");
    }

    if (tenantId && existingRule.tenantId !== tenantId && existingRule.tenantId !== null) {
      throw new NotFoundError("Risk kuralı bulunamadı.");
    }

    await prisma.riskRule.delete({
      where: { id: ruleId },
    });
  }

  /**
   * List all rules for a tenant (including global)
   */
  async listRules(tenantId: string): Promise<RiskRule[]> {
    const [globalRules, tenantRules] = await Promise.all([
      prisma.riskRule.findMany({
        where: {
          tenantId: null,
        },
      }),
      prisma.riskRule.findMany({
        where: {
          tenantId,
        },
      }),
    ]);

    return [...globalRules.map((r) => this.mapToRiskRule(r)), ...tenantRules.map((r) => this.mapToRiskRule(r))];
  }
}

export const riskRuleService = new RiskRuleService();



