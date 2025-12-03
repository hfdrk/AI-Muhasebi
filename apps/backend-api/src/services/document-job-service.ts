import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import type {
  DocumentProcessingJob,
  DocumentProcessingJobStatus,
} from "@repo/core-domain";

export class DocumentJobService {
  async createProcessingJob(tenantId: string, documentId: string): Promise<DocumentProcessingJob> {
    const job = await prisma.documentProcessingJob.create({
      data: {
        tenantId,
        documentId,
        status: "PENDING",
        attemptsCount: 0,
      },
    });

    return this.mapToJob(job);
  }

  async getPendingJobs(limit: number = 10): Promise<DocumentProcessingJob[]> {
    const jobs = await prisma.documentProcessingJob.findMany({
      where: {
        status: "PENDING",
      },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    return jobs.map((job) => this.mapToJob(job));
  }

  async markJobInProgress(jobId: string): Promise<void> {
    await prisma.documentProcessingJob.update({
      where: { id: jobId },
      data: {
        status: "IN_PROGRESS",
        lastAttemptAt: new Date(),
      },
    });
  }

  // Note: markJobSuccess is now handled by worker-jobs service
  // This method is kept for backward compatibility but should not be used
  // The worker-jobs service handles the full AI pipeline (OCR → Parse → Risk Features)

  async markJobFailed(
    jobId: string,
    errorMessage: string,
    attempts: number
  ): Promise<void> {
    const maxAttempts = 3;
    const status: DocumentProcessingJobStatus = attempts >= maxAttempts ? "FAILED" : "PENDING";

    await prisma.documentProcessingJob.update({
      where: { id: jobId },
      data: {
        status,
        attemptsCount: attempts,
        lastErrorMessage: errorMessage,
        lastAttemptAt: new Date(),
      },
    });

    // If max attempts reached, mark document as failed
    if (status === "FAILED") {
      const job = await prisma.documentProcessingJob.findUnique({
        where: { id: jobId },
      });

      if (job) {
        await prisma.document.update({
          where: { id: job.documentId },
          data: {
            status: "FAILED",
            processingErrorMessage: errorMessage,
          },
        });
      }
    }
  }

  private mapToJob(item: any): DocumentProcessingJob {
    return {
      id: item.id,
      tenantId: item.tenantId,
      documentId: item.documentId,
      status: item.status as DocumentProcessingJobStatus,
      attemptsCount: item.attemptsCount,
      lastErrorMessage: item.lastErrorMessage,
      lastAttemptAt: item.lastAttemptAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export const documentJobService = new DocumentJobService();

