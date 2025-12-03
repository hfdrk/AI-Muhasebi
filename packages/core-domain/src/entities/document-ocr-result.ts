export type OCREngine = "stub" | "tesseract" | "textract" | "vision" | "other";

export interface DocumentOCRResult {
  id: string;
  tenantId: string;
  documentId: string;
  rawText: string;
  ocrEngine: OCREngine;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentOCRResultInput {
  tenantId: string;
  documentId: string;
  rawText: string;
  ocrEngine: OCREngine;
  confidence?: number | null;
}

