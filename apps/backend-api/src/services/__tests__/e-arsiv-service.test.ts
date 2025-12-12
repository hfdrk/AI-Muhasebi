// Import env setup FIRST
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import { eArsivService } from "../e-arsiv-service";
import { getTestPrisma, createTestUser, createTestClientCompany, createTestInvoice } from "../../test-utils";

describe("EArsivService", () => {
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

  describe("archiveInvoice", () => {
    it("should archive invoice to E-Arşiv", async () => {
      const result = await eArsivService.archiveInvoice(
        testUser.tenant.id,
        testInvoice.id
      );

      expect(result.success).toBeDefined();
      expect(result.archivedAt).toBeDefined();
      expect(result.archiveId).toBeDefined();
    });

    it("should throw error if invoice not found", async () => {
      await expect(
        eArsivService.archiveInvoice(
          testUser.tenant.id,
          "non-existent-id"
        )
      ).rejects.toThrow();
    });
  });

  describe("searchArchivedInvoices", () => {
    it("should search archived invoices", async () => {
      const result = await eArsivService.searchArchivedInvoices(
        testUser.tenant.id,
        {
          startDate: new Date(2024, 0, 1),
          endDate: new Date(2024, 11, 31),
        }
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });
});

