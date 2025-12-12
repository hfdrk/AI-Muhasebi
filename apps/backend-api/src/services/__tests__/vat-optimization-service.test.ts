import { describe, it, expect, beforeEach } from "vitest";
import { vatOptimizationService } from "../vat-optimization-service";
import { getTestPrisma, createTestUser, createTestClientCompany, createTestInvoice } from "../../test-utils";

describe("VATOptimizationService", () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let testCompany: Awaited<ReturnType<typeof createTestClientCompany>>;

  beforeEach(async () => {
    testUser = await createTestUser();
    testCompany = await createTestClientCompany({
      tenantId: testUser.tenant.id,
    });
  });

  describe("analyzeVAT", () => {
    it("should analyze VAT for a client company", async () => {
      // Create invoices with different VAT rates
      await createTestInvoice({
        tenantId: testUser.tenant.id,
        clientCompanyId: testCompany.id,
        totalAmount: 1180, // 18% VAT
        vatAmount: 180,
        netAmount: 1000,
      });

      await createTestInvoice({
        tenantId: testUser.tenant.id,
        clientCompanyId: testCompany.id,
        totalAmount: 1200, // 20% VAT
        vatAmount: 200,
        netAmount: 1000,
      });

      const result = await vatOptimizationService.analyzeVAT(
        testUser.tenant.id,
        testCompany.id,
        new Date(2024, 0, 1),
        new Date(2024, 11, 31)
      );

      expect(result.totalVAT).toBeGreaterThan(0);
      expect(result.inputVAT).toBeDefined();
      expect(result.outputVAT).toBeDefined();
      expect(result.netVAT).toBeDefined();
    });

    it("should detect VAT inconsistencies", async () => {
      // Create invoice with inconsistent VAT
      await createTestInvoice({
        tenantId: testUser.tenant.id,
        clientCompanyId: testCompany.id,
        totalAmount: 1180,
        vatAmount: 200, // Inconsistent: should be 180 for 18%
        netAmount: 980,
      });

      const result = await vatOptimizationService.analyzeVAT(
        testUser.tenant.id,
        testCompany.id,
        new Date(2024, 0, 1),
        new Date(2024, 11, 31)
      );

      expect(result.inconsistencies.length).toBeGreaterThan(0);
    });
  });

  describe("validateVATRate", () => {
    it("should validate Turkish VAT rates", () => {
      const validRates = [0, 1, 10, 18, 20];
      validRates.forEach((rate) => {
        const result = vatOptimizationService.validateVATRate(rate);
        expect(result.valid).toBe(true);
      });
    });

    it("should reject invalid VAT rates", () => {
      const invalidRates = [5, 15, 25, -1, 100];
      invalidRates.forEach((rate) => {
        const result = vatOptimizationService.validateVATRate(rate);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });
});

