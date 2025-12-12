import { describe, it, expect, beforeEach } from "vitest";
import { securityService } from "../security-service";
import { getTestPrisma, createTestUser } from "../../test-utils";

describe("SecurityService", () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  describe("validatePassword", () => {
    it("should validate strong password", () => {
      const result = securityService.validatePassword("Test123!@#Password");
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should reject weak passwords", () => {
      const weakPasswords = [
        "123", // Too short
        "password", // No uppercase, numbers, special chars
        "PASSWORD", // No lowercase, numbers, special chars
        "Password", // No numbers, special chars
        "Password123", // No special chars
      ];

      weakPasswords.forEach((password) => {
        const result = securityService.validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe("getAccountLockoutStatus", () => {
    it("should get account lockout status", async () => {
      const result = await securityService.getAccountLockoutStatus(
        testUser.user.id
      );

      expect(result.locked).toBeDefined();
      expect(typeof result.locked).toBe("boolean");
      expect(result.failedAttempts).toBeDefined();
      expect(result.remainingAttempts).toBeDefined();
    });
  });
});

