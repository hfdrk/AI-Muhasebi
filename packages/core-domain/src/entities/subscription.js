"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageMetricType = exports.SubscriptionStatus = exports.SubscriptionPlan = void 0;
var SubscriptionPlan;
(function (SubscriptionPlan) {
    SubscriptionPlan["FREE"] = "FREE";
    SubscriptionPlan["PRO"] = "PRO";
    SubscriptionPlan["ENTERPRISE"] = "ENTERPRISE";
})(SubscriptionPlan || (exports.SubscriptionPlan = SubscriptionPlan = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "ACTIVE";
    SubscriptionStatus["PAST_DUE"] = "PAST_DUE";
    SubscriptionStatus["CANCELLED"] = "CANCELLED";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var UsageMetricType;
(function (UsageMetricType) {
    UsageMetricType["CLIENT_COMPANIES"] = "CLIENT_COMPANIES";
    UsageMetricType["DOCUMENTS"] = "DOCUMENTS";
    UsageMetricType["AI_ANALYSES"] = "AI_ANALYSES";
    UsageMetricType["USERS"] = "USERS";
    UsageMetricType["SCHEDULED_REPORTS"] = "SCHEDULED_REPORTS";
})(UsageMetricType || (exports.UsageMetricType = UsageMetricType = {}));
//# sourceMappingURL=subscription.js.map