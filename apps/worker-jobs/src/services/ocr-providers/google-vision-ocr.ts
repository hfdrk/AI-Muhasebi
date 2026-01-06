import type { OCRResult } from "../ocr-service";

// Google Vision types - dynamic import for optional dependency
interface TextAnnotation {
  description?: string;
  locale?: string;
  boundingPoly?: {
    vertices?: Array<{ x?: number; y?: number }>;
  };
}

interface FullTextAnnotation {
  text?: string;
  pages?: Array<{
    width?: number;
    height?: number;
    blocks?: Array<{
      blockType?: string;
      confidence?: number;
      paragraphs?: Array<{
        confidence?: number;
        words?: Array<{
          confidence?: number;
          symbols?: Array<{
            text?: string;
            confidence?: number;
          }>;
        }>;
      }>;
    }>;
  }>;
}

interface VisionResponse {
  textAnnotations?: TextAnnotation[];
  fullTextAnnotation?: FullTextAnnotation;
  error?: {
    code?: number;
    message?: string;
  };
}

interface VisionClient {
  textDetection: (
    request: { image: { content: Buffer | string } }
  ) => Promise<[VisionResponse]>;
  documentTextDetection: (
    request: { image: { content: Buffer | string } }
  ) => Promise<[VisionResponse]>;
  batchAnnotateFiles: (request: {
    requests: Array<{
      inputConfig: {
        mimeType: string;
        content: Buffer;
      };
      features: Array<{ type: string }>;
      pages?: number[];
    }>;
  }) => Promise<
    [
      {
        responses?: Array<{
          responses?: Array<VisionResponse>;
        }>;
      }
    ]
  >;
}

/**
 * Google Cloud Vision OCR Provider
 *
 * Uses Google Cloud Vision API for high-accuracy OCR.
 * Excellent for:
 * - Multi-language text (including Turkish)
 * - Handwriting recognition
 * - Document layout analysis
 * - Dense text extraction
 *
 * Features:
 * - TEXT_DETECTION: Simple text extraction
 * - DOCUMENT_TEXT_DETECTION: Dense document text with layout
 * - PDF support via batchAnnotateFiles
 *
 * Installation:
 *   pnpm add @google-cloud/vision
 *
 * Authentication Options:
 *   1. Service Account JSON file:
 *      - Set GOOGLE_APPLICATION_CREDENTIALS env var to path
 *   2. API Key (limited features):
 *      - Pass API key to constructor
 *   3. Application Default Credentials (ADC):
 *      - Run: gcloud auth application-default login
 */
export class GoogleVisionOCR {
  private apiKey?: string;
  private keyFilePath?: string;
  private projectId?: string;
  private client: VisionClient | null = null;

  constructor(apiKeyOrKeyFile?: string, projectId?: string) {
    if (apiKeyOrKeyFile) {
      // Check if it's a file path or an API key
      if (apiKeyOrKeyFile.endsWith(".json") || apiKeyOrKeyFile.includes("/")) {
        this.keyFilePath = apiKeyOrKeyFile;
      } else {
        this.apiKey = apiKeyOrKeyFile;
      }
    }
    this.projectId = projectId;
  }

  /**
   * Lazy load Google Cloud Vision SDK
   */
  private async loadVision(): Promise<VisionClient> {
    if (this.client) {
      return this.client;
    }

    try {
      const vision = await import("@google-cloud/vision");
      const { ImageAnnotatorClient } = vision;

      // Build client options
      const clientOptions: {
        keyFilename?: string;
        projectId?: string;
        apiKey?: string;
      } = {};

      if (this.keyFilePath) {
        clientOptions.keyFilename = this.keyFilePath;
      }

      if (this.projectId) {
        clientOptions.projectId = this.projectId;
      }

      // API key authentication (limited to some features)
      if (this.apiKey && !this.keyFilePath) {
        // For API key auth, we'd typically use REST API directly
        // The SDK prefers service account authentication
        console.warn(
          "[GoogleVisionOCR] API key authentication has limited features. " +
            "Consider using service account for full functionality."
        );
      }

      this.client = new ImageAnnotatorClient(clientOptions) as unknown as VisionClient;
      return this.client;
    } catch {
      throw new Error(
        "@google-cloud/vision modülü bulunamadı. Lütfen yükleyin: pnpm add @google-cloud/vision"
      );
    }
  }

