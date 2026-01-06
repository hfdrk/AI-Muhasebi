import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { IntegrationSyncProcessor } from "../integration-sync-processor";

// Mock dependencies
vi.mock("../../lib/prisma", () => ({
  prisma: {
    integrationSyncJob: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    tenantIntegration: {
      update: vi.fn(),
    },
    integrationSyncLog: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    userTenantMembership: {
      findMany: vi.fn(),
    },
    emailLog: {
      create: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../../integrations/connectors/connector-registry", () => ({
  connectorRegistry: {
    getConnector: vi.fn(),
  },
}));

vi.mock("../../integrations/importers/invoice-importer", () => ({
  InvoiceImporter: vi.fn().mockImplementation(() => ({
    importInvoices: vi.fn().mockResolvedValue({
      created: 5,
      updated: 2,
      skipped: 1,
      errors: [],
    }),
  })),
}));

vi.mock("../../integrations/importers/bank-transaction-importer", () => ({
  BankTransactionImporter: vi.fn().mockImplementation(() => ({
    importTransactions: vi.fn().mockResolvedValue({
      created: 10,
      updated: 3,
      skipped: 0,
      errors: [],
    }),
  })),
}));

describe("IntegrationSyncProcessor", () => {
  let processor: IntegrationSyncProcessor;

  const mockJob = {
    id: "job_123",
    tenantId: "tenant_123",
    tenantIntegrationId: "integration_123",
    clientCompanyId: null,
    jobType: "pull_invoices",
    status: "pending",
    errorMessage: null,
    retryCount: 0,
    maxRetries: 3,
    tenantIntegration: {
      id: "integration_123",
      displayName: "Test Integration",
      config: {},
      lastSyncAt: null,
      provider: {
        id: "provider_123",
        name: "Test Provider",
        code: "test_provider",
        type: "accounting",
      },
    },
  };

  const mockConnector = {
    fetchInvoices: vi.fn().mockResolvedValue([
      {
        invoiceNumber: "INV-001",
        date: new Date(),
        totalAmount: 1000,
        currency: "TRY",
      },
    ]),
    fetchTransactions: vi.fn().mockResolvedValue([]),
    pushInvoices: vi.fn().mockResolvedValue([{ success: true }]),
    pushTransactions: vi.fn().mockResolvedValue([{ success: true }]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new IntegrationSyncProcessor();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("processSyncJob", () => {
    it("should skip jobs that are not pending or retry status", async () => {
      const { prisma } = await import("../../lib/prisma");
      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue({
        ...mockJob,
        status: "success",
      } as any);

      await processor.processSyncJob("job_123");

      // Should not update job to in_progress
      expect(prisma.integrationSyncJob.update).not.toHaveBeenCalled();
    });

    it("should throw error if job not found", async () => {
      const { prisma } = await import("../../lib/prisma");
      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(null);

      await expect(processor.processSyncJob("job_123")).rejects.toThrow(
        "Sync job job_123 not found"
      );
    });

    it("should process pull_invoices job successfully", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(mockJob as any);
      vi.mocked(connectorRegistry.getConnector).mockReturnValue(mockConnector as any);

      await processor.processSyncJob("job_123");

      // Should mark job in progress
      expect(prisma.integrationSyncJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "job_123" },
          data: expect.objectContaining({ status: "in_progress" }),
        })
      );

      // Should log job start
      expect(prisma.integrationSyncLog.create).toHaveBeenCalled();

      // Should call connector
      expect(mockConnector.fetchInvoices).toHaveBeenCalled();
    });

    it("should process pull_bank_transactions job successfully", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      const bankJob = {
        ...mockJob,
        jobType: "pull_bank_transactions",
        tenantIntegration: {
          ...mockJob.tenantIntegration,
          provider: {
            ...mockJob.tenantIntegration.provider,
            type: "bank",
          },
        },
      };

      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(bankJob as any);
      vi.mocked(connectorRegistry.getConnector).mockReturnValue(mockConnector as any);

      await processor.processSyncJob("job_123");

      expect(mockConnector.fetchTransactions).toHaveBeenCalled();
    });

    it("should handle unknown job type", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      const unknownJob = {
        ...mockJob,
        jobType: "unknown_type",
      };

      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(unknownJob as any);
      vi.mocked(connectorRegistry.getConnector).mockReturnValue(mockConnector as any);

      await expect(processor.processSyncJob("job_123")).rejects.toThrow(
        "Unknown job type: unknown_type"
      );
    });
  });

  describe("Error Handling and Retries", () => {
    it("should retry on retryable errors", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      const failingConnector = {
        ...mockConnector,
        fetchInvoices: vi.fn().mockRejectedValue(new Error("Network timeout")),
      };

      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(mockJob as any);
      vi.mocked(connectorRegistry.getConnector).mockReturnValue(failingConnector as any);
      vi.mocked(prisma.userTenantMembership.findMany).mockResolvedValue([]);

      await expect(processor.processSyncJob("job_123")).rejects.toThrow("Network timeout");

      // Should schedule retry
      expect(prisma.integrationSyncJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "retry",
            retryCount: 1,
          }),
        })
      );
    });

    it("should not retry on non-retryable errors", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      const failingConnector = {
        ...mockConnector,
        fetchInvoices: vi.fn().mockRejectedValue(new Error("Authentication failed")),
      };

      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(mockJob as any);
      vi.mocked(connectorRegistry.getConnector).mockReturnValue(failingConnector as any);
      vi.mocked(prisma.userTenantMembership.findMany).mockResolvedValue([]);

      await expect(processor.processSyncJob("job_123")).rejects.toThrow("Authentication failed");

      // Should mark as failed, not retry
      expect(prisma.integrationSyncJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "failed",
          }),
        })
      );
    });

    it("should fail after max retries exceeded", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      const maxRetriedJob = {
        ...mockJob,
        retryCount: 3, // Max retries
      };

      const failingConnector = {
        ...mockConnector,
        fetchInvoices: vi.fn().mockRejectedValue(new Error("Server error")),
      };

      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(maxRetriedJob as any);
      vi.mocked(connectorRegistry.getConnector).mockReturnValue(failingConnector as any);
      vi.mocked(prisma.userTenantMembership.findMany).mockResolvedValue([]);

      await expect(processor.processSyncJob("job_123")).rejects.toThrow("Server error");

      // Should mark as failed
      expect(prisma.integrationSyncJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "failed",
          }),
        })
      );
    });
  });

  describe("Push Operations", () => {
    it("should push invoices successfully", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      const pushJob = {
        ...mockJob,
        jobType: "push_invoices",
      };

      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(pushJob as any);
      vi.mocked(connectorRegistry.getConnector).mockReturnValue(mockConnector as any);
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        {
          id: "inv_1",
          totalAmount: 1000,
          issueDate: new Date(),
          currency: "TRY",
          taxAmount: 180,
          status: "kesildi",
          type: "SATIŞ",
          lines: [],
        },
      ] as any);

      await processor.processSyncJob("job_123");

      expect(mockConnector.pushInvoices).toHaveBeenCalled();
      expect(prisma.invoice.updateMany).toHaveBeenCalled();
    });

    it("should handle no invoices to push", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      const pushJob = {
        ...mockJob,
        jobType: "push_invoices",
      };

      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(pushJob as any);
      vi.mocked(connectorRegistry.getConnector).mockReturnValue(mockConnector as any);
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);

      await processor.processSyncJob("job_123");

      // Should log that no invoices found
      expect(prisma.integrationSyncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            message: expect.stringContaining("bulunamadı"),
          }),
        })
      );

      // Should not call push
      expect(mockConnector.pushInvoices).not.toHaveBeenCalled();
    });

    it("should throw if connector does not support push", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      const pushJob = {
        ...mockJob,
        jobType: "push_invoices",
      };

      const connectorWithoutPush = {
        fetchInvoices: vi.fn(),
        // No pushInvoices method
      };

      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(pushJob as any);
      vi.mocked(connectorRegistry.getConnector).mockReturnValue(connectorWithoutPush as any);
      vi.mocked(prisma.userTenantMembership.findMany).mockResolvedValue([]);

      await expect(processor.processSyncJob("job_123")).rejects.toThrow(
        "Connector does not support push invoices"
      );
    });
  });

  describe("Notifications", () => {
    it("should send failure notification to tenant owners", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      const maxRetriedJob = {
        ...mockJob,
        retryCount: 3,
      };

      const failingConnector = {
        ...mockConnector,
        fetchInvoices: vi.fn().mockRejectedValue(new Error("Server error")),
      };

      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(maxRetriedJob as any);
      vi.mocked(connectorRegistry.getConnector).mockReturnValue(failingConnector as any);
      vi.mocked(prisma.userTenantMembership.findMany).mockResolvedValue([
        { user: { email: "owner@example.com" } },
      ] as any);

      await expect(processor.processSyncJob("job_123")).rejects.toThrow();

      // Should create in-app notification
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "INTEGRATION_SYNC",
            title: "Entegrasyon senkronizasyon hatası",
          }),
        })
      );

      // Should queue email notification
      expect(prisma.emailLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            to: ["owner@example.com"],
            templateId: "integration_sync_failure",
          }),
        })
      );
    });
  });

  describe("processRetryJobs", () => {
    it("should process due retry jobs", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      vi.mocked(prisma.integrationSyncJob.findMany).mockResolvedValue([
        { id: "job_1" },
        { id: "job_2" },
      ] as any);

      // Mock for each job processing
      vi.mocked(prisma.integrationSyncJob.findUnique)
        .mockResolvedValueOnce({ ...mockJob, id: "job_1" } as any)
        .mockResolvedValueOnce({ ...mockJob, id: "job_2" } as any);

      vi.mocked(connectorRegistry.getConnector).mockReturnValue(mockConnector as any);

      const processedCount = await processor.processRetryJobs();

      expect(processedCount).toBe(2);
      expect(prisma.integrationSyncJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "job_1" },
          data: { status: "pending" },
        })
      );
    });

    it("should handle individual job failures in batch", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      vi.mocked(prisma.integrationSyncJob.findMany).mockResolvedValue([
        { id: "job_1" },
        { id: "job_2" },
      ] as any);

      // First job fails, second succeeds
      vi.mocked(prisma.integrationSyncJob.findUnique)
        .mockResolvedValueOnce(null) // job_1 not found
        .mockResolvedValueOnce({ ...mockJob, id: "job_2" } as any);

      vi.mocked(connectorRegistry.getConnector).mockReturnValue(mockConnector as any);

      const processedCount = await processor.processRetryJobs();

      // Only second job should be counted as processed
      expect(processedCount).toBe(1);
    });
  });

  describe("Date Range Calculation", () => {
    it("should use lastSyncAt as sinceDate when available", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      const lastSyncAt = new Date("2024-01-01");
      const jobWithLastSync = {
        ...mockJob,
        tenantIntegration: {
          ...mockJob.tenantIntegration,
          lastSyncAt,
        },
      };

      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(jobWithLastSync as any);
      vi.mocked(connectorRegistry.getConnector).mockReturnValue(mockConnector as any);

      await processor.processSyncJob("job_123");

      // Connector should be called with lastSyncAt as sinceDate
      expect(mockConnector.fetchInvoices).toHaveBeenCalledWith(
        lastSyncAt,
        expect.any(Date),
        expect.any(Object)
      );
    });

    it("should use 30 days ago when no lastSyncAt", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(mockJob as any);
      vi.mocked(connectorRegistry.getConnector).mockReturnValue(mockConnector as any);

      const beforeCall = Date.now();
      await processor.processSyncJob("job_123");
      const afterCall = Date.now();

      const expectedMinDate = new Date(beforeCall - 30 * 24 * 60 * 60 * 1000);

      // Check that sinceDate is approximately 30 days ago
      const callArgs = mockConnector.fetchInvoices.mock.calls[0];
      const actualSinceDate = callArgs[0] as Date;

      expect(actualSinceDate.getTime()).toBeGreaterThanOrEqual(expectedMinDate.getTime() - 1000);
      expect(actualSinceDate.getTime()).toBeLessThanOrEqual(afterCall - 30 * 24 * 60 * 60 * 1000 + 1000);
    });
  });

  describe("Connector Selection", () => {
    it("should throw if connector not found", async () => {
      const { prisma } = await import("../../lib/prisma");
      const { connectorRegistry } = await import(
        "../../integrations/connectors/connector-registry"
      );

      vi.mocked(prisma.integrationSyncJob.findUnique).mockResolvedValue(mockJob as any);
      vi.mocked(connectorRegistry.getConnector).mockReturnValue(null);
      vi.mocked(prisma.userTenantMembership.findMany).mockResolvedValue([]);

      await expect(processor.processSyncJob("job_123")).rejects.toThrow(
        "Connector not found for provider test_provider (accounting)"
      );
    });
  });
});
