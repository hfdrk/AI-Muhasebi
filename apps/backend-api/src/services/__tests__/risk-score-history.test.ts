// Import env setup FIRST
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import { getTestPrisma, createTestTenant, createTestClientCompany, createTestDocument } from "../../test-utils";
import { riskTrendService } from "../risk-trend-service";

describe("Risk Score History Storage", () => {
  let tenantId: string;
  let clientCompanyId: string;
  let documentId: string;
  const prisma = getTestPrisma();

  beforeEach(async () => {
    // Create test tenant and client company
    const tenant = await createTestTenant("Test Tenant", "test-tenant");
    tenantId = tenant.id;

    const clientCompany = await createTestClientCompany({
      tenantId,
      name: "Test Company",
      taxNumber: "1234567890",
    });
    clientCompanyId = clientCompany.id;

    const document = await createTestDocument({
      tenantId,
      clientCompanyId,
      type: "INVOICE",
      originalFileName: "test.pdf",
      storagePath: "test/test.pdf",
      mimeType: "application/pdf",
    });
    documentId = document.id;
  });

  describe("storeRiskScoreHistory", () => {
    it("should store document risk score history", async () => {
      const score = 75;
      const severity = "high" as const;

      await riskTrendService.storeRiskScoreHistory(
        tenantId,
        "document",
        documentId,
        score,
        severity
      );

      const history = await prisma.riskScoreHistory.findFirst({
        where: {
          tenantId,
          entityType: "document",
          entityId: documentId,
        },
        orderBy: {
          recordedAt: "desc",
        },
      });

      expect(history).toBeDefined();
      expect(Number(history?.score)).toBe(score);
      expect(history?.severity).toBe(severity);
      expect(history?.entityType).toBe("document");
      expect(history?.entityId).toBe(documentId);
    });

    it("should store company risk score history", async () => {
      const score = 60;
      const severity = "medium" as const;

      await riskTrendService.storeRiskScoreHistory(
        tenantId,
        "company",
        clientCompanyId,
        score,
        severity
      );

      const history = await prisma.riskScoreHistory.findFirst({
        where: {
          tenantId,
          entityType: "company",
          entityId: clientCompanyId,
        },
        orderBy: {
          recordedAt: "desc",
        },
      });

      expect(history).toBeDefined();
      expect(Number(history?.score)).toBe(score);
      expect(history?.severity).toBe(severity);
      expect(history?.entityType).toBe("company");
      expect(history?.entityId).toBe(clientCompanyId);
    });

    it("should store multiple history records for same entity", async () => {
      const score1 = 50;
      const score2 = 75;

      await riskTrendService.storeRiskScoreHistory(
        tenantId,
        "document",
        documentId,
        score1,
        "low"
      );

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));

      await riskTrendService.storeRiskScoreHistory(
        tenantId,
        "document",
        documentId,
        score2,
        "high"
      );

      const historyRecords = await prisma.riskScoreHistory.findMany({
        where: {
          tenantId,
          entityType: "document",
          entityId: documentId,
        },
        orderBy: {
          recordedAt: "asc",
        },
      });

      expect(historyRecords).toHaveLength(2);
      expect(Number(historyRecords[0].score)).toBe(score1);
      expect(Number(historyRecords[1].score)).toBe(score2);
    });
  });

  // Note: Risk Rule Engine integration tests are covered in risk-engine.integration.test.ts
  // The automatic history storage is verified there when risk scores are calculated

  describe("getRiskTrend", () => {
    it("should retrieve risk score history for trend analysis", async () => {
      // Store multiple history records
      const scores = [50, 60, 70, 75];
      const severities: Array<"low" | "medium" | "high"> = ["low", "medium", "medium", "high"];

      for (let i = 0; i < scores.length; i++) {
        await riskTrendService.storeRiskScoreHistory(
          tenantId,
          "document",
          documentId,
          scores[i],
          severities[i]
        );
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Create a document risk score record (required by getDocumentRiskTrend)
      const prisma = getTestPrisma();
      await prisma.documentRiskScore.upsert({
        where: { documentId },
        create: {
          tenantId,
          documentId,
          score: scores[scores.length - 1],
          severity: severities[severities.length - 1],
          triggeredRuleCodes: [],
          generatedAt: new Date(),
        },
        update: {
          score: scores[scores.length - 1],
          severity: severities[severities.length - 1],
          generatedAt: new Date(),
        },
      });

      // Get trend
      const trend = await riskTrendService.getDocumentRiskTrend(
        tenantId,
        documentId,
        30
      );

      expect(trend).toBeDefined();
      expect(trend.history.length).toBeGreaterThan(0);
      expect(Number(trend.currentScore)).toBe(scores[scores.length - 1]);
      if (trend.previousScore !== null) {
        expect(Number(trend.previousScore)).toBe(scores[scores.length - 2]);
      }
    });
  });
});

