"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentProcessor = exports.DocumentProcessor = void 0;
const prisma_1 = require("../lib/prisma");
const config_1 = require("@repo/config");
const document_job_service_1 = require("../services/document-job-service");
const ocr_service_1 = require("../services/ocr-service");
const document_parser_service_1 = require("../services/document-parser-service");
const risk_feature_service_1 = require("../services/risk-feature-service");
class DocumentProcessor {
    storage = (0, config_1.getStorage)();
    async processDocument(tenantId, documentId) {
        // Fetch document from DB
        const document = await prisma_1.prisma.document.findFirst({
            where: {
                id: documentId,
                tenantId,
                isDeleted: false,
            },
        });
        if (!document) {
            throw new Error(`Document not found: ${documentId}`);
        }
        // Find the job for this document
        const job = await prisma_1.prisma.documentProcessingJob.findUnique({
            where: { documentId },
        });
        if (!job) {
            throw new Error(`Processing job not found for document: ${documentId}`);
        }
        try {
            // Step 1: OCR - Convert file to text
            const fileStream = await this.storage.getObjectStream(tenantId, document.storagePath);
            const fileBuffer = await this.streamToBuffer(fileStream);
            const ocrResult = await ocr_service_1.ocrService.runOCR(fileBuffer, document.mimeType);
            // Step 2: Parse - Extract structured fields from OCR text
            const parsedData = await document_parser_service_1.documentParserService.parseDocument(ocrResult.rawText, document.type, tenantId);
            // Step 3: Risk Features - Generate risk flags and features
            const riskFeatures = await risk_feature_service_1.riskFeatureService.generateRiskFeatures(parsedData, documentId, tenantId);
            // Step 4: Save all results and update document status
            await document_job_service_1.documentJobService.markJobSuccess(job.id, {
                tenantId,
                documentId,
                ocrResult: {
                    rawText: ocrResult.rawText,
                    ocrEngine: ocrResult.engineName,
                    confidence: ocrResult.confidence,
                },
                parsedData: {
                    documentType: parsedData.documentType,
                    fields: parsedData.fields,
                    parserVersion: parsedData.parserVersion,
                },
                riskFeatures: {
                    features: riskFeatures.features,
                    riskFlags: riskFeatures.riskFlags,
                    riskScore: riskFeatures.riskScore,
                },
            });
            // Step 5: Calculate document risk score and create alerts if needed
            try {
                const { riskCalculationProcessor } = await Promise.resolve().then(() => __importStar(require("./risk-calculation-processor")));
                await riskCalculationProcessor.processDocumentRiskCalculation(tenantId, documentId);
            }
            catch (riskError) {
                // Log but don't fail the document processing if risk calculation fails
                console.error(`[Document Processor] Error calculating risk for document ${documentId}:`, riskError);
            }
            // Step 6: Increment AI analysis usage after successful processing
            try {
                const { usageService } = await Promise.resolve().then(() => __importStar(require("../../../backend-api/src/services/usage-service")));
                await usageService.incrementUsage(tenantId, "AI_ANALYSES", 1);
            }
            catch (usageError) {
                // Log but don't fail the document processing if usage tracking fails
                console.error(`[Document Processor] Error tracking AI analysis usage for document ${documentId}:`, usageError);
            }
        }
        catch (error) {
            // Error will be handled by the worker loop
            throw error;
        }
    }
    async streamToBuffer(stream) {
        const chunks = [];
        return new Promise((resolve, reject) => {
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("error", reject);
            stream.on("end", () => resolve(Buffer.concat(chunks)));
        });
    }
}
exports.DocumentProcessor = DocumentProcessor;
exports.documentProcessor = new DocumentProcessor();
//# sourceMappingURL=document-processor.js.map