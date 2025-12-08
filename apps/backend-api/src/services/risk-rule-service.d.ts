import type { RiskRule, CreateRiskRuleInput, UpdateRiskRuleInput } from "@repo/core-domain";
export declare class RiskRuleService {
    private mapToRiskRule;
    /**
     * Load all active rules for a tenant
     * Global rules (tenantId=null) are included, tenant-specific rules override global ones by code
     */
    loadActiveRules(tenantId: string): Promise<RiskRule[]>;
    /**
     * Get a rule by code for a tenant
     * Returns tenant-specific rule if exists, otherwise global rule
     */
    getRuleByCode(tenantId: string, code: string): Promise<RiskRule | null>;
    /**
     * Create a new risk rule
     */
    createRule(tenantId: string | null, input: CreateRiskRuleInput): Promise<RiskRule>;
    /**
     * Update a risk rule
     */
    updateRule(tenantId: string | null, ruleId: string, input: UpdateRiskRuleInput): Promise<RiskRule>;
    /**
     * Delete a risk rule
     */
    deleteRule(tenantId: string | null, ruleId: string): Promise<void>;
    /**
     * List all rules for a tenant (including global)
     */
    listRules(tenantId: string): Promise<RiskRule[]>;
}
export declare const riskRuleService: RiskRuleService;
//# sourceMappingURL=risk-rule-service.d.ts.map