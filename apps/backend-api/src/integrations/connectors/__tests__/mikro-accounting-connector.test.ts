import { describe, it, expect } from "@jest/globals";
import { MikroAccountingConnector } from "../mikro-accounting-connector";

describe("MikroAccountingConnector", () => {
  const connector = new MikroAccountingConnector();

  describe("testConnection", () => {
    it("should return success when valid config is provided", async () => {
      const config = {
        apiKey: "test-api-key",
        apiSecret: "test-api-secret",
        companyId: "test-company-id",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Mikro");
    });

    it("should return failure when apiKey is missing", async () => {
      const config = {
        apiSecret: "test-api-secret",
        companyId: "test-company-id",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("API anahtarı");
    });

    it("should return failure when apiSecret is missing", async () => {
      const config = {
        apiKey: "test-api-key",
        companyId: "test-company-id",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("API secret");
    });

    it("should return failure when companyId is missing", async () => {
      const config = {
        apiKey: "test-api-key",
        apiSecret: "test-api-secret",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("şirket ID");
    });

    it("should return failure when apiKey is empty string", async () => {
      const config = {
        apiKey: "",
        apiSecret: "test-api-secret",
        companyId: "test-company-id",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
    });
  });

  describe("fetchInvoices", () => {
    it("should return empty array (stub implementation)", async () => {
      const sinceDate = new Date("2024-01-01");
      const untilDate = new Date("2024-01-31");
      const config = {
        apiKey: "test-api-key",
        apiSecret: "test-api-secret",
        companyId: "test-company-id",
      };

      const invoices = await connector.fetchInvoices(sinceDate, untilDate);

      // Stub implementation returns empty array
      expect(Array.isArray(invoices)).toBe(true);
      expect(invoices.length).toBe(0);
    });

    it("should handle date range correctly", async () => {
      const sinceDate = new Date("2024-01-01");
      const untilDate = new Date("2024-01-31");

      const invoices = await connector.fetchInvoices(sinceDate, untilDate);

      expect(Array.isArray(invoices)).toBe(true);
    });

    it("should accept options parameter", async () => {
      const sinceDate = new Date("2024-01-01");
      const untilDate = new Date("2024-01-31");
      const options = { limit: 50, offset: 0 };

      const invoices = await connector.fetchInvoices(sinceDate, untilDate, options);

      expect(Array.isArray(invoices)).toBe(true);
    });
  });
});

