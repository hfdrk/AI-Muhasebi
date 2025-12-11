/**
 * Retry Queue Service (Worker)
 * 
 * Handles retry logic for failed operations
 */

import { prisma } from "../lib/prisma";

export class RetryQueueService {
  /**
   * Add item to retry queue
   */
  async enqueue(
    type: "email" | "job" | "sync",
    payload: Record<string, unknown>,
    maxAttempts: number = 3,
    delayMs: number = 60000
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

    const items = await prisma.retryQueue.findMany({
      where: {
        status: "pending",
        nextRetryAt: {
          lte: now,
        },
      },
      take: 10,
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

    await prisma.retryQueue.update({
      where: { id: itemId },
      data: { status: "processing" },
    });

    try {
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
        await prisma.retryQueue.update({
          where: { id: itemId },
          data: {
            status: "success",
            attempts: item.attempts + 1,
          },
        });
      } else {
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
          const delayMs = Math.min(60000 * Math.pow(2, item.attempts), 3600000);
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

  private async retryEmail(payload: Record<string, unknown>): Promise<boolean> {
    try {
      const { emailService } = await import("./email-service");
      
      // Reconstruct attachments if present
      const emailPayload: any = { ...payload };
      if (payload.attachments && Array.isArray(payload.attachments)) {
        emailPayload.attachments = payload.attachments.map((a: any) => ({
          filename: a.filename,
          content: Buffer.from(a.content, "base64"),
          contentType: a.contentType,
        }));
      }
      
      await emailService.sendEmail(emailPayload);
      return true;
    } catch (error) {
      console.error("[RetryQueue] Email retry failed:", error);
      return false;
    }
  }

  private async retryJob(payload: Record<string, unknown>): Promise<boolean> {
    console.warn("[RetryQueue] Job retry not yet implemented");
    return false;
  }

  private async retrySync(payload: Record<string, unknown>): Promise<boolean> {
    console.warn("[RetryQueue] Sync retry not yet implemented");
    return false;
  }
}

export const retryQueueService = new RetryQueueService();

