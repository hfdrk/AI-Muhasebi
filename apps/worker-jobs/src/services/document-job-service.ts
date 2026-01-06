import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import type {
  DocumentProcessingJob,
  DocumentProcessingJobStatus,
  CreateDocumentRiskFeaturesInput,
} from "@repo/core-domain";

export class DocumentJobService {
  async getPendingJobs(limit: number = 10): Promise<DocumentProcessingJob[]> {
    const jobs = await prisma.documentProcessingJob.findMany({
      where: {
        status: "PENDING",
      },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    return jobs.map((job: any) => ({
      id: job.id,
      tenantId: job.tenantId,
      documentId: job.documentId,
      status: job.status as any,
      attemptsCount: job.attemptsCount,
      lastErrorMessage: job.lastErrorMessage,
      lastAttemptAt: job.lastAttemptAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));
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

  async markJobSuccess(
    jobId: string,
    data: {
      tenantId: string;
      documentId: string;
      ocrResult: {
        rawText: string;
        ocrEngine: string;
        confidence?: number | null;
      };
      parsedData: {
        documentType: string;
        fields: any;
        parserVersion: string;
      };
      riskFeatures: {
        features: any;
        riskFlags: any[];
        riskScore?: number | null;
      };
    }
  ): Promise<void> {
    const job = await prisma.documentProcessingJob.findUnique({
      where: { id: jobId },
      include: { document: true },
    });

    if (!job) {
      throw new NotFoundError("İş bulunamadı.");
    }

    // Update job status
    await prisma.documentProcessingJob.update({
      where: { id: jobId },
      data: {
        status: "SUCCESS",
        lastAttemptAt: new Date(),
      },
    });

    // Save OCR result
    await prisma.documentOCRResult.upsert({
      where: { documentId: job.documentId },
      create: {
        tenantId: data.tenantId,
        documentId: data.documentId,
        rawText: data.ocrResult.rawText,
        ocrEngine: data.ocrResult.ocrEngine,
        confidence: data.ocrResult.confidence ?? null,
      },
      update: {
        rawText: data.ocrResult.rawText,
        ocrEngine: data.ocrResult.ocrEngine,
        confidence: data.ocrResult.confidence ?? null,
      },
    });

    // Save parsed data
    await prisma.documentParsedData.upsert({
      where: { documentId: job.documentId },
      create: {
        tenantId: data.tenantId,
        documentId: data.documentId,
        documentType: data.parsedData.documentType,
        fields: data.parsedData.fields,
        parserVersion: data.parsedData.parserVersion,
      },
      update: {
        documentType: data.parsedData.documentType,
        fields: data.parsedData.fields,
        parserVersion: data.parsedData.parserVersion,
      },
    });

    // Save risk features
    await prisma.documentRiskFeatures.upsert({
      where: { documentId: job.documentId },
      create: {
        tenantId: data.tenantId,
        documentId: data.documentId,
        features: data.riskFeatures.features,
        riskFlags: data.riskFeatures.riskFlags,
        riskScore: data.riskFeatures.riskScore ?? null,
        generatedAt: new Date(),
      },
      update: {
        features: data.riskFeatures.features,
        riskFlags: data.riskFeatures.riskFlags,
        riskScore: data.riskFeatures.riskScore ?? null,
        generatedAt: new Date(),
      },
    });

    // Update document status
    await prisma.document.update({
      where: { id: job.documentId },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });
  }

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
}

export const documentJobService = new DocumentJobService();

