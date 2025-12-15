import { describe, it, expect } from "@jest/globals";
import { ETAConnector } from "../eta-connector";

describe("ETAConnector", () => {
  const connector = new ETAConnector();

  describe("testConnection", () => {
    it("should return success when valid config is provided", async () => {
      const config = {
        username: "test-username",
        password: "test-password",
        vkn: "1234567890",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(true);
      expect(result.message).toContain("ETA");
    });

    it("should return failure when username is missing", async () => {
      const config = {
        password: "test-password",
        vkn: "1234567890",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("kullanıcı adı");
    });

    it("should return failure when password is missing", async () => {
      const config = {
        username: "test-username",
        vkn: "1234567890",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("şifre");
    });

    it("should return failure when vkn is missing", async () => {
      const config = {
        username: "test-username",
        password: "test-password",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("VKN");
    });
  });

  describe("fetchInvoices", () => {
    it("should return empty array (stub implementation)", async () => {
      const sinceDate = new Date("2024-01-01");
      const untilDate = new Date("2024-01-31");

      const invoices = await connector.fetchInvoices(sinceDate, untilDate);

      expect(Array.isArray(invoices)).toBe(true);
      expect(invoices.length).toBe(0);
    });
  });
});



