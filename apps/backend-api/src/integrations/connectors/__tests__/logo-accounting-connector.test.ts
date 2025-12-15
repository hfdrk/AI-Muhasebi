import { describe, it, expect } from "@jest/globals";
import { LogoAccountingConnector } from "../logo-accounting-connector";

describe("LogoAccountingConnector", () => {
  const connector = new LogoAccountingConnector();

  describe("testConnection", () => {
    it("should return success when valid config is provided", async () => {
      const config = {
        apiKey: "test-api-key",
        apiSecret: "test-api-secret",
        firmNumber: "test-firm-number",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Logo");
    });

    it("should return failure when apiKey is missing", async () => {
      const config = {
        apiSecret: "test-api-secret",
        firmNumber: "test-firm-number",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("API anahtarı");
    });

    it("should return failure when apiSecret is missing", async () => {
      const config = {
        apiKey: "test-api-key",
        firmNumber: "test-firm-number",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("API secret");
    });

    it("should return failure when firmNumber is missing", async () => {
      const config = {
        apiKey: "test-api-key",
        apiSecret: "test-api-secret",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("firma numarası");
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



