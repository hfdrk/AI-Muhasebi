import { prisma } from "../lib/prisma";
import { getStorage } from "@repo/config";
import { documentJobService } from "../services/document-job-service";
import { ocrService } from "../services/ocr-service";
import { documentParserService } from "../services/document-parser-service";
import { riskFeatureService } from "../services/risk-feature-service";
import { Readable } from "stream";

export class DocumentProcessor {
  private storage = getStorage();

  async processDocument(tenantId: string, documentId: string): Promise<void> {
    // Fetch document from DB
    const document = await prisma.document.findFirst({
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
    const job = await prisma.documentProcessingJob.findUnique({
      where: { documentId },
    });

    if (!job) {
      throw new Error(`Processing job not found for document: ${documentId}`);
    }

    try {
      // Step 1: OCR - Convert file to text
      const fileStream = await this.storage.getObjectStream(tenantId, document.storagePath);
      const fileBuffer = await this.streamToBuffer(fileStream);
      
      const ocrResult = await ocrService.runOCR(fileBuffer, document.mimeType);

      // Step 2: Parse - Extract structured fields from OCR text
      const parsedData = await documentParserService.parseDocument(
        ocrResult.rawText,
        document.type,
        tenantId
      );

      // Step 3: Risk Features - Generate risk flags and features
      const riskFeatures = await riskFeatureService.generateRiskFeatures(
        parsedData,
        documentId,
        tenantId
      );

      // Step 4: Save all results and update document status
      await documentJobService.markJobSuccess(
        job.id,
        {
          tenantId,
          documentId,
          ocrResult: {
            rawText: ocrResult.rawText,
            ocrEngine: ocrResult.engineName as any,
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
        }
      );

      // Step 5: Calculate document risk score and create alerts if needed
      try {
        const { riskCalculationProcessor } = await import("./risk-calculation-processor");
        await riskCalculationProcessor.processDocumentRiskCalculation(tenantId, documentId);
      } catch (riskError: any) {
        // Log but don't fail the document processing if risk calculation fails
        console.error(`[Document Processor] Error calculating risk for document ${documentId}:`, riskError);
      }
    } catch (error: any) {
      // Error will be handled by the worker loop
      throw error;
    }
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }
}

export const documentProcessor = new DocumentProcessor();

