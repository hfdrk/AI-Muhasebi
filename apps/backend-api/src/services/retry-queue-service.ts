/**
 * Retry Queue Service
 * 
 * Handles retry logic for failed operations (emails, jobs, etc.)
 */

import { prisma } from "../lib/prisma";
import { logger } from "@repo/shared-utils";

export interface RetryQueueItem {
  id: string;
  type: "email" | "job" | "sync";
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date;
  status: "pending" | "processing" | "failed" | "success";
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class RetryQueueService {
  /**
   * Add item to retry queue
   */
  async enqueue(
    type: "email" | "job" | "sync",
    payload: Record<string, unknown>,
    maxAttempts: number = 3,
    delayMs: number = 60000 // 1 minute default
  ): Promise<string> {
    const nextRetryAt = new Date(Date.now() + delayMs);

    const item = await prisma.retryQueue.create({
      data: {
        type,
        payload: payload as any,
        attempts: 0,
        maxAttempts,
        nextRetryAt,
        status: "pending",
      },
    });

    return item.id;
  }

  /**
   * Process pending retry items
   */
  async processPendingItems(): Promise<void> {
    const now = new Date();

    // Find items ready to retry
    const items = await prisma.retryQueue.findMany({
      where: {
        status: "pending",
        nextRetryAt: {
          lte: now,
        },
      },
      take: 10, // Process 10 at a time
      orderBy: {
        nextRetryAt: "asc",
      },
    });

    for (const item of items) {
      await this.processItem(item.id);
    }
  }

  /**
   * Process a single retry item
   */
  private async processItem(itemId: string): Promise<void> {
    const item = await prisma.retryQueue.findUnique({
      where: { id: itemId },
    });

    if (!item || item.status !== "pending") {
      return;
    }

    // Mark as processing
    await prisma.retryQueue.update({
      where: { id: itemId },
      data: { status: "processing" },
    });

    try {
      // Execute based on type
      let success = false;

      switch (item.type) {
        case "email":
          success = await this.retryEmail(item.payload);
          break;
        case "job":
          success = await this.retryJob(item.payload);
          break;
        case "sync":
          success = await this.retrySync(item.payload);
          break;
      }

      if (success) {
        // Mark as success
        await prisma.retryQueue.update({
          where: { id: itemId },
          data: {
            status: "success",
            attempts: item.attempts + 1,
          },
        });
      } else {
        // Check if we've exceeded max attempts
        if (item.attempts + 1 >= item.maxAttempts) {
          await prisma.retryQueue.update({
            where: { id: itemId },
            data: {
              status: "failed",
              attempts: item.attempts + 1,
              error: "Max retry attempts exceeded",
            },
          });
        } else {
          // Schedule next retry with exponential backoff
          const delayMs = Math.min(60000 * Math.pow(2, item.attempts), 3600000); // Max 1 hour
          const nextRetryAt = new Date(Date.now() + delayMs);

          await prisma.retryQueue.update({
            where: { id: itemId },
            data: {
              status: "pending",
              attempts: item.attempts + 1,
              nextRetryAt,
            },
          });
        }
      }
    } catch (error: any) {
      // Handle error
      if (item.attempts + 1 >= item.maxAttempts) {
        await prisma.retryQueue.update({
          where: { id: itemId },
          data: {
            status: "failed",
            attempts: item.attempts + 1,
            error: error.message || "Unknown error",
          },
        });
      } else {
        const delayMs = Math.min(60000 * Math.pow(2, item.attempts), 3600000);
        const nextRetryAt = new Date(Date.now() + delayMs);

        await prisma.retryQueue.update({
          where: { id: itemId },
          data: {
            status: "pending",
            attempts: item.attempts + 1,
            nextRetryAt,
            error: error.message || "Unknown error",
          },
        });
      }
    }
  }

  /**
   * Retry email sending
   */
  private async retryEmail(payload: Record<string, unknown>): Promise<boolean> {
    try {
      const { emailService } = await import("./email-service");
      await emailService.sendEmail(payload as any);
      return true;
    } catch (error) {
      logger.error("[RetryQueue] Email retry failed:", { error });
      return false;
    }
  }

  /**
   * Retry job execution
   */
  private async retryJob(payload: Record<string, unknown>): Promise<boolean> {
    try {
      const jobType = payload.jobType as string;
      const tenantId = payload.tenantId as string;

      if (!jobType || !tenantId) {
        logger.error("[RetryQueue] Invalid job payload: missing jobType or tenantId", { payload });
        return false;
      }

      // Import processors dynamically to avoid circular dependencies
      switch (jobType) {
        case "DOCUMENT_PROCESSING": {
          const { documentProcessor } = await import("../../../worker-jobs/src/processors/document-processor");
          const documentId = payload.documentId as string;
          if (!documentId) {
            logger.error("[RetryQueue] Invalid document job payload: missing documentId", { payload });
            return false;
          }
          await documentProcessor.processDocument(tenantId, documentId);
          return true;
        }

        case "RISK_CALCULATION": {
          const { riskCalculationProcessor } = await import("../../../worker-jobs/src/processors/risk-calculation-processor");
          const entityType = payload.entityType as string;
          const entityId = payload.entityId as string;

          if (!entityType || !entityId) {
            logger.error("[RetryQueue] Invalid risk calculation job payload: missing entityType or entityId", { payload });
            return false;
          }

          if (entityType === "document") {
            await riskCalculationProcessor.processDocumentRiskCalculation(tenantId, entityId);
          } else if (entityType === "company") {
            await riskCalculationProcessor.processCompanyRiskCalculation(tenantId, entityId);
          } else {
            logger.error("[RetryQueue] Unknown entity type for risk calculation", { entityType });
            return false;
          }
          return true;
        }

        default:
          logger.warn(`[RetryQueue] Unknown job type: ${jobType}`);
          return false;
      }
    } catch (error: any) {
      logger.error("[RetryQueue] Job retry failed:", { error });
      return false;
    }
  }

  /**
   * Retry sync operation
   */
  private async retrySync(payload: Record<string, unknown>): Promise<boolean> {
    try {
      const jobId = payload.jobId as string;

      if (!jobId) {
        logger.error("[RetryQueue] Invalid sync payload: missing jobId", { payload });
        return false;
      }

      // Import integration sync processor dynamically
      const { integrationSyncProcessor } = await import("../../../worker-jobs/src/processors/integration-sync-processor");
      await integrationSyncProcessor.processSyncJob(jobId);
      return true;
    } catch (error: any) {
      logger.error("[RetryQueue] Sync retry failed:", { error });
      return false;
    }
  }

  /**
   * Get retry queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    success: number;
  }> {
    const [pending, processing, failed, success] = await Promise.all([
      prisma.retryQueue.count({ where: { status: "pending" } }),
      prisma.retryQueue.count({ where: { status: "processing" } }),
      prisma.retryQueue.count({ where: { status: "failed" } }),
      prisma.retryQueue.count({ where: { status: "success" } }),
    ]);

    return { pending, processing, failed, success };
  }
}

export const retryQueueService = new RetryQueueService();

