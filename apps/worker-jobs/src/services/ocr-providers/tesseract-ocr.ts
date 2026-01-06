import type { OCRResult } from "../ocr-service";

// Tesseract.js types - dynamic import to handle optional dependency
interface TesseractWorker {
  recognize: (image: Buffer | string) => Promise<{
    data: {
      text: string;
      confidence: number;
      lines: Array<{
        text: string;
        confidence: number;
        words: Array<{
          text: string;
          confidence: number;
        }>;
      }>;
    };
  }>;
  terminate: () => Promise<void>;
}

interface TesseractModule {
  createWorker: (lang: string, oem?: number, options?: Record<string, unknown>) => Promise<TesseractWorker>;
}

/**
 * Tesseract OCR Provider
 *
 * Uses Tesseract.js for local OCR processing.
 * Supports Turkish (tur) and English (eng) languages.
 *
 * Features:
 * - No external API calls - runs locally
 * - WebAssembly based - works in Node.js
 * - Multi-language support
 * - Confidence scores per word/line
 *
 * Installation:
 *   pnpm add tesseract.js
 */
export class TesseractOCR {
  private language: string;
  private dataPath?: string;
  private workerPool: TesseractWorker[] = [];
  private maxWorkers: number;
  private tesseractModule: TesseractModule | null = null;

  constructor(language: string = "tur+eng", dataPath?: string, maxWorkers: number = 2) {
    this.language = language;
    this.dataPath = dataPath;
    this.maxWorkers = maxWorkers;
  }

  /**
   * Lazy load Tesseract.js module
   */
  private async loadTesseract(): Promise<TesseractModule> {
    if (this.tesseractModule) {
      return this.tesseractModule;
    }

    try {
      // Dynamic import for optional dependency
      const tesseract = await import("tesseract.js");
      this.tesseractModule = tesseract as unknown as TesseractModule;
      return this.tesseractModule;
    } catch {
      throw new Error(
        "tesseract.js modülü bulunamadı. Lütfen yükleyin: pnpm add tesseract.js"
      );
    }
  }

