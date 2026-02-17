import { logger } from "@repo/shared-utils";

/**
 * BullMQ Queue Service
 *
 * Provides a Redis-backed job queue using BullMQ.
 * Falls back to database polling if Redis/BullMQ is unavailable.
 *
 * Required packages (optional peer deps):
 *   npm install bullmq ioredis
 *
 * Required env vars:
 *   REDIS_URL=redis://localhost:6379
 *   USE_BULLMQ=true  (opt-in, defaults to false for backwards compatibility)
 */

interface QueueJobData {
  tenantId: string;
  [key: string]: any;
}

interface QueueConfig {
  name: string;
  concurrency?: number;
  maxRetries?: number;
  backoffType?: "exponential" | "fixed";
  backoffDelay?: number;
}

let bullmqAvailable: boolean | null = null;
const queues = new Map<string, any>();
const workers = new Map<string, any>();

/**
 * Check if BullMQ should be used (opt-in via environment variable)
 */
function shouldUseBullMQ(): boolean {
  return process.env.USE_BULLMQ === "true" && !!process.env.REDIS_URL;
}

/**
 * Get or create a Redis connection for BullMQ
 */
async function getRedisConnection() {
  try {
    const { default: IORedis } = await import("ioredis");
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    return new IORedis(redisUrl, { maxRetriesPerRequest: null });
  } catch {
    throw new Error("ioredis package is required for BullMQ. Install with: npm install ioredis");
  }
}

/**
 * Create a BullMQ queue for dispatching jobs
 */
export async function createQueue(config: QueueConfig) {
  if (!shouldUseBullMQ()) {
    logger.info(`[QueueService] BullMQ disabled — queue '${config.name}' will use DB polling`);
    return null;
  }

  if (queues.has(config.name)) {
    return queues.get(config.name);
  }

  try {
    const { Queue } = await import("bullmq");
    const connection = await getRedisConnection();

    const queue = new Queue(config.name, {
      connection,
      defaultJobOptions: {
        attempts: config.maxRetries ?? 3,
        backoff: {
          type: config.backoffType ?? "exponential",
          delay: config.backoffDelay ?? 1000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });

    queues.set(config.name, queue);
    logger.info(`[QueueService] BullMQ queue '${config.name}' created`);
    return queue;
  } catch (error) {
    logger.warn(`[QueueService] Failed to create BullMQ queue '${config.name}', falling back to DB polling`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Create a BullMQ worker that processes jobs from a queue
 */
export async function createWorker(
  config: QueueConfig,
  processor: (job: { id: string; data: QueueJobData }) => Promise<void>
) {
  if (!shouldUseBullMQ()) {
    return null;
  }

  if (workers.has(config.name)) {
    return workers.get(config.name);
  }

  try {
    const { Worker } = await import("bullmq");
    const connection = await getRedisConnection();

    const worker = new Worker(
      config.name,
      async (job) => {
        await processor({ id: job.id!, data: job.data });
      },
      {
        connection,
        concurrency: config.concurrency ?? 5,
      }
    );

    worker.on("completed", (job) => {
      logger.info(`[QueueService] Job ${job.id} completed in queue '${config.name}'`);
    });

    worker.on("failed", (job, error) => {
      logger.error(`[QueueService] Job ${job?.id} failed in queue '${config.name}'`, {
        error: error.message,
        attempts: job?.attemptsMade,
      });
    });

    workers.set(config.name, worker);
    logger.info(`[QueueService] BullMQ worker for '${config.name}' started (concurrency: ${config.concurrency ?? 5})`);
    return worker;
  } catch (error) {
    logger.warn(`[QueueService] Failed to create BullMQ worker for '${config.name}'`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Add a job to a queue. Falls back to returning false if queue isn't available.
 */
export async function addJob(queueName: string, data: QueueJobData, options?: { priority?: number; delay?: number }): Promise<boolean> {
  const queue = queues.get(queueName);
  if (!queue) return false;

  try {
    await queue.add(queueName, data, {
      priority: options?.priority,
      delay: options?.delay,
    });
    return true;
  } catch (error) {
    logger.error(`[QueueService] Failed to add job to queue '${queueName}'`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Gracefully shut down all queues and workers
 */
export async function shutdownQueues(): Promise<void> {
  logger.info("[QueueService] Shutting down queues and workers...");

  for (const [name, worker] of workers) {
    try {
      await worker.close();
      logger.info(`[QueueService] Worker '${name}' closed`);
    } catch (error) {
      logger.error(`[QueueService] Error closing worker '${name}'`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const [name, queue] of queues) {
    try {
      await queue.close();
      logger.info(`[QueueService] Queue '${name}' closed`);
    } catch (error) {
      logger.error(`[QueueService] Error closing queue '${name}'`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  workers.clear();
  queues.clear();
}

// Queue names as constants
export const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: "document-processing",
  INTEGRATION_SYNC: "integration-sync",
  SCHEDULED_REPORTS: "scheduled-reports",
  RISK_CALCULATION: "risk-calculation",
  EMAIL_DELIVERY: "email-delivery",
} as const;
