// Import env setup FIRST
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach, vi } from "vitest";
import { eFaturaService } from "../e-fatura-service";
import { getTestPrisma, createTestUser, createTestClientCompany, createTestInvoice } from "../../test-utils";

// Mock ETA connector - use vi.mock with factory
vi.mock("../../integrations/connectors/eta-connector", async () => {
  const actual = await vi.importActual("../../integrations/connectors/eta-connector");
  return {
    ...actual,
    ETAConnector: vi.fn().mockImplementation(() => ({
      testConnection: vi.fn().mockResolvedValue({ success: true }),
      pushInvoices: vi.fn().mockResolvedValue([
        {
          success: true,
          externalId: "GIB-12345",
          message: "Fatura başarıyla gönderildi.",
        },
      ]),
      fetchInvoices: vi.fn().mockResolvedValue([]),
    })),
  };
});

describe("EFaturaService", () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let testCompany: Awaited<ReturnType<typeof createTestClientCompany>>;
  let testInvoice: Awaited<ReturnType<typeof createTestInvoice>>;

  beforeEach(async () => {
    testUser = await createTestUser();
    testCompany = await createTestClientCompany({
      tenantId: testUser.tenant.id,
    });
    testInvoice = await createTestInvoice({
      tenantId: testUser.tenant.id,
      clientCompanyId: testCompany.id,
      status: "kesildi",
    });
  });

  describe("submitInvoice", () => {
    it("should submit invoice to E-Fatura system successfully", async () => {
      // Create tenant integration for ETA
      const prisma = getTestPrisma();
      const provider = await prisma.integrationProvider.upsert({
        where: { code: "ETA" },
        update: {},
        create: {
          code: "ETA",
          name: "E-Fatura",
          type: "accounting",
          configSchema: {},
        },
      });

      await prisma.tenantIntegration.create({
        data: {
          tenantId: testUser.tenant.id,
          providerId: provider.id,
          status: "active",
          displayName: "E-Fatura Integration",
          config: {
            username: "test-user",
            password: "test-pass",
          },
        },
      });

      const result = await eFaturaService.submitInvoice(
        testUser.tenant.id,
        testInvoice.id,
        {}
      );

      expect(result.success).toBe(true);
      expect(result.externalId).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it("should throw error if invoice not found", async () => {
      await expect(
        eFaturaService.submitInvoice(
          testUser.tenant.id,
          "non-existent-id",
          {}
        )
      ).rejects.toThrow("Fatura bulunamadı");
    });

    it("should throw error if ETA integration not found", async () => {
      await expect(
        eFaturaService.submitInvoice(
          testUser.tenant.id,
          testInvoice.id,
          {}
        )
      ).rejects.toThrow("ETA entegrasyonu bulunamadı");
    });
  });

  describe("checkInvoiceStatus", () => {
    it("should check invoice status in E-Fatura system", async () => {
      // Create tenant integration
      const prisma = getTestPrisma();
      const provider = await prisma.integrationProvider.upsert({
        where: { code: "ETA" },
        update: {},
        create: {
          code: "ETA",
          name: "E-Fatura",
          type: "accounting",
          configSchema: {},
        },
      });

      await prisma.tenantIntegration.create({
        data: {
          tenantId: testUser.tenant.id,
          providerId: provider.id,
          status: "active",
          displayName: "E-Fatura Integration",
          config: {},
        },
      });

      // Submit invoice first to set up metadata
      await eFaturaService.submitInvoice(
        testUser.tenant.id,
        testInvoice.id,
        {}
      );

      const result = await eFaturaService.checkInvoiceStatus(
        testUser.tenant.id,
        testInvoice.id
      );

      expect(result.status).toBeDefined();
      expect(result.externalId).toBeDefined();
    });
  });
});