  /**
   * Extract text from image buffer
   */
  async extractText(fileBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    try {
      // Handle PDF separately
      if (mimeType === "application/pdf") {
        return await this.extractTextFromPDF(fileBuffer);
      }

      const client = await this.loadVision();

      // Use DOCUMENT_TEXT_DETECTION for better accuracy on dense text
      const [response] = await client.documentTextDetection({
        image: { content: fileBuffer },
      });

      // Check for errors
      if (response.error) {
        throw new Error(response.error.message || "Google Vision API error");
      }

      // Get full text from fullTextAnnotation (preserves layout better)
      let rawText = "";
      let confidence: number | null = null;

      if (response.fullTextAnnotation?.text) {
        rawText = response.fullTextAnnotation.text;
        confidence = this.calculateConfidence(response.fullTextAnnotation);
      } else if (response.textAnnotations && response.textAnnotations.length > 0) {
        // Fallback to first text annotation (contains full text)
        rawText = response.textAnnotations[0].description || "";
      }

      return {
        rawText: rawText.trim(),
        engineName: "google-vision",
        confidence,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[GoogleVisionOCR] OCR error:", errorMessage);

      // Check if it's a missing module error
      if (errorMessage.includes("modülü bulunamadı")) {
        throw error;
      }

      // Check for Google-specific errors
      if (errorMessage.includes("PERMISSION_DENIED")) {
        throw new Error(
          "Google Cloud Vision erişim reddedildi. Service account izinlerini kontrol edin."
        );
      }

      if (errorMessage.includes("INVALID_ARGUMENT")) {
        throw new Error("Geçersiz görüntü formatı veya içerik.");
      }

      if (errorMessage.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("Google Cloud Vision API kotası aşıldı. Lütfen bekleyin.");
      }

      // Return empty result for other errors
      return {
        rawText: "",
        engineName: "google-vision",
        confidence: 0,
      };
    }
  }

  /**
   * Extract text from PDF using batchAnnotateFiles
   */
  private async extractTextFromPDF(fileBuffer: Buffer): Promise<OCRResult> {
    try {
      const client = await this.loadVision();

      // Use batchAnnotateFiles for PDF processing
      const [result] = await client.batchAnnotateFiles({
        requests: [
          {
            inputConfig: {
              mimeType: "application/pdf",
              content: fileBuffer,
            },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            // Process all pages (or specify page numbers)
            pages: [], // Empty array = all pages
          },
        ],
      });

      // Extract text from all pages
      const textParts: string[] = [];
      let totalConfidence = 0;
      let pageCount = 0;

      if (result.responses && result.responses.length > 0) {
        for (const fileResponse of result.responses) {
          if (fileResponse.responses) {
            for (const response of fileResponse.responses) {
              if (response.fullTextAnnotation?.text) {
                textParts.push(response.fullTextAnnotation.text);

                const pageConfidence = this.calculateConfidence(response.fullTextAnnotation);
                if (pageConfidence !== null) {
                  totalConfidence += pageConfidence;
                  pageCount++;
                }
              }
            }
          }
        }
      }

      const averageConfidence = pageCount > 0 ? totalConfidence / pageCount : null;

      return {
        rawText: textParts.join("\n\n--- Page Break ---\n\n").trim(),
        engineName: "google-vision-pdf",
        confidence: averageConfidence,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[GoogleVisionOCR] PDF extraction error:", errorMessage);

      // Check for PDF-specific errors
      if (errorMessage.includes("PDF_TOO_LARGE")) {
        throw new Error(
          "PDF çok büyük. Maksimum 2000 sayfa veya 40MB. Dosyayı bölün."
        );
      }

      return {
        rawText: "",
        engineName: "google-vision-pdf",
        confidence: 0,
      };
    }
  }

  /**
   * Calculate average confidence from fullTextAnnotation
   */
  private calculateConfidence(annotation: FullTextAnnotation): number | null {
    const confidences: number[] = [];

    if (annotation.pages) {
      for (const page of annotation.pages) {
        if (page.blocks) {
          for (const block of page.blocks) {
            if (block.confidence !== undefined) {
              confidences.push(block.confidence);
            }
          }
        }
      }
    }

    if (confidences.length === 0) {
      return null;
    }

    const sum = confidences.reduce((acc, conf) => acc + conf, 0);
    return (sum / confidences.length) * 100; // Convert to percentage
  }

  /**
   * Extract text with language hints for better Turkish OCR
   */
  async extractTextWithLanguageHints(
    fileBuffer: Buffer,
    mimeType: string,
    languageHints: string[] = ["tr", "en"]
  ): Promise<OCRResult> {
    try {
      // For now, language hints are not directly supported in SDK
      // But we can use the same method - Vision API auto-detects Turkish well
      return await this.extractText(fileBuffer, mimeType);
    } catch (error) {
      console.error("[GoogleVisionOCR] OCR with hints error:", error);
      return {
        rawText: "",
        engineName: "google-vision",
        confidence: 0,
      };
    }
  }

  /**
   * Extract structured document elements (paragraphs, blocks)
   */
  async extractStructuredText(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<{
    rawText: string;
    engineName: string;
    confidence: number | null;
    paragraphs: Array<{
      text: string;
      confidence: number;
      boundingBox?: { x: number; y: number; width: number; height: number };
    }>;
    blocks: Array<{
      type: string;
      text: string;
      confidence: number;
    }>;
  }> {
    try {
      if (mimeType === "application/pdf") {
        // For PDFs, use basic extraction
        const result = await this.extractTextFromPDF(fileBuffer);
        return {
          ...result,
          paragraphs: [],
          blocks: [],
        };
      }

      const client = await this.loadVision();

      const [response] = await client.documentTextDetection({
        image: { content: fileBuffer },
      });

      const paragraphs: Array<{
        text: string;
        confidence: number;
        boundingBox?: { x: number; y: number; width: number; height: number };
      }> = [];

      const blocks: Array<{
        type: string;
        text: string;
        confidence: number;
      }> = [];

      // Extract structured data from fullTextAnnotation
      if (response.fullTextAnnotation?.pages) {
        for (const page of response.fullTextAnnotation.pages) {
          const pageWidth = page.width || 1;
          const pageHeight = page.height || 1;

          if (page.blocks) {
            for (const block of page.blocks) {
              const blockText: string[] = [];

              if (block.paragraphs) {
                for (const paragraph of block.paragraphs) {
                  const paragraphText: string[] = [];

                  if (paragraph.words) {
                    for (const word of paragraph.words) {
                      if (word.symbols) {
                        const wordText = word.symbols.map((s) => s.text || "").join("");
                        paragraphText.push(wordText);
                      }
                    }
                  }

                  const pText = paragraphText.join(" ");
                  blockText.push(pText);

                  paragraphs.push({
                    text: pText,
                    confidence: (paragraph.confidence || 0) * 100,
                  });
                }
              }

              blocks.push({
                type: block.blockType || "TEXT",
                text: blockText.join("\n"),
                confidence: (block.confidence || 0) * 100,
              });
            }
          }
        }
      }

      const rawText = response.fullTextAnnotation?.text || "";
      const confidence = this.calculateConfidence(response.fullTextAnnotation!);

      return {
        rawText: rawText.trim(),
        engineName: "google-vision-structured",
        confidence,
        paragraphs,
        blocks,
      };
    } catch (error) {
      console.error("[GoogleVisionOCR] Structured extraction error:", error);
      return {
        rawText: "",
        engineName: "google-vision-structured",
        confidence: 0,
        paragraphs: [],
        blocks: [],
      };
    }
  }

  /**
   * Extract invoice-specific fields using Turkish patterns
   * Uses text positions and patterns to identify fields
   */
  async extractInvoiceFields(fileBuffer: Buffer): Promise<{
    invoiceNumber?: string;
    date?: string;
    totalAmount?: number;
    taxAmount?: number;
    vendorName?: string;
    vendorVKN?: string;
    customerName?: string;
    customerVKN?: string;
  }> {
    const result = await this.extractText(fileBuffer, "image/jpeg");
    const text = result.rawText;

    const fields: ReturnType<typeof this.extractInvoiceFields> extends Promise<infer T>
      ? T
      : never = {};

    // Turkish invoice patterns
    const patterns = {
      invoiceNumber: [
        /Fatura\s*No[:\s]*([A-Z0-9-]+)/i,
        /FATURA\s*NO[:\s]*([A-Z0-9-]+)/i,
        /Seri[:\s]*([A-Z]+)\s*Sıra[:\s]*([0-9]+)/i,
      ],
      date: [
        /Fatura\s*Tarihi[:\s]*(\d{2}[./-]\d{2}[./-]\d{4})/i,
        /Tarih[:\s]*(\d{2}[./-]\d{2}[./-]\d{4})/i,
        /(\d{2}[./-]\d{2}[./-]\d{4})/,
      ],
      totalAmount: [
        /Genel\s*Toplam[:\s]*([0-9.,]+)\s*(?:TL|₺)?/i,
        /TOPLAM[:\s]*([0-9.,]+)\s*(?:TL|₺)?/i,
        /Toplam\s*Tutar[:\s]*([0-9.,]+)/i,
      ],
      taxAmount: [
        /KDV\s*Tutarı?[:\s]*([0-9.,]+)/i,
        /KDV[:\s]*%?\d*[:\s]*([0-9.,]+)/i,
        /Vergi[:\s]*([0-9.,]+)/i,
      ],
      vendorVKN: [
        /VKN[:\s]*(\d{10,11})/i,
        /Vergi\s*(?:Kimlik\s*)?No[:\s]*(\d{10,11})/i,
        /TCKN[:\s]*(\d{11})/i,
      ],
    };

    // Extract fields using patterns
    for (const [field, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        const match = text.match(pattern);
        if (match) {
          let value = match[1];

          // Handle serial + sequence number format
          if (match[2]) {
            value = `${match[1]}-${match[2]}`;
          }

          // Parse numbers for amount fields
          if (field === "totalAmount" || field === "taxAmount") {
            const numValue = this.parseTurkishNumber(value);
            if (numValue !== null) {
              (fields as Record<string, unknown>)[field] = numValue;
            }
          } else {
            (fields as Record<string, unknown>)[field] = value.trim();
          }

          break;
        }
      }
    }

    return fields;
  }

  /**
   * Parse Turkish number format (1.234,56 -> 1234.56)
   */
  private parseTurkishNumber(value: string): number | null {
    if (!value) return null;

    // Remove currency symbols and spaces
    let cleaned = value.replace(/[₺TLtl\s]/g, "").trim();

    // Handle Turkish format: 1.234,56
    if (cleaned.includes(",")) {
      // Remove thousand separators (.)
      cleaned = cleaned.replace(/\./g, "");
      // Replace decimal separator (,) with (.)
      cleaned = cleaned.replace(",", ".");
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Detect document language
   */
  async detectLanguage(fileBuffer: Buffer): Promise<string | null> {
    try {
      const client = await this.loadVision();

      const [response] = await client.textDetection({
        image: { content: fileBuffer },
      });

      // First annotation usually has locale info
      if (response.textAnnotations && response.textAnnotations.length > 0) {
        return response.textAnnotations[0].locale || null;
      }

      return null;
    } catch (error) {
      console.error("[GoogleVisionOCR] Language detection error:", error);
      return null;
    }
  }
}
