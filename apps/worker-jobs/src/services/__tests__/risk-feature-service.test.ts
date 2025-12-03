import { describe, it, expect, beforeEach, vi } from "vitest";
import { RiskFeatureService } from "../risk-feature-service";
import { prisma } from "../../lib/prisma";
import type { ParsedDocumentData } from "../document-parser-service";

// Mock Prisma
vi.mock("../../lib/prisma", () => ({
  prisma: {
    documentParsedData: {
      findFirst: vi.fn(),
    },
  },
}));

describe("RiskFeatureService", () => {
  let service: RiskFeatureService;
  const mockTenantId = "tenant-123";

  beforeEach(() => {
    service = new RiskFeatureService();
    vi.clearAllMocks();
  });

  describe("generateRiskFeatures for invoices", () => {
    it("should flag missing invoice number", async () => {
      const parsedData: ParsedDocumentData = {
        documentType: "invoice",
        fields: {
          issueDate: "15.01.2024",
          totalAmount: 1000,
        },
        parserVersion: "1.0-stub",
      };

      vi.mocked(prisma.documentParsedData.findFirst).mockResolvedValue(null);

      const result = await service.generateRiskFeatures(parsedData, "doc-1", mockTenantId);

      expect(result.riskFlags.some((flag) => flag.code === "INVOICE_NUMBER_MISSING")).toBe(true);
      expect(result.features.hasMissingFields).toBe(true);
    });

    it("should flag date inconsistency", async () => {
      const parsedData: ParsedDocumentData = {
        documentType: "invoice",
        fields: {
          invoiceNumber: "INV-001",
          issueDate: "20.01.2024",
          dueDate: "15.01.2024", // Earlier than issue date
          totalAmount: 1000,
        },
        parserVersion: "1.0-stub",
      };

      vi.mocked(prisma.documentParsedData.findFirst).mockResolvedValue(null);

      const result = await service.generateRiskFeatures(parsedData, "doc-1", mockTenantId);

      expect(result.riskFlags.some((flag) => flag.code === "DATE_INCONSISTENCY")).toBe(true);
      expect(result.features.dateInconsistency).toBe(true);
    });

    it("should flag negative amount", async () => {
      const parsedData: ParsedDocumentData = {
        documentType: "invoice",
        fields: {
          invoiceNumber: "INV-001",
          totalAmount: -100,
        },
        parserVersion: "1.0-stub",
      };

      vi.mocked(prisma.documentParsedData.findFirst).mockResolvedValue(null);

      const result = await service.generateRiskFeatures(parsedData, "doc-1", mockTenantId);

      expect(result.riskFlags.some((flag) => flag.code === "NEGATIVE_AMOUNT")).toBe(true);
      expect(result.features.negativeAmount).toBe(true);
    });

    it("should flag amount mismatch", async () => {
      const parsedData: ParsedDocumentData = {
        documentType: "invoice",
        fields: {
          invoiceNumber: "INV-001",
          totalAmount: 1000,
          lineItems: [
            { lineTotal: 500 },
            { lineTotal: 300 }, // Sum = 800, but total = 1000
          ],
        },
        parserVersion: "1.0-stub",
      };

      vi.mocked(prisma.documentParsedData.findFirst).mockResolvedValue(null);

      const result = await service.generateRiskFeatures(parsedData, "doc-1", mockTenantId);

      expect(result.riskFlags.some((flag) => flag.code === "AMOUNT_MISMATCH")).toBe(true);
      expect(result.features.amountMismatch).toBe(true);
    });

    it("should flag duplicate invoice number", async () => {
      const parsedData: ParsedDocumentData = {
        documentType: "invoice",
        fields: {
          invoiceNumber: "INV-001",
          totalAmount: 1000,
        },
        parserVersion: "1.0-stub",
      };

      // Mock finding duplicate
      vi.mocked(prisma.documentParsedData.findFirst).mockResolvedValue({
        id: "other-doc",
        tenantId: mockTenantId,
        documentId: "other-doc-id",
        documentType: "invoice",
        fields: { invoiceNumber: "INV-001" },
        parserVersion: "1.0-stub",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.generateRiskFeatures(parsedData, "doc-1", mockTenantId);

      expect(result.riskFlags.some((flag) => flag.code === "DUPLICATE_INVOICE_NUMBER")).toBe(true);
      expect(result.features.duplicateInvoiceNumber).toBe(true);
    });

    it("should calculate risk score based on flags", async () => {
      const parsedData: ParsedDocumentData = {
        documentType: "invoice",
        fields: {
          invoiceNumber: "INV-001",
          totalAmount: -100, // Negative amount (high severity)
        },
        parserVersion: "1.0-stub",
      };

      vi.mocked(prisma.documentParsedData.findFirst).mockResolvedValue(null);

      const result = await service.generateRiskFeatures(parsedData, "doc-1", mockTenantId);

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it("should return zero risk score when no flags", async () => {
      const parsedData: ParsedDocumentData = {
        documentType: "invoice",
        fields: {
          invoiceNumber: "INV-001",
          issueDate: "15.01.2024",
          dueDate: "20.01.2024",
          totalAmount: 1000,
          lineItems: [{ lineTotal: 1000 }],
          counterpartyName: "Test Company",
        },
        parserVersion: "1.0-stub",
      };

      vi.mocked(prisma.documentParsedData.findFirst).mockResolvedValue(null);

      const result = await service.generateRiskFeatures(parsedData, "doc-1", mockTenantId);

      expect(result.riskScore).toBe(0);
      expect(result.riskFlags.length).toBe(0);
    });
  });

  describe("generateRiskFeatures for bank statements", () => {
    it("should flag missing balance info", async () => {
      const parsedData: ParsedDocumentData = {
        documentType: "bank_statement",
        fields: {},
        parserVersion: "1.0-stub",
      };

      const result = await service.generateRiskFeatures(parsedData, "doc-1", mockTenantId);

      expect(result.riskFlags.some((flag) => flag.code === "MISSING_BALANCE_INFO")).toBe(true);
    });

    it("should flag negative balance", async () => {
      const parsedData: ParsedDocumentData = {
        documentType: "bank_statement",
        fields: {
          startingBalance: 1000,
          endingBalance: -500,
        },
        parserVersion: "1.0-stub",
      };

      const result = await service.generateRiskFeatures(parsedData, "doc-1", mockTenantId);

      expect(result.riskFlags.some((flag) => flag.code === "NEGATIVE_BALANCE")).toBe(true);
      expect(result.features.negativeBalance).toBe(true);
    });
  });
});

