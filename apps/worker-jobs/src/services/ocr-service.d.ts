/**
 * OCR Service - Stub Implementation
 *
 * TODO: Replace with real OCR implementation:
 * - For PDFs: Use pdf-parse, pdfjs-dist, or AWS Textract
 * - For Images: Use Tesseract.js, AWS Textract, or Google Vision API
 * - Consider adding OCR engine configuration via environment variables
 */
export interface OCRResult {
    rawText: string;
    engineName: string;
    confidence?: number | null;
}
export declare class OCRService {
    /**
     * Run OCR on a file buffer
     * @param fileBuffer - File content as Buffer
     * @param mimeType - MIME type of the file (e.g., "application/pdf", "image/jpeg")
     * @returns Promise resolving to OCR result with raw text and engine name
     */
    runOCR(fileBuffer: Buffer, mimeType: string): Promise<OCRResult>;
}
export declare const ocrService: OCRService;
//# sourceMappingURL=ocr-service.d.ts.map