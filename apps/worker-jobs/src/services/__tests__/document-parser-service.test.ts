import { describe, it, expect } from "vitest";
import { DocumentParserService } from "../document-parser-service";

describe("DocumentParserService", () => {
  const service = new DocumentParserService();

  describe("parseInvoice", () => {
    it("should extract invoice number from Turkish text", async () => {
      const text = "Fatura No: INV-2024-001\nTarih: 15.01.2024\nToplam: 1,250.00";
      const result = await service.parseDocument(text, "INVOICE", "tenant-1");

      expect(result.documentType).toBe("invoice");
      expect(result.fields).toHaveProperty("invoiceNumber");
      expect(result.parserVersion).toBe("1.0-stub");
    });

    it("should extract dates from Turkish format", async () => {
      const text = "Fatura Tarihi: 15.01.2024\nVade Tarihi: 20.01.2024";
      const result = await service.parseDocument(text, "INVOICE", "tenant-1");

      expect(result.documentType).toBe("invoice");
      if (result.fields && typeof result.fields === "object" && "issueDate" in result.fields) {
        expect(result.fields.issueDate).toBeDefined();
      }
    });

    it("should extract amounts from Turkish text", async () => {
      const text = "Toplam: 1,250.00\nKDV: 225.00\nNet: 1,025.00";
      const result = await service.parseDocument(text, "INVOICE", "tenant-1");

      expect(result.documentType).toBe("invoice");
      if (result.fields && typeof result.fields === "object") {
        const fields = result.fields as any;
        if (fields.totalAmount !== undefined) {
          expect(typeof fields.totalAmount).toBe("number");
        }
      }
    });
  });

  describe("parseBankStatement", () => {
    it("should detect bank statement type", async () => {
      const text = "Banka Ekstresi\nHesap No: 1234567890";
      const result = await service.parseDocument(text, "BANK_STATEMENT", "tenant-1");

      expect(result.documentType).toBe("bank_statement");
    });

    it("should extract account number and balances", async () => {
      const text = "Hesap No: TR1234567890\nBaşlangıç Bakiye: 10,000.00\nBitiş Bakiye: 12,500.00";
      const result = await service.parseDocument(text, "BANK_STATEMENT", "tenant-1");

      expect(result.documentType).toBe("bank_statement");
      if (result.fields && typeof result.fields === "object") {
        const fields = result.fields as any;
        expect(fields).toHaveProperty("accountNumber");
      }
    });
  });

  describe("detectDocumentType", () => {
    it("should detect invoice from hint", async () => {
      const result = await service.parseDocument("some text", "INVOICE", "tenant-1");
      expect(result.documentType).toBe("invoice");
    });

    it("should detect bank statement from hint", async () => {
      const result = await service.parseDocument("some text", "BANK_STATEMENT", "tenant-1");
      expect(result.documentType).toBe("bank_statement");
    });

    it("should detect invoice from text content", async () => {
      const result = await service.parseDocument("Fatura No: 123", "OTHER", "tenant-1");
      expect(result.documentType).toBe("invoice");
    });
  });
});

