import { describe, it, expect, beforeEach } from "vitest";
import { analyticsService } from "../analytics-service";
import { getTestPrisma, createTestUser, createTestClientCompany, createTestInvoice } from "../../test-utils";

describe("AnalyticsService", () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let testCompany: Awaited<ReturnType<typeof createTestClientCompany>>;

  beforeEach(async () => {
    testUser = await createTestUser();
    testCompany = await createTestClientCompany({
      tenantId: testUser.tenant.id,
    });
  });

  describe("getFinancialTrends", () => {
    it("should return financial trends", async () => {
      // Create some invoices
      for (let i = 0; i < 5; i++) {
        await createTestInvoice({
          tenantId: testUser.tenant.id,
          clientCompanyId: testCompany.id,
          totalAmount: 1000 + i * 100,
          issueDate: new Date(2024, i, 1),
        });
      }

      const result = await analyticsService.getFinancialTrends(
        testUser.tenant.id,
        new Date(2024, 0, 1),
        new Date(2024, 11, 31),
        "monthly"
      );

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].period).toBeDefined();
        expect(result[0].revenue).toBeDefined();
        expect(result[0].expenses).toBeDefined();
        expect(result[0].profit).toBeDefined();
      }
    });
  });

  describe("getRiskTrends", () => {
    it("should return risk trends", async () => {
      const result = await analyticsService.getRiskTrends(
        testUser.tenant.id,
        new Date(2024, 0, 1),
        new Date(2024, 11, 31),
        "monthly"
      );

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].period).toBeDefined();
        expect(result[0].averageRiskScore).toBeDefined();
      }
    });
  });

  describe("getClientPortfolioAnalytics", () => {
    it("should return portfolio analytics", async () => {
      const result = await analyticsService.getClientPortfolioAnalytics(
        testUser.tenant.id
      );

      expect(result.totalClients).toBeDefined();
      expect(result.activeClients).toBeDefined();
      expect(result.highRiskClients).toBeDefined();
      expect(result.mediumRiskClients).toBeDefined();
      expect(result.lowRiskClients).toBeDefined();
    });
  });
});

