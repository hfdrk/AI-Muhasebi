import { prisma } from "../lib/prisma";
import { createLLMClient } from "@repo/shared-utils";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import { auditService } from "./audit-service";

export interface BatchAnalysisResult {
  analysisId: string;
  batchId: string;
  summary: string;
  riskScore: number;
  findings: Array<{
    type: "risk" | "anomaly" | "pattern" | "recommendation";
    severity: "low" | "medium" | "high";
    description: string;
    documentIds?: string[];
  }>;
  documentCount: number;
  analyzedAt: Date;
}

export class BatchAIAnalysisService {
  private _llmClient: ReturnType<typeof createLLMClient> | null = null;

  private get llmClient() {
    if (!this._llmClient) {
      this._llmClient = createLLMClient();
    }
    return this._llmClient;
  }

  /**
   * Analyze a batch of documents using AI
   */
  async analyzeBatchContents(
    tenantId: string,
    clientCompanyId: string,
    documentIds: string[]
  ): Promise<BatchAnalysisResult> {
    if (documentIds.length === 0) {
      throw new ValidationError("Analiz için en az bir belge gerekli.");
    }

    // Fetch all documents with their risk data
    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        tenantId,
        clientCompanyId,
        isDeleted: false,
      },
      include: {
        riskFeatures: true,
        riskScore: true,
        parsedData: true,
        ocrResult: true,
      },
    });

    if (documents.length === 0) {
      throw new NotFoundError("Belgeler bulunamadı.");
    }

    // Build document summaries for AI analysis
    const documentSummaries = await this.buildDocumentSummaries(documents);

    // Generate AI analysis
    const analysis = await this.generateAIAnalysis(
      tenantId,
      clientCompanyId,
      documentSummaries,
      documents
    );

    // Calculate aggregate risk score
    const riskScore = this.calculateAggregateRiskScore(documents);

    // Extract findings from AI analysis
    const findings = this.extractFindings(analysis, documents);

    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      analysisId,
      batchId: `batch_${documentIds[0]}`, // Simplified batch ID
      summary: analysis,
      riskScore,
      findings,
      documentCount: documents.length,
      analyzedAt: new Date(),
    };
  }

  /**
   * Generate batch risk summary using AI
   */
  async generateBatchRiskSummary(
    tenantId: string,
    clientCompanyId: string,
    documentIds: string[]
  ): Promise<string> {
    const result = await this.analyzeBatchContents(tenantId, clientCompanyId, documentIds);
    return result.summary;
  }

  /**
   * Build document summaries for AI analysis
   */
  private async buildDocumentSummaries(documents: any[]): Promise<string[]> {
    return documents.map((doc, index) => {
      const riskScore = doc.riskScore?.score || 0;
      const riskFlags = doc.riskFeatures?.riskFlags || [];
      const documentType = doc.parsedData?.documentType || doc.type.toLowerCase();
      const fileName = doc.originalFileName;

      let summary = `${index + 1}. ${fileName} (${documentType})\n`;
      summary += `   Risk Skoru: ${riskScore}/100\n`;

      if (riskFlags.length > 0) {
        summary += `   Risk Bayrakları: ${riskFlags.map((f: any) => f.code).join(", ")}\n`;
      }

      // Add parsed data summary if available
      if (doc.parsedData?.fields) {
        const fields = doc.parsedData.fields;
        if (fields.invoiceNumber) summary += `   Fatura No: ${fields.invoiceNumber}\n`;
        if (fields.totalAmount) summary += `   Tutar: ${fields.totalAmount}\n`;
        if (fields.issueDate) summary += `   Tarih: ${fields.issueDate}\n`;
      }

      return summary;
    });
  }

  /**
   * Generate AI analysis using LLM
   */
  private async generateAIAnalysis(
    tenantId: string,
    clientCompanyId: string,
    documentSummaries: string[],
    documents: any[]
  ): Promise<string> {
    const clientCompany = await prisma.clientCompany.findFirst({
      where: { id: clientCompanyId, tenantId },
    });

    const companyName = clientCompany?.name || "Bilinmeyen Şirket";

    const systemPrompt = `Sen bir muhasebe risk analiz uzmanısın. Toplu belge yüklemelerini analiz edip risk değerlendirmesi yapıyorsun.
Türkçe, profesyonel ve detaylı raporlar hazırlıyorsun.`;

    const userPrompt = `Aşağıdaki belgeleri analiz et ve kapsamlı bir risk değerlendirmesi yap:

Şirket: ${companyName}
Toplam Belge Sayısı: ${documents.length}
Yükleme Tarihi: ${new Date().toLocaleDateString("tr-TR")}

Belge Özetleri:
${documentSummaries.join("\n\n")}

Lütfen şunları analiz et:
1. Genel risk seviyesi (Düşük/Orta/Yüksek)
2. Belgeler arası ortak risk kalıpları
3. Anomaliler veya tutarsızlıklar
4. Dikkat edilmesi gereken noktalar
5. Öneriler ve aksiyon öğeleri

Detaylı bir Türkçe analiz raporu hazırla.`;

    try {
      const analysis = await this.llmClient.generateText({
        systemPrompt,
        userPrompt,
        maxTokens: 3000,
      });

      return analysis;
    } catch (error: any) {
      console.error("Error generating AI analysis:", error);
      // Fallback to basic analysis if AI fails
      return this.generateFallbackAnalysis(documents);
    }
  }

  /**
   * Generate fallback analysis if AI fails
   */
  private generateFallbackAnalysis(documents: any[]): string {
    const totalRisk = documents.reduce((sum, doc) => {
      return sum + (doc.riskScore?.score || 0);
    }, 0);
    const avgRisk = totalRisk / documents.length;

    const highRiskCount = documents.filter((doc) => (doc.riskScore?.score || 0) > 65).length;
    const mediumRiskCount = documents.filter(
      (doc) => (doc.riskScore?.score || 0) > 30 && (doc.riskScore?.score || 0) <= 65
    ).length;
    const lowRiskCount = documents.filter((doc) => (doc.riskScore?.score || 0) <= 30).length;

    return `Toplu Belge Analizi Özeti

Toplam Belge: ${documents.length}
Ortalama Risk Skoru: ${avgRisk.toFixed(2)}/100

Risk Dağılımı:
- Yüksek Risk (65+): ${highRiskCount} belge
- Orta Risk (30-65): ${mediumRiskCount} belge
- Düşük Risk (0-30): ${lowRiskCount} belge

${highRiskCount > 0 ? `⚠️ ${highRiskCount} yüksek riskli belge bulundu. Detaylı inceleme önerilir.` : "✅ Tüm belgeler düşük-orta risk seviyesinde."}`;
  }

  /**
   * Calculate aggregate risk score from all documents
   */
  private calculateAggregateRiskScore(documents: any[]): number {
    if (documents.length === 0) return 0;

    const scores = documents
      .map((doc) => doc.riskScore?.score || 0)
      .filter((score) => score > 0);

    if (scores.length === 0) return 0;

    // Use weighted average (higher risk documents have more weight)
    const total = scores.reduce((sum, score) => sum + score * score, 0);
    const weightSum = scores.reduce((sum, score) => sum + score, 0);

    return weightSum > 0 ? Math.round(total / weightSum) : 0;
  }

  /**
   * Extract structured findings from AI analysis
   */
  private extractFindings(analysis: string, documents: any[]): Array<{
    type: "risk" | "anomaly" | "pattern" | "recommendation";
    severity: "low" | "medium" | "high";
    description: string;
    documentIds?: string[];
  }> {
    const findings: Array<{
      type: "risk" | "anomaly" | "pattern" | "recommendation";
      severity: "low" | "medium" | "high";
      description: string;
      documentIds?: string[];
    }> = [];

    // Extract high-risk documents
    const highRiskDocs = documents.filter((doc) => (doc.riskScore?.score || 0) > 65);
    if (highRiskDocs.length > 0) {
      findings.push({
        type: "risk",
        severity: "high",
        description: `${highRiskDocs.length} yüksek riskli belge tespit edildi.`,
        documentIds: highRiskDocs.map((d) => d.id),
      });
    }

    // Extract documents with risk flags
    const flaggedDocs = documents.filter((doc) => {
      const flags = doc.riskFeatures?.riskFlags || [];
      return flags.some((f: any) => f.severity === "high");
    });

    if (flaggedDocs.length > 0) {
      findings.push({
        type: "risk",
        severity: "medium",
        description: `${flaggedDocs.length} belgede yüksek öncelikli risk bayrakları bulundu.`,
        documentIds: flaggedDocs.map((d) => d.id),
      });
    }

    // Check for duplicate invoice numbers
    const invoiceNumbers = new Map<string, string[]>();
    documents.forEach((doc) => {
      const invoiceNo = doc.parsedData?.fields?.invoiceNumber;
      if (invoiceNo) {
        if (!invoiceNumbers.has(invoiceNo)) {
          invoiceNumbers.set(invoiceNo, []);
        }
        invoiceNumbers.get(invoiceNo)!.push(doc.id);
      }
    });

    const duplicates = Array.from(invoiceNumbers.entries()).filter(([_, ids]) => ids.length > 1);
    if (duplicates.length > 0) {
      findings.push({
        type: "anomaly",
        severity: "medium",
        description: `${duplicates.length} tekrar eden fatura numarası tespit edildi.`,
        documentIds: duplicates.flatMap(([_, ids]) => ids),
      });
    }

    return findings;
  }
}

export const batchAIAnalysisService = new BatchAIAnalysisService();


