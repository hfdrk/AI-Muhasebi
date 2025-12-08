"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentJobService = exports.DocumentJobService = void 0;
const prisma_1 = require("../lib/prisma");
const shared_utils_1 = require("@repo/shared-utils");
class DocumentJobService {
    async getPendingJobs(limit = 10) {
        const jobs = await prisma_1.prisma.documentProcessingJob.findMany({
            where: {
                status: "PENDING",
            },
            take: limit,
            orderBy: { createdAt: "asc" },
        });
        return jobs.map((job) => ({
            id: job.id,
            tenantId: job.tenantId,
            documentId: job.documentId,
            status: job.status,
            attemptsCount: job.attemptsCount,
            lastErrorMessage: job.lastErrorMessage,
            lastAttemptAt: job.lastAttemptAt,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
        }));
    }
    async markJobInProgress(jobId) {
        await prisma_1.prisma.documentProcessingJob.update({
            where: { id: jobId },
            data: {
                status: "IN_PROGRESS",
                lastAttemptAt: new Date(),
            },
        });
    }
    async markJobSuccess(jobId, data) {
        const job = await prisma_1.prisma.documentProcessingJob.findUnique({
            where: { id: jobId },
            include: { document: true },
        });
        if (!job) {
            throw new shared_utils_1.NotFoundError("İş bulunamadı.");
        }
        // Update job status
        await prisma_1.prisma.documentProcessingJob.update({
            where: { id: jobId },
            data: {
                status: "SUCCESS",
                lastAttemptAt: new Date(),
            },
        });
        // Save OCR result
        await prisma_1.prisma.documentOCRResult.upsert({
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
        await prisma_1.prisma.documentParsedData.upsert({
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
        await prisma_1.prisma.documentRiskFeatures.upsert({
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
        await prisma_1.prisma.document.update({
            where: { id: job.documentId },
            data: {
                status: "PROCESSED",
                processedAt: new Date(),
            },
        });
    }
    async markJobFailed(jobId, errorMessage, attempts) {
        const maxAttempts = 3;
        const status = attempts >= maxAttempts ? "FAILED" : "PENDING";
        await prisma_1.prisma.documentProcessingJob.update({
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
            const job = await prisma_1.prisma.documentProcessingJob.findUnique({
                where: { id: jobId },
            });
            if (job) {
                await prisma_1.prisma.document.update({
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
exports.DocumentJobService = DocumentJobService;
exports.documentJobService = new DocumentJobService();
//# sourceMappingURL=document-job-service.js.map