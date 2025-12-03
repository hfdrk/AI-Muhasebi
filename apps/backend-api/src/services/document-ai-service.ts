import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";

export interface DocumentAIAnalysis {
  ocrResult: {
    id: string;
    rawText: string;
    ocrEngine: string;
    confidence: number | null;
    createdAt: Date;
  } | null;
  parsedData: {
    id: string;
    documentType: string;
    fields: any;
    parserVersion: string;
    createdAt: Date;
  } | null;
  riskFeatures: {
    id: string;
    features: any;
    riskFlags: any[];
    riskScore: number | null;
    generatedAt: Date;
  } | null;
}

export class DocumentAIService {
  async getDocumentAIAnalysis(
    tenantId: string,
    documentId: string
  ): Promise<DocumentAIAnalysis> {
    // Verify document belongs to tenant
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!document) {
      throw new NotFoundError("Belge bulunamadı.");
    }

    // Fetch all AI results
    const [ocrResult, parsedData, riskFeatures] = await Promise.all([
      prisma.documentOCRResult.findUnique({
        where: { documentId },
      }),
      prisma.documentParsedData.findUnique({
        where: { documentId },
      }),
      prisma.documentRiskFeatures.findUnique({
        where: { documentId },
      }),
    ]);

    // Verify tenant isolation
    if (ocrResult && ocrResult.tenantId !== tenantId) {
      throw new NotFoundError("Belge bulunamadı.");
    }
    if (parsedData && parsedData.tenantId !== tenantId) {
      throw new NotFoundError("Belge bulunamadı.");
    }
    if (riskFeatures && riskFeatures.tenantId !== tenantId) {
      throw new NotFoundError("Belge bulunamadı.");
    }

    return {
      ocrResult: ocrResult
        ? {
            id: ocrResult.id,
            rawText: ocrResult.rawText,
            ocrEngine: ocrResult.ocrEngine,
            confidence: ocrResult.confidence ? Number(ocrResult.confidence) : null,
            createdAt: ocrResult.createdAt,
          }
        : null,
      parsedData: parsedData
        ? {
            id: parsedData.id,
            documentType: parsedData.documentType,
            fields: parsedData.fields,
            parserVersion: parsedData.parserVersion,
            createdAt: parsedData.createdAt,
          }
        : null,
      riskFeatures: riskFeatures
        ? {
            id: riskFeatures.id,
            features: riskFeatures.features,
            riskFlags: riskFeatures.riskFlags as any[],
            riskScore: riskFeatures.riskScore ? Number(riskFeatures.riskScore) : null,
            generatedAt: riskFeatures.generatedAt,
          }
        : null,
    };
  }
}

export const documentAIService = new DocumentAIService();

