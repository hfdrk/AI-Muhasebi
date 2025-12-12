import { describe, it, expect, beforeEach } from "vitest";
import { kvkkComplianceService } from "../kvkk-compliance-service";
import { getTestPrisma, createTestUser } from "../../test-utils";

describe("KVKKComplianceService", () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  describe("recordConsent", () => {
    it("should record user consent", async () => {
      const result = await kvkkComplianceService.recordConsent(
        testUser.user.id,
        "data_processing",
        true,
        "127.0.0.1",
        "test-agent"
      );

      expect(result.consentId).toBeDefined();
      expect(result.userId).toBe(testUser.user.id);
      expect(result.consentType).toBe("data_processing");
      expect(result.granted).toBe(true);
    });

    it("should record consent withdrawal", async () => {
      // First grant consent
      await kvkkComplianceService.recordConsent(
        testUser.user.id,
        "marketing",
        true
      );

      // Then withdraw
      const result = await kvkkComplianceService.recordConsent(
        testUser.user.id,
        "marketing",
        false
      );

      expect(result.granted).toBe(false);
    });
  });

  describe("getConsentStatus", () => {
    it("should return consent status for user", async () => {
      // Record some consents
      await kvkkComplianceService.recordConsent(
        testUser.user.id,
        "data_processing",
        true
      );
      await kvkkComplianceService.recordConsent(
        testUser.user.id,
        "marketing",
        false
      );

      const result = await kvkkComplianceService.getConsentStatus(
        testUser.user.id
      );

      expect(result.userId).toBe(testUser.user.id);
      expect(result.consents.data_processing).toBe(true);
      expect(result.consents.marketing).toBe(false);
    });
  });

  describe("requestDataAccess", () => {
    it("should create data access request", async () => {
      const result = await kvkkComplianceService.requestDataAccess(
        testUser.user.id
      );

      expect(result.requestId).toBeDefined();
      expect(result.userId).toBe(testUser.user.id);
      expect(result.status).toBe("pending");
    });
  });

  describe("requestDataDeletion", () => {
    it("should create data deletion request", async () => {
      const result = await kvkkComplianceService.requestDataDeletion(
        testUser.user.id
      );

      expect(result.requestId).toBeDefined();
      expect(result.userId).toBe(testUser.user.id);
      expect(result.status).toBe("pending");
    });
  });

  describe("recordBreach", () => {
    it("should record data breach", async () => {
      const result = await kvkkComplianceService.recordBreach(
        "Test breach description",
        10,
        "medium"
      );

      expect(result.breachId).toBeDefined();
      expect(result.severity).toBe("medium");
      expect(result.affectedUsers).toBe(10);
      expect(result.description).toBe("Test breach description");
    });
  });
});

