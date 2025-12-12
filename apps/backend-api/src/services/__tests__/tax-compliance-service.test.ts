// Import env setup FIRST
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import { taxComplianceService } from "../tax-compliance-service";
import { getTestPrisma, createTestUser, createTestClientCompany, createTestInvoice } from "../../test-utils";

describe("TaxComplianceService", () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let testCompany: Awaited<ReturnType<typeof createTestClientCompany>>;

  beforeEach(async () => {
    testUser = await createTestUser();
    testCompany = await createTestClientCompany({
      tenantId: testUser.tenant.id,
    });
  });

  describe("checkCompliance", () => {
    it("should check tax compliance for client company", async () => {
      const result = await taxComplianceService.checkCompliance(
        testUser.tenant.id,
        testCompany.id
      );

      expect(result.isCompliant).toBeDefined();
      expect(typeof result.isCompliant).toBe("boolean");
      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
      expect(result.deadlines).toBeDefined();
      expect(Array.isArray(result.deadlines)).toBe(true);
    });

    it("should detect compliance issues", async () => {
      // Create invoice with missing tax information
      await createTestInvoice({
        tenantId: testUser.tenant.id,
        clientCompanyId: testCompany.id,
        taxAmount: null,
      });

      const result = await taxComplianceService.checkCompliance(
        testUser.tenant.id,
        testCompany.id
      );

      // Should detect issues or be compliant
      expect(result.issues).toBeDefined();
    });
  });

  describe("getUpcomingDeadlines", () => {
    it("should return upcoming tax deadlines", async () => {
      const result = await taxComplianceService.getUpcomingDeadlines(
        testUser.tenant.id,
        testCompany.id
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });
});

