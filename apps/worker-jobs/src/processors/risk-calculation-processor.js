"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskCalculationProcessor = exports.RiskCalculationProcessor = void 0;
const prisma_1 = require("../lib/prisma");
// Use dynamic imports to load services from backend-api at runtime
// This avoids module resolution issues in the monorepo
// @ts-ignore - Dynamic import path resolved at runtime
async function getRiskRuleEngine() {
    try {
        // Try with .js extension first
        const module = await Promise.resolve().then(() => __importStar(require("../../../backend-api/src/services/risk-rule-engine.js")));
        return module.riskRuleEngine;
    }
    catch (error1) {
        try {
            // Fallback to without extension
            const module = await Promise.resolve().then(() => __importStar(require("../../../backend-api/src/services/risk-rule-engine")));
            return module.riskRuleEngine;
        }
        catch (error2) {
            // Last resort: try absolute path from workspace root
            const path = await Promise.resolve().then(() => __importStar(require("path")));
            const fs = await Promise.resolve().then(() => __importStar(require("fs")));
            const workspaceRoot = path.resolve(__dirname, "../../../../");
            const riskEnginePath = path.join(workspaceRoot, "apps/backend-api/src/services/risk-rule-engine");
            // Check if file exists
            if (fs.existsSync(`${riskEnginePath}.ts`) || fs.existsSync(`${riskEnginePath}.js`)) {
                const module = await Promise.resolve(`${riskEnginePath}`).then(s => __importStar(require(s)));
                return module.riskRuleEngine;
            }
            const msg1 = error1 instanceof Error ? error1.message : String(error1);
            const msg2 = error2 instanceof Error ? error2.message : String(error2);
            throw new Error(`Failed to load risk-rule-engine: ${msg1}, ${msg2}`);
        }
    }
}
// @ts-ignore - Dynamic import path resolved at runtime
async function getAnomalyDetectorService() {
    const module = await Promise.resolve().then(() => __importStar(require("../../../backend-api/src/services/anomaly-detector-service")));
    return module.anomalyDetectorService;
}
// @ts-ignore - Dynamic import path resolved at runtime
async function getRiskAlertService() {
    const module = await Promise.resolve().then(() => __importStar(require("../../../backend-api/src/services/risk-alert-service")));
    return module.riskAlertService;
}
class RiskCalculationProcessor {
    /**
     * Process company risk calculation
     */
    async processCompanyRiskCalculation(tenantId, clientCompanyId) {
        try {
            console.log(`[Risk Calculation] Processing company ${clientCompanyId} for tenant ${tenantId}`);
            // Load services dynamically
            const riskRuleEngine = await getRiskRuleEngine();
            const anomalyDetectorService = await getAnomalyDetectorService();
            const riskAlertService = await getRiskAlertService();
            // Calculate company risk score
            const companyRiskScore = await riskRuleEngine.evaluateClientCompany(tenantId, clientCompanyId);
            // Run anomaly detection
            const anomalyResult = await anomalyDetectorService.detectAnomalies(tenantId, clientCompanyId);
            // Create alerts if needed
            if (companyRiskScore.severity === "high") {
                await riskAlertService.createAlert({
                    tenantId,
                    clientCompanyId,
                    type: "RISK_THRESHOLD_EXCEEDED",
                    title: "Yüksek Risk Skoru Tespit Edildi",
                    message: `Müşteri şirketi için risk skoru yüksek seviyede (${companyRiskScore.score}). Tetiklenen kurallar: ${companyRiskScore.triggeredRuleCodes.join(", ")}`,
                    severity: "high",
                });
            }
            // Create alerts for anomalies
            if (anomalyResult.hasAnomalies) {
                for (const anomaly of anomalyResult.anomalies) {
                    await riskAlertService.createAlert({
                        tenantId,
                        clientCompanyId,
                        type: "ANOMALY_DETECTED",
                        title: "Anomali Tespit Edildi",
                        message: anomaly.description,
                        severity: anomaly.severity === "high" ? "high" : anomaly.severity === "medium" ? "medium" : "low",
                    });
                }
            }
            console.log(`[Risk Calculation] Completed company ${clientCompanyId}: score=${companyRiskScore.score}, severity=${companyRiskScore.severity}`);
        }
        catch (error) {
            console.error(`[Risk Calculation] Error processing company ${clientCompanyId}:`, error);
            throw error;
        }
    }
    /**
     * Process document risk calculation
     */
    async processDocumentRiskCalculation(tenantId, documentId) {
        try {
            console.log(`[Risk Calculation] Processing document ${documentId} for tenant ${tenantId}`);
            // Load services dynamically
            const riskRuleEngine = await getRiskRuleEngine();
            const riskAlertService = await getRiskAlertService();
            // Calculate document risk score
            const documentRiskScore = await riskRuleEngine.evaluateDocument(tenantId, documentId);
            // Get document to find client company
            const document = await prisma_1.prisma.document.findUnique({
                where: { id: documentId },
            });
            if (!document) {
                throw new Error(`Document ${documentId} not found`);
            }
            // Create alert if severity is high
            if (documentRiskScore.severity === "high") {
                await riskAlertService.createAlert({
                    tenantId,
                    clientCompanyId: document.clientCompanyId,
                    documentId,
                    type: "RISK_THRESHOLD_EXCEEDED",
                    title: "Yüksek Riskli Belge Tespit Edildi",
                    message: `Belge için risk skoru yüksek seviyede (${documentRiskScore.score}). Tetiklenen kurallar: ${documentRiskScore.triggeredRuleCodes.join(", ")}`,
                    severity: "high",
                });
            }
            console.log(`[Risk Calculation] Completed document ${documentId}: score=${documentRiskScore.score}, severity=${documentRiskScore.severity}`);
        }
        catch (error) {
            console.error(`[Risk Calculation] Error processing document ${documentId}:`, error);
            throw error;
        }
    }
    /**
     * Process risk calculation job
     */
    async processRiskCalculationJob(payload) {
        const { tenantId, clientCompanyId } = payload;
        if (clientCompanyId) {
            // Process specific company
            await this.processCompanyRiskCalculation(tenantId, clientCompanyId);
        }
        else {
            // Process all active companies for tenant
            const companies = await prisma_1.prisma.clientCompany.findMany({
                where: {
                    tenantId,
                    isActive: true,
                },
            });
            for (const company of companies) {
                try {
                    await this.processCompanyRiskCalculation(tenantId, company.id);
                }
                catch (error) {
                    console.error(`[Risk Calculation] Failed to process company ${company.id}:`, error);
                    // Continue with other companies
                }
            }
        }
    }
}
exports.RiskCalculationProcessor = RiskCalculationProcessor;
exports.riskCalculationProcessor = new RiskCalculationProcessor();
//# sourceMappingURL=risk-calculation-processor.js.map