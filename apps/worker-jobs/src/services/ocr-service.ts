/**
 * OCR Service - Multi-Provider Implementation
 * 
 * Supports multiple OCR providers:
 * - Google Cloud Vision API
 * - AWS Textract
 * - Tesseract.js (self-hosted)
 * - Stub (for testing)
 */

import { getOCRConfig, validateOCRConfig, type OCRProvider } from "@repo/config";
import { logger } from "@repo/shared-utils";
import { GoogleVisionOCR } from "./ocr-providers/google-vision-ocr";
import { AWSTextractOCR } from "./ocr-providers/aws-textract-ocr";
import { TesseractOCR } from "./ocr-providers/tesseract-ocr";

export interface OCRResult {
  rawText: string;
  engineName: string;
  confidence?: number | null;
}

export class OCRService {
  private provider: OCRProvider;
  private googleVision?: GoogleVisionOCR;
  private awsTextract?: AWSTextractOCR;
  private tesseract?: TesseractOCR;

  constructor() {
    const config = getOCRConfig();
    validateOCRConfig(config);
    this.provider = config.provider;

    // Initialize providers based on config
    if (config.googleVision?.apiKey) {
      this.googleVision = new GoogleVisionOCR(config.googleVision.apiKey);
    }

    if (config.awsTextract?.accessKeyId && config.awsTextract?.secretAccessKey) {
      this.awsTextract = new AWSTextractOCR(
        config.awsTextract.accessKeyId,
        config.awsTextract.secretAccessKey,
        config.awsTextract.region || "us-east-1"
      );
    }

    if (config.tesseract) {
      this.tesseract = new TesseractOCR(
        config.tesseract.language,
        config.tesseract.dataPath
      );
    }
  }

  /**
   * Run OCR on a file buffer
   * @param fileBuffer - File content as Buffer
   * @param mimeType - MIME type of the file (e.g., "application/pdf", "image/jpeg")
   * @returns Promise resolving to OCR result with raw text and engine name
   */
  async runOCR(fileBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    try {
      switch (this.provider) {
        case "google_vision":
          if (!this.googleVision) {
            throw new Error("Google Vision OCR not configured");
          }
          return await this.googleVision.extractText(fileBuffer, mimeType);

        case "aws_textract":
          if (!this.awsTextract) {
            throw new Error("AWS Textract OCR not configured");
          }
          return await this.awsTextract.extractText(fileBuffer, mimeType);

        case "tesseract":
          if (!this.tesseract) {
            throw new Error("Tesseract OCR not configured");
          }
          return await this.tesseract.extractText(fileBuffer, mimeType);

        case "stub":
        default:
          return this.runStubOCR(fileBuffer, mimeType);
      }
    } catch (error: any) {
      logger.error("[OCRService] Error running OCR", error);

      // Fallback to stub if provider fails
      if (this.provider !== "stub") {
        logger.warn("[OCRService] Falling back to stub OCR due to error");
        return this.runStubOCR(fileBuffer, mimeType);
      }
      
      throw error;
    }
  }

  /**
   * Stub OCR implementation (fallback)
   */
  private runStubOCR(fileBuffer: Buffer, mimeType: string): OCRResult {
    let rawText: string;
    const engineName = "stub";

    if (mimeType === "application/pdf") {
      rawText = `stub PDF OCR content - extracted text from PDF document
      
This is a placeholder OCR result. In production, this would contain the actual extracted text from the PDF file.

Example extracted content:
- Document type: Invoice
- Invoice number: INV-2024-001
- Date: 15.01.2024
- Total amount: 1,250.00 TRY
- Tax amount: 225.00 TRY
- Counterparty: Example Company Ltd.

TODO: Integrate real OCR engine (pdf-parse, AWS Textract, or Google Vision API)`;
    } else if (mimeType.startsWith("image/")) {
      rawText = `stub image OCR content - extracted text from ${mimeType} image

This is a placeholder OCR result. In production, this would contain the actual extracted text from the image file.

Example extracted content:
- Document type: Receipt
- Merchant: Example Store
- Date: 20.01.2024
- Amount: 150.00 TRY
- Payment method: Credit Card

TODO: Integrate real OCR engine (Tesseract.js, AWS Textract, or Google Vision API)`;
    } else {
      rawText = `stub OCR content - extracted text from ${mimeType} file

This is a placeholder OCR result for an unsupported file type.

TODO: Add support for this file type or integrate real OCR engine`;
    }

    return {
      rawText,
      engineName,
      confidence: null,
    };
  }
}

export const ocrService = new OCRService();

