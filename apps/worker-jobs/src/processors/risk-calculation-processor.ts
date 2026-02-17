import { prisma } from "../lib/prisma";
import type { RiskCalculationJobPayload } from "../jobs/risk-calculation-job";
import { logger } from "@repo/shared-utils";

// Use dynamic imports to load services from backend-api at runtime
// This avoids module resolution issues in the monorepo
// @ts-ignore - Dynamic import path resolved at runtime
async function getRiskRuleEngine() {
  try {
    // Try with .js extension first
    const module = await import("../../../backend-api/src/services/risk-rule-engine.js");
    return module.riskRuleEngine;
  } catch (error1: unknown) {
    try {
      // Fallback to without extension
      const module = await import("../../../backend-api/src/services/risk-rule-engine");
      return module.riskRuleEngine;
    } catch (error2: unknown) {
      // Last resort: try absolute path from workspace root
      const path = await import("path");
      const fs = await import("fs");
      const workspaceRoot = path.resolve(__dirname, "../../../../");
      const riskEnginePath = path.join(workspaceRoot, "apps/backend-api/src/services/risk-rule-engine");
      
      // Check if file exists
      if (fs.existsSync(`${riskEnginePath}.ts`) || fs.existsSync(`${riskEnginePath}.js`)) {
        const module = await import(riskEnginePath);
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
  const module = await import("../../../backend-api/src/services/anomaly-detector-service");
  return module.anomalyDetectorService;
}

// @ts-ignore - Dynamic import path resolved at runtime
async function getRiskAlertService() {
  const module = await import("../../../backend-api/src/services/risk-alert-service");
  return module.riskAlertService;
}

export class RiskCalculationProcessor {
  /**
   * Process company risk calculation
   */
  async processCompanyRiskCalculation(tenantId: string, clientCompanyId: string): Promise<void> {
    try {
      logger.info("[Risk Calculation] Processing company", undefined, { clientCompanyId, tenantId });

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

      logger.info("[Risk Calculation] Completed company", undefined, { clientCompanyId, score: companyRiskScore.score, severity: companyRiskScore.severity });
    } catch (error: any) {
      logger.error("[Risk Calculation] Error processing company", error, { clientCompanyId });
      throw error;
    }
  }

  /**
   * Process document risk calculation
   */
  async processDocumentRiskCalculation(tenantId: string, documentId: string): Promise<void> {
    try {
      logger.info("[Risk Calculation] Processing document", undefined, { documentId, tenantId });

      // Load services dynamically
      const riskRuleEngine = await getRiskRuleEngine();
      const riskAlertService = await getRiskAlertService();

      // Calculate document risk score
      const documentRiskScore = await riskRuleEngine.evaluateDocument(tenantId, documentId);

      // Get document to find client company
      const document = await prisma.document.findUnique({
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

      logger.info("[Risk Calculation] Completed document", undefined, { documentId, score: documentRiskScore.score, severity: documentRiskScore.severity });
    } catch (error: any) {
      logger.error("[Risk Calculation] Error processing document", error, { documentId });
      throw error;
    }
  }

  /**
   * Process risk calculation job
   */
  async processRiskCalculationJob(payload: RiskCalculationJobPayload): Promise<void> {
    const { tenantId, clientCompanyId } = payload;

    if (clientCompanyId) {
      // Process specific company
      await this.processCompanyRiskCalculation(tenantId, clientCompanyId);
    } else {
      // Process all active companies for tenant
      const companies = await prisma.clientCompany.findMany({
        where: {
          tenantId,
          isActive: true,
        },
      });

      for (const company of companies) {
        try {
          await this.processCompanyRiskCalculation(tenantId, company.id);
        } catch (error) {
          logger.error("[Risk Calculation] Failed to process company", error, { companyId: company.id });
          // Continue with other companies
        }
      }
    }
  }
}

export const riskCalculationProcessor = new RiskCalculationProcessor();