  /**
   * Get or create a worker from the pool
   */
  private async getWorker(): Promise<TesseractWorker> {
    const tesseract = await this.loadTesseract();

    // Check if we have an available worker
    if (this.workerPool.length > 0) {
      return this.workerPool.pop()!;
    }

    // Create new worker with options
    const workerOptions: Record<string, unknown> = {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text" && m.progress > 0) {
          // Only log significant progress
          if (m.progress === 0.5 || m.progress === 1) {
            console.log(`[TesseractOCR] OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      },
    };

    // Add data path if configured
    if (this.dataPath) {
      workerOptions.langPath = this.dataPath;
    }

    // Set cache path for language data
    workerOptions.cachePath = process.env.TESSERACT_CACHE_PATH || "./tesseract-cache";

    const worker = await tesseract.createWorker(this.language, 1, workerOptions);
    return worker;
  }

  /**
   * Return worker to pool for reuse
   */
  private returnWorker(worker: TesseractWorker): void {
    if (this.workerPool.length < this.maxWorkers) {
      this.workerPool.push(worker);
    } else {
      // Pool is full, terminate the worker
      worker.terminate().catch(() => {
        // Ignore termination errors
      });
    }
  }

  /**
   * Extract text from image or PDF buffer
   */
  async extractText(fileBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    let worker: TesseractWorker | null = null;

    try {
      // Handle PDF - Tesseract.js doesn't natively support PDF
      if (mimeType === "application/pdf") {
        return await this.extractTextFromPDF(fileBuffer);
      }

      // Get worker from pool
      worker = await this.getWorker();

      // Run OCR
      const { data } = await worker.recognize(fileBuffer);

      // Calculate average confidence from lines
      let totalConfidence = 0;
      let lineCount = 0;

      if (data.lines && data.lines.length > 0) {
        for (const line of data.lines) {
          if (line.confidence > 0) {
            totalConfidence += line.confidence;
            lineCount++;
          }
        }
      }

      const averageConfidence = lineCount > 0 ? totalConfidence / lineCount : data.confidence;

      // Return worker to pool
      this.returnWorker(worker);
      worker = null;

      return {
        rawText: data.text.trim(),
        engineName: "tesseract",
        confidence: averageConfidence || null,
      };

    } catch (error) {
      // Clean up worker on error
      if (worker) {
        await worker.terminate().catch(() => {});
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[TesseractOCR] OCR error:", errorMessage);

      // Check if it's a missing module error
      if (errorMessage.includes("modülü bulunamadı")) {
        throw error;
      }

      // Return empty result for other errors
      return {
        rawText: "",
        engineName: "tesseract",
        confidence: 0,
      };
    }
  }

  /**
   * Extract text from PDF using pdf-parse and then OCR on images
   */
  private async extractTextFromPDF(fileBuffer: Buffer): Promise<OCRResult> {
    try {
      // First try to extract text directly from PDF (for text-based PDFs)
      const pdfParse = await this.loadPdfParse();

      if (pdfParse) {
        const pdfData = await pdfParse(fileBuffer);

        // If we got meaningful text, return it
        if (pdfData.text && pdfData.text.trim().length > 50) {
          return {
            rawText: pdfData.text.trim(),
            engineName: "pdf-parse",
            confidence: 95, // High confidence for text-based PDFs
          };
        }
      }

      // For image-based PDFs, we need to convert to images first
      // This requires additional dependencies like pdf2pic or pdftoppm
      console.warn(
        "[TesseractOCR] PDF appears to be image-based. " +
        "Consider using AWS Textract or Google Vision for better PDF OCR support."
      );

      // Return what we got from pdf-parse, even if minimal
      return {
        rawText: "PDF metin çıkarma başarısız. Lütfen AWS Textract veya Google Vision kullanın.",
        engineName: "tesseract",
        confidence: 0,
      };

    } catch (error) {
      console.error("[TesseractOCR] PDF extraction error:", error);
      return {
        rawText: "",
        engineName: "tesseract",
        confidence: 0,
      };
    }
  }

  /**
   * Lazy load pdf-parse module
   */
  private async loadPdfParse(): Promise<((buffer: Buffer) => Promise<{ text: string }>) | null> {
    try {
      const pdfParse = await import("pdf-parse");
      return pdfParse.default || pdfParse;
    } catch {
      console.warn("[TesseractOCR] pdf-parse modülü bulunamadı. PDF desteği devre dışı.");
      return null;
    }
  }

  /**
   * Preprocess image for better OCR results
   * Note: This requires sharp or similar library
   */
  async preprocessImage(fileBuffer: Buffer): Promise<Buffer> {
    try {
      const sharp = await import("sharp");

      // Convert to grayscale, increase contrast, and normalize
      const processed = await sharp.default(fileBuffer)
        .grayscale()
        .normalize()
        .sharpen()
        .toBuffer();

      return processed;
    } catch {
      // If sharp is not available, return original buffer
      console.warn("[TesseractOCR] sharp modülü bulunamadı. Ön işleme atlandı.");
      return fileBuffer;
    }
  }

  /**
   * Extract text with preprocessing
   */
  async extractTextWithPreprocessing(fileBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    // Only preprocess images, not PDFs
    if (mimeType.startsWith("image/")) {
      const processedBuffer = await this.preprocessImage(fileBuffer);
      return this.extractText(processedBuffer, mimeType);
    }

    return this.extractText(fileBuffer, mimeType);
  }

  /**
   * Terminate all workers in the pool
   */
  async terminate(): Promise<void> {
    const terminatePromises = this.workerPool.map((worker) =>
      worker.terminate().catch(() => {})
    );
    await Promise.all(terminatePromises);
    this.workerPool = [];
  }
}
