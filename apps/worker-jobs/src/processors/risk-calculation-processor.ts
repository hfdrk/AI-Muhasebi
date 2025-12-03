import { prisma } from "../lib/prisma";
import type { RiskCalculationJobPayload } from "../jobs/risk-calculation-job";
// Import services - using relative path to backend-api services
// In production, these should be in a shared package
import { riskRuleEngine } from "../../backend-api/src/services/risk-rule-engine";
import { anomalyDetectorService } from "../../backend-api/src/services/anomaly-detector-service";
import { riskAlertService } from "../../backend-api/src/services/risk-alert-service";

export class RiskCalculationProcessor {
  /**
   * Process company risk calculation
   */
  async processCompanyRiskCalculation(tenantId: string, clientCompanyId: string): Promise<void> {
    try {
      console.log(`[Risk Calculation] Processing company ${clientCompanyId} for tenant ${tenantId}`);

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
    } catch (error: any) {
      console.error(`[Risk Calculation] Error processing company ${clientCompanyId}:`, error);
      throw error;
    }
  }

  /**
   * Process document risk calculation
   */
  async processDocumentRiskCalculation(tenantId: string, documentId: string): Promise<void> {
    try {
      console.log(`[Risk Calculation] Processing document ${documentId} for tenant ${tenantId}`);

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

      console.log(`[Risk Calculation] Completed document ${documentId}: score=${documentRiskScore.score}, severity=${documentRiskScore.severity}`);
    } catch (error: any) {
      console.error(`[Risk Calculation] Error processing document ${documentId}:`, error);
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
          console.error(`[Risk Calculation] Failed to process company ${company.id}:`, error);
          // Continue with other companies
        }
      }
    }
  }
}

export const riskCalculationProcessor = new RiskCalculationProcessor();

