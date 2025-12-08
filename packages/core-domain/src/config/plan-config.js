"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_CONFIGS = void 0;
exports.getPlanConfig = getPlanConfig;
const subscription_1 = require("../entities/subscription");
exports.PLAN_CONFIGS = {
    [subscription_1.SubscriptionPlan.FREE]: {
        maxClientCompanies: 3,
        maxDocumentsPerMonth: 100,
        maxAiAnalysesPerMonth: 50,
        maxUsers: 3,
        maxScheduledReports: 1,
    },
    [subscription_1.SubscriptionPlan.PRO]: {
        maxClientCompanies: 50,
        maxDocumentsPerMonth: 1000,
        maxAiAnalysesPerMonth: 500,
        maxUsers: 20,
        maxScheduledReports: 10,
    },
    [subscription_1.SubscriptionPlan.ENTERPRISE]: {
        maxClientCompanies: 10000,
        maxDocumentsPerMonth: 100000,
        maxAiAnalysesPerMonth: 50000,
        maxUsers: 1000,
        maxScheduledReports: 1000,
    },
};
function getPlanConfig(plan) {
    return exports.PLAN_CONFIGS[plan];
}
//# sourceMappingURL=plan-config.js.map