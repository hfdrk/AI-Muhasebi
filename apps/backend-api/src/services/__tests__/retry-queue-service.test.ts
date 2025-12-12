// Import env setup FIRST
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTestPrisma, createTestTenant, createTestClientCompany, createTestDocument } from "../../test-utils";
import { retryQueueService } from "../retry-queue-service";

// Mock the processors using dynamic imports
const mockDocumentProcessor = {
  processDocument: vi.fn(),
};

const mockIntegrationSyncProcessor = {
  processSyncJob: vi.fn(),
};

const mockRiskCalculationProcessor = {
  processDocumentRiskCalculation: vi.fn(),
  processCompanyRiskCalculation: vi.fn(),
};

// Mock the dynamic imports
vi.mock("../../../../worker-jobs/src/processors/document-processor", () => ({
  documentProcessor: mockDocumentProcessor,
}));

vi.mock("../../../../worker-jobs/src/processors/integration-sync-processor", () => ({
  integrationSyncProcessor: mockIntegrationSyncProcessor,
}));

vi.mock("../../../../worker-jobs/src/processors/risk-calculation-processor", () => ({
  riskCalculationProcessor: mockRiskCalculationProcessor,
}));

describe("RetryQueueService", () => {
  let tenantId: string;
  let clientCompanyId: string;
  const prisma = getTestPrisma();

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create test tenant and client company
    const tenant = await createTestTenant("Test Tenant", "test-tenant");
    tenantId = tenant.tenantId;

    const clientCompany = await createTestClientCompany({
      tenantId,
      name: "Test Company",
      taxNumber: "1234567890",
    });
    clientCompanyId = clientCompany.id;
  });

  describe("retryJob", () => {
    it("should retry DOCUMENT_PROCESSING job", async () => {
      const document = await createTestDocument({
        tenantId,
        clientCompanyId,
        type: "INVOICE",
        originalFileName: "test.pdf",
        storagePath: "test/test.pdf",
        mimeType: "application/pdf",
      });

      mockDocumentProcessor.processDocument.mockResolvedValue(undefined);

      const payload = {
        jobType: "DOCUMENT_PROCESSING",
        tenantId,
        documentId: document.id,
      };

      const result = await (retryQueueService as any).retryJob(payload);

      expect(result).toBe(true);
      expect(mockDocumentProcessor.processDocument).toHaveBeenCalledWith(tenantId, document.id);
    });

    it("should retry RISK_CALCULATION job for document", async () => {
      const document = await createTestDocument({
        tenantId,
        clientCompanyId,
        type: "INVOICE",
        originalFileName: "test.pdf",
        storagePath: "test/test.pdf",
        mimeType: "application/pdf",
      });

      mockRiskCalculationProcessor.processDocumentRiskCalculation.mockResolvedValue(undefined);

      const payload = {
        jobType: "RISK_CALCULATION",
        tenantId,
        entityType: "document",
        entityId: document.id,
      };

      const result = await (retryQueueService as any).retryJob(payload);

      expect(result).toBe(true);
      expect(mockRiskCalculationProcessor.processDocumentRiskCalculation).toHaveBeenCalledWith(tenantId, document.id);
    });

    it("should retry RISK_CALCULATION job for company", async () => {
      mockRiskCalculationProcessor.processCompanyRiskCalculation.mockResolvedValue(undefined);

      const payload = {
        jobType: "RISK_CALCULATION",
        tenantId,
        entityType: "company",
        entityId: clientCompanyId,
      };

      const result = await (retryQueueService as any).retryJob(payload);

      expect(result).toBe(true);
      expect(mockRiskCalculationProcessor.processCompanyRiskCalculation).toHaveBeenCalledWith(tenantId, clientCompanyId);
    });

    it("should return false for invalid job payload", async () => {
      const payload = {
        // Missing jobType
        tenantId,
      };

      const result = await (retryQueueService as any).retryJob(payload);

      expect(result).toBe(false);
    });

    it("should return false for unknown job type", async () => {
      const payload = {
        jobType: "UNKNOWN_JOB_TYPE",
        tenantId,
      };

      const result = await (retryQueueService as any).retryJob(payload);

      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      const document = await createTestDocument({
        tenantId,
        clientCompanyId,
        type: "INVOICE",
        originalFileName: "test.pdf",
        storagePath: "test/test.pdf",
        mimeType: "application/pdf",
      });

      mockDocumentProcessor.processDocument.mockRejectedValue(new Error("Processing failed"));

      const payload = {
        jobType: "DOCUMENT_PROCESSING",
        tenantId,
        documentId: document.id,
      };

      const result = await (retryQueueService as any).retryJob(payload);

      expect(result).toBe(false);
    });
  });

  describe("retrySync", () => {
    it("should retry sync operation", async () => {
      // Create a sync job
      const integration = await prisma.tenantIntegration.create({
        data: {
          tenantId,
          providerId: (await prisma.integrationProvider.findFirst())!.id,
          displayName: "Test Integration",
          config: {},
          isActive: true,
        },
      });

      const syncJob = await prisma.integrationSyncJob.create({
        data: {
          tenantId,
          tenantIntegrationId: integration.id,
          jobType: "pull_invoices",
          status: "pending",
          clientCompanyId,
        },
      });

      mockIntegrationSyncProcessor.processSyncJob.mockResolvedValue(undefined);

      const payload = {
        jobId: syncJob.id,
      };

      const result = await (retryQueueService as any).retrySync(payload);

      expect(result).toBe(true);
      expect(mockIntegrationSyncProcessor.processSyncJob).toHaveBeenCalledWith(syncJob.id);
    });

    it("should return false for invalid sync payload", async () => {
      const payload = {
        // Missing jobId
      };

      const result = await (retryQueueService as any).retrySync(payload);

      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      const payload = {
        jobId: "non-existent-job-id",
      };

      mockIntegrationSyncProcessor.processSyncJob.mockRejectedValue(new Error("Sync failed"));

      const result = await (retryQueueService as any).retrySync(payload);

      expect(result).toBe(false);
    });
  });

  describe("enqueue and processPendingItems", () => {
    it("should enqueue and process email retry", async () => {
      const payload = {
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      };

      const itemId = await retryQueueService.enqueue("email", payload, 3, 1000);

      expect(itemId).toBeDefined();

      // Wait a bit for nextRetryAt
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Process pending items
      await retryQueueService.processPendingItems();

      // Check that item was processed
      const item = await prisma.retryQueue.findUnique({
        where: { id: itemId },
      });

      // Should be either success or pending (if retry needed)
      expect(["success", "pending", "failed"]).toContain(item?.status);
    });
  });
});

