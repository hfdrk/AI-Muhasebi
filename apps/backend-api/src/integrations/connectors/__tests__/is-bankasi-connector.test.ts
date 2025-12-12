import { describe, it, expect } from "@jest/globals";
import { IsBankasiConnector } from "../is-bankasi-connector";

describe("IsBankasiConnector", () => {
  const connector = new IsBankasiConnector();

  describe("testConnection", () => {
    it("should return success when valid config is provided", async () => {
      const config = {
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        accountNumber: "1234567890",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(true);
      expect(result.message).toContain("İş Bankası");
    });

    it("should return failure when clientId is missing", async () => {
      const config = {
        clientSecret: "test-client-secret",
        accountNumber: "1234567890",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("client ID");
    });

    it("should return failure when clientSecret is missing", async () => {
      const config = {
        clientId: "test-client-id",
        accountNumber: "1234567890",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("client secret");
    });

    it("should return failure when accountNumber is missing", async () => {
      const config = {
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Hesap numarası");
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


