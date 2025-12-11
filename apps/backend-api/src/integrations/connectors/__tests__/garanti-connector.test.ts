import { describe, it, expect } from "@jest/globals";
import { GarantiConnector } from "../garanti-connector";

describe("GarantiConnector", () => {
  const connector = new GarantiConnector();

  describe("testConnection", () => {
    it("should return success when valid config is provided", async () => {
      const config = {
        apiKey: "test-api-key",
        apiSecret: "test-api-secret",
        customerNumber: "1234567890",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Garanti BBVA");
    });

    it("should return failure when apiKey is missing", async () => {
      const config = {
        apiSecret: "test-api-secret",
        customerNumber: "1234567890",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("API anahtarı");
    });

    it("should return failure when apiSecret is missing", async () => {
      const config = {
        apiKey: "test-api-key",
        customerNumber: "1234567890",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("API secret");
    });

    it("should return failure when customerNumber is missing", async () => {
      const config = {
        apiKey: "test-api-key",
        apiSecret: "test-api-secret",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Müşteri numarası");
    });
  });

  describe("fetchTransactions", () => {
    it("should return empty array (stub implementation)", async () => {
      const sinceDate = new Date("2024-01-01");
      const untilDate = new Date("2024-01-31");

      const transactions = await connector.fetchTransactions(sinceDate, untilDate);

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBe(0);
    });
  });
});

