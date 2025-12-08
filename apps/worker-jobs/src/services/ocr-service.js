"use strict";
/**
 * OCR Service - Stub Implementation
 *
 * TODO: Replace with real OCR implementation:
 * - For PDFs: Use pdf-parse, pdfjs-dist, or AWS Textract
 * - For Images: Use Tesseract.js, AWS Textract, or Google Vision API
 * - Consider adding OCR engine configuration via environment variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ocrService = exports.OCRService = void 0;
class OCRService {
    /**
     * Run OCR on a file buffer
     * @param fileBuffer - File content as Buffer
     * @param mimeType - MIME type of the file (e.g., "application/pdf", "image/jpeg")
     * @returns Promise resolving to OCR result with raw text and engine name
     */
    async runOCR(fileBuffer, mimeType) {
        // Stub implementation - returns fake text based on file type
        let rawText;
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
        }
        else if (mimeType.startsWith("image/")) {
            rawText = `stub image OCR content - extracted text from ${mimeType} image

This is a placeholder OCR result. In production, this would contain the actual extracted text from the image file.

Example extracted content:
- Document type: Receipt
- Merchant: Example Store
- Date: 20.01.2024
- Amount: 150.00 TRY
- Payment method: Credit Card

TODO: Integrate real OCR engine (Tesseract.js, AWS Textract, or Google Vision API)`;
        }
        else {
            rawText = `stub OCR content - extracted text from ${mimeType} file

This is a placeholder OCR result for an unsupported file type.

TODO: Add support for this file type or integrate real OCR engine`;
        }
        return {
            rawText,
            engineName,
            confidence: null, // Stub doesn't provide confidence
        };
    }
}
exports.OCRService = OCRService;
exports.ocrService = new OCRService();
//# sourceMappingURL=ocr-service.js.map