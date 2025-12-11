import { describe, it, expect, beforeEach } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { counterpartyAnalysisService } from "../counterparty-analysis-service";

const prisma = new PrismaClient();

describe("CounterpartyAnalysisService", () => {
  let testTenantId: string;
  let testClientCompanyId: string;

  beforeEach(async () => {
    // Create test tenant and client company
    const tenant = await prisma.tenant.create({
      data: {
        name: "Test Tenant",
        slug: `test-tenant-${Date.now()}`,
      },
    });
    testTenantId = tenant.id;

    const clientCompany = await prisma.clientCompany.create({
      data: {
        tenantId: testTenantId,
        name: "Test Client",
        taxNumber: "1234567890",
      },
    });
    testClientCompanyId = clientCompany.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.invoice.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.transaction.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.clientCompany.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
  });

  describe("analyzeCounterparty", () => {
    it("should detect new counterparty", async () => {
      const result = await counterpartyAnalysisService.analyzeCounterparty(
        testTenantId,
        testClientCompanyId,
        "New Company",
        "9876543210",
        1000,
        new Date()
      );

      expect(result.isNewCounterparty).toBe(true);
      expect(result.isUnusualCounterparty).toBe(true);
      expect(result.unusualPatterns).toContain("Yeni karşı taraf - ilk kez görülüyor");
    });

    it("should detect unusual patterns for existing counterparty", async () => {
      // Create initial invoice
      await prisma.invoice.create({
        data: {
          tenantId: testTenantId,
          clientCompanyId: testClientCompanyId,
          externalId: "INV-001",
          type: "SATIŞ",
          issueDate: new Date("2024-01-01"),
          totalAmount: 1000,
          currency: "TRY",
          taxAmount: 180,
          counterpartyName: "Existing Company",
          counterpartyTaxNumber: "1111111111",
          status: "kesildi",
          source: "manual",
        },
      });

      // Analyze with unusually high amount
      const result = await counterpartyAnalysisService.analyzeCounterparty(
        testTenantId,
        testClientCompanyId,
        "Existing Company",
        "1111111111",
        5000, // 5x the average
        new Date("2024-01-15")
      );

      expect(result.isNewCounterparty).toBe(false);
      expect(result.isUnusualCounterparty).toBe(true);
      expect(result.unusualPatterns.length).toBeGreaterThan(0);
    });
  });

  describe("getCounterpartyHistory", () => {
    it("should return null for non-existent counterparty", async () => {
      const history = await counterpartyAnalysisService.getCounterpartyHistory(
        testTenantId,
        testClientCompanyId,
        "Non-existent",
        null
      );

      expect(history).toBeNull();
    });

    it("should return history for existing counterparty", async () => {
      // Create invoices with same counterparty
      await prisma.invoice.create({
        data: {
          tenantId: testTenantId,
          clientCompanyId: testClientCompanyId,
          externalId: "INV-001",
          type: "SATIŞ",
          issueDate: new Date("2024-01-01"),
          totalAmount: 1000,
          currency: "TRY",
          taxAmount: 180,
          counterpartyName: "Test Company",
          counterpartyTaxNumber: "9999999999",
          status: "kesildi",
          source: "manual",
        },
      });

      await prisma.invoice.create({
        data: {
          tenantId: testTenantId,
          clientCompanyId: testClientCompanyId,
          externalId: "INV-002",
          type: "SATIŞ",
          issueDate: new Date("2024-01-15"),
          totalAmount: 2000,
          currency: "TRY",
          taxAmount: 360,
          counterpartyName: "Test Company",
          counterpartyTaxNumber: "9999999999",
          status: "kesildi",
          source: "manual",
        },
      });

      const history = await counterpartyAnalysisService.getCounterpartyHistory(
        testTenantId,
        testClientCompanyId,
        "Test Company",
        "9999999999"
      );

      expect(history).not.toBeNull();
      expect(history?.transactionCount).toBe(2);
      expect(history?.totalAmount).toBe(3000);
      expect(history?.averageAmount).toBe(1500);
    });
  });
});

