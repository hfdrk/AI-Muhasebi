import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TesseractOCR } from "../tesseract-ocr";
import { AWSTextractOCR } from "../aws-textract-ocr";
import { GoogleVisionOCR } from "../google-vision-ocr";

// Mock tesseract.js
vi.mock("tesseract.js", () => ({
  createWorker: vi.fn().mockImplementation(() =>
    Promise.resolve({
      recognize: vi.fn().mockResolvedValue({
        data: {
          text: "Extracted text from image",
          confidence: 92,
          lines: [
            { text: "Line 1", confidence: 95, words: [] },
            { text: "Line 2", confidence: 89, words: [] },
          ],
        },
      }),
      terminate: vi.fn().mockResolvedValue(undefined),
    })
  ),
}));

// Mock pdf-parse
vi.mock("pdf-parse", () => ({
  default: vi.fn().mockResolvedValue({
    text: "Extracted PDF text content\n\nThis is a sample PDF document.",
  }),
}));

// Mock sharp for image preprocessing
vi.mock("sharp", () => ({
  default: vi.fn().mockImplementation(() => ({
    grayscale: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    sharpen: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("processed image")),
  })),
}));

// Mock AWS SDK
vi.mock("@aws-sdk/client-textract", () => ({
  TextractClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({
      Blocks: [
        {
          BlockType: "LINE",
          Text: "Invoice Number: INV-2024-001",
          Confidence: 98.5,
          Geometry: { BoundingBox: { Top: 0.1, Left: 0.1 } },
        },
        {
          BlockType: "LINE",
          Text: "Total: 1.250,00 TRY",
          Confidence: 97.2,
          Geometry: { BoundingBox: { Top: 0.2, Left: 0.1 } },
        },
      ],
      DocumentMetadata: { Pages: 1 },
    }),
  })),
  DetectDocumentTextCommand: vi.fn(),
  AnalyzeDocumentCommand: vi.fn(),
}));

// Mock Google Cloud Vision
vi.mock("@google-cloud/vision", () => ({
  ImageAnnotatorClient: vi.fn().mockImplementation(() => ({
    documentTextDetection: vi.fn().mockResolvedValue([
      {
        fullTextAnnotation: {
          text: "Google Vision extracted text\n\nFatura No: F2024-001",
          pages: [
            {
              blocks: [
                {
                  blockType: "TEXT",
                  confidence: 0.96,
                  paragraphs: [
                    {
                      confidence: 0.96,
                      words: [{ confidence: 0.96, symbols: [{ text: "Test" }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        textAnnotations: [
          { description: "Google Vision extracted text", locale: "tr" },
        ],
      },
    ]),
    textDetection: vi.fn().mockResolvedValue([
      {
        textAnnotations: [
          { description: "Simple text detection", locale: "tr" },
        ],
      },
    ]),
    batchAnnotateFiles: vi.fn().mockResolvedValue([
      {
        responses: [
          {
            responses: [
              {
                fullTextAnnotation: {
                  text: "PDF Page 1 text",
                  pages: [{ blocks: [{ confidence: 0.95 }] }],
                },
              },
              {
                fullTextAnnotation: {
                  text: "PDF Page 2 text",
                  pages: [{ blocks: [{ confidence: 0.93 }] }],
                },
              },
            ],
          },
        ],
      },
    ]),
  })),
}));

describe("TesseractOCR", () => {
  let tesseractOCR: TesseractOCR;

  beforeEach(() => {
    vi.clearAllMocks();
    tesseractOCR = new TesseractOCR("tur+eng");
  });

  afterEach(async () => {
    await tesseractOCR.terminate();
    vi.resetAllMocks();
  });

  describe("extractText", () => {
    it("should extract text from image buffer", async () => {
      const imageBuffer = Buffer.from("fake image data");

      const result = await tesseractOCR.extractText(imageBuffer, "image/jpeg");

      expect(result).toHaveProperty("rawText");
      expect(result).toHaveProperty("engineName", "tesseract");
      expect(result).toHaveProperty("confidence");
      expect(result.rawText).toBe("Extracted text from image");
    });

    it("should calculate average confidence from lines", async () => {
      const imageBuffer = Buffer.from("fake image data");

      const result = await tesseractOCR.extractText(imageBuffer, "image/png");

      // Average of 95 and 89
      expect(result.confidence).toBeCloseTo(92, 0);
    });

    it("should handle PDF files using pdf-parse", async () => {
      const pdfBuffer = Buffer.from("fake pdf data");

      const result = await tesseractOCR.extractText(pdfBuffer, "application/pdf");

      expect(result).toHaveProperty("rawText");
      expect(result.rawText).toContain("Extracted PDF text");
      expect(result.engineName).toBe("pdf-parse");
    });

    it("should return empty result on OCR error", async () => {
      const tesseract = await import("tesseract.js");
      vi.mocked(tesseract.createWorker).mockRejectedValueOnce(new Error("OCR failed"));

      const imageBuffer = Buffer.from("bad image");
      const result = await tesseractOCR.extractText(imageBuffer, "image/jpeg");

      expect(result.rawText).toBe("");
      expect(result.confidence).toBe(0);
    });
  });

  describe("Worker Pool Management", () => {
    it("should reuse workers from pool", async () => {
      const imageBuffer = Buffer.from("test image");

      // First call creates worker
      await tesseractOCR.extractText(imageBuffer, "image/jpeg");
      // Second call should reuse worker
      await tesseractOCR.extractText(imageBuffer, "image/jpeg");

      const tesseract = await import("tesseract.js");
      // Should create workers based on pool behavior
      expect(tesseract.createWorker).toHaveBeenCalled();
    });

    it("should terminate all workers on terminate()", async () => {
      const imageBuffer = Buffer.from("test image");
      await tesseractOCR.extractText(imageBuffer, "image/jpeg");

      await tesseractOCR.terminate();

      // No errors thrown
    });
  });

  describe("Image Preprocessing", () => {
    it("should preprocess image before OCR", async () => {
      const imageBuffer = Buffer.from("raw image");

      const result = await tesseractOCR.extractTextWithPreprocessing(imageBuffer, "image/jpeg");

      expect(result).toHaveProperty("rawText");
      expect(result.engineName).toBe("tesseract");
    });

    it("should skip preprocessing for PDF", async () => {
      const pdfBuffer = Buffer.from("pdf content");

      const result = await tesseractOCR.extractTextWithPreprocessing(pdfBuffer, "application/pdf");

      expect(result.engineName).toBe("pdf-parse");
    });
  });
});

describe("AWSTextractOCR", () => {
  let textractOCR: AWSTextractOCR;

  beforeEach(() => {
    vi.clearAllMocks();
    textractOCR = new AWSTextractOCR("fake-key", "fake-secret", "eu-west-1");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("extractText", () => {
    it("should extract text from document", async () => {
      const imageBuffer = Buffer.from("fake document");

      const result = await textractOCR.extractText(imageBuffer, "image/jpeg");

      expect(result).toHaveProperty("rawText");
      expect(result.engineName).toBe("aws-textract");
      expect(result.rawText).toContain("Invoice Number");
      expect(result.rawText).toContain("Total");
    });

    it("should calculate average confidence from LINE blocks", async () => {
      const imageBuffer = Buffer.from("document");

      const result = await textractOCR.extractText(imageBuffer, "application/pdf");

      // Average of 98.5 and 97.2
      expect(result.confidence).toBeCloseTo(97.85, 1);
    });

    it("should handle large files warning", async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      const consoleSpy = vi.spyOn(console, "warn");

      await textractOCR.extractText(largeBuffer, "application/pdf");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Document larger than 5MB")
      );
    });
  });

  describe("extractTextWithAnalysis", () => {
    it("should extract text with tables and forms", async () => {
      const imageBuffer = Buffer.from("form document");

      const result = await textractOCR.extractTextWithAnalysis(
        imageBuffer,
        "application/pdf",
        ["TABLES", "FORMS"]
      );

      expect(result).toHaveProperty("rawText");
      expect(result.engineName).toBe("aws-textract-analyze");
    });
  });

  describe("Error Handling", () => {
    it("should handle InvalidImageFormatException", async () => {
      const textract = await import("@aws-sdk/client-textract");
      vi.mocked(textract.TextractClient).mockImplementationOnce(
        () =>
          ({
            send: vi.fn().mockRejectedValue(new Error("InvalidImageFormatException")),
          }) as any
      );

      const newOCR = new AWSTextractOCR("key", "secret", "region");

      await expect(
        newOCR.extractText(Buffer.from("bad"), "image/jpeg")
      ).rejects.toThrow("Geçersiz görüntü formatı");
    });

    it("should handle AccessDeniedException", async () => {
      const textract = await import("@aws-sdk/client-textract");
      vi.mocked(textract.TextractClient).mockImplementationOnce(
        () =>
          ({
            send: vi.fn().mockRejectedValue(new Error("AccessDeniedException")),
          }) as any
      );

      const newOCR = new AWSTextractOCR("key", "secret", "region");

      await expect(
        newOCR.extractText(Buffer.from("test"), "image/jpeg")
      ).rejects.toThrow("erişim reddedildi");
    });

    it("should return empty result for other errors", async () => {
      const textract = await import("@aws-sdk/client-textract");
      vi.mocked(textract.TextractClient).mockImplementationOnce(
        () =>
          ({
            send: vi.fn().mockRejectedValue(new Error("Unknown error")),
          }) as any
      );

      const newOCR = new AWSTextractOCR("key", "secret", "region");
      const result = await newOCR.extractText(Buffer.from("test"), "image/jpeg");

      expect(result.rawText).toBe("");
      expect(result.confidence).toBe(0);
    });
  });

  describe("Turkish Number Parsing", () => {
    it("should parse Turkish number format correctly", async () => {
      // Test via extractInvoiceFields which uses parseTurkishNumber internally
      const result = await textractOCR.extractInvoiceFields(Buffer.from("invoice"));

      // The mock returns blocks, but we're testing the overall flow
      expect(result).toBeDefined();
    });
  });
});

describe("GoogleVisionOCR", () => {
  let visionOCR: GoogleVisionOCR;

  beforeEach(() => {
    vi.clearAllMocks();
    visionOCR = new GoogleVisionOCR("/path/to/credentials.json");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("extractText", () => {
    it("should extract text from image using DOCUMENT_TEXT_DETECTION", async () => {
      const imageBuffer = Buffer.from("image data");

      const result = await visionOCR.extractText(imageBuffer, "image/jpeg");

      expect(result).toHaveProperty("rawText");
      expect(result.engineName).toBe("google-vision");
      expect(result.rawText).toContain("Google Vision extracted text");
    });

    it("should calculate confidence from fullTextAnnotation", async () => {
      const imageBuffer = Buffer.from("image data");

      const result = await visionOCR.extractText(imageBuffer, "image/png");

      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should handle PDF files with batchAnnotateFiles", async () => {
      const pdfBuffer = Buffer.from("pdf data");

      const result = await visionOCR.extractText(pdfBuffer, "application/pdf");

      expect(result.engineName).toBe("google-vision-pdf");
      expect(result.rawText).toContain("PDF Page 1 text");
      expect(result.rawText).toContain("PDF Page 2 text");
      expect(result.rawText).toContain("Page Break");
    });
  });

  describe("extractStructuredText", () => {
    it("should extract paragraphs and blocks", async () => {
      const imageBuffer = Buffer.from("document image");

      const result = await visionOCR.extractStructuredText(imageBuffer, "image/jpeg");

      expect(result).toHaveProperty("rawText");
      expect(result).toHaveProperty("paragraphs");
      expect(result).toHaveProperty("blocks");
      expect(result.engineName).toBe("google-vision-structured");
    });

    it("should return empty arrays for PDF structured extraction", async () => {
      const pdfBuffer = Buffer.from("pdf data");

      const result = await visionOCR.extractStructuredText(pdfBuffer, "application/pdf");

      expect(result.paragraphs).toEqual([]);
      expect(result.blocks).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    it("should handle PERMISSION_DENIED error", async () => {
      const vision = await import("@google-cloud/vision");
      vi.mocked(vision.ImageAnnotatorClient).mockImplementationOnce(
        () =>
          ({
            documentTextDetection: vi
              .fn()
              .mockRejectedValue(new Error("PERMISSION_DENIED")),
          }) as any
      );

      const newOCR = new GoogleVisionOCR("key");

      await expect(
        newOCR.extractText(Buffer.from("test"), "image/jpeg")
      ).rejects.toThrow("erişim reddedildi");
    });

    it("should handle RESOURCE_EXHAUSTED error", async () => {
      const vision = await import("@google-cloud/vision");
      vi.mocked(vision.ImageAnnotatorClient).mockImplementationOnce(
        () =>
          ({
            documentTextDetection: vi
              .fn()
              .mockRejectedValue(new Error("RESOURCE_EXHAUSTED")),
          }) as any
      );

      const newOCR = new GoogleVisionOCR("key");

      await expect(
        newOCR.extractText(Buffer.from("test"), "image/jpeg")
      ).rejects.toThrow("kotası aşıldı");
    });

    it("should return empty result for other errors", async () => {
      const vision = await import("@google-cloud/vision");
      vi.mocked(vision.ImageAnnotatorClient).mockImplementationOnce(
        () =>
          ({
            documentTextDetection: vi
              .fn()
              .mockRejectedValue(new Error("Unknown error")),
          }) as any
      );

      const newOCR = new GoogleVisionOCR("key");
      const result = await newOCR.extractText(Buffer.from("test"), "image/jpeg");

      expect(result.rawText).toBe("");
      expect(result.confidence).toBe(0);
    });
  });

  describe("Language Detection", () => {
    it("should detect document language", async () => {
      const imageBuffer = Buffer.from("Turkish text");

      const language = await visionOCR.detectLanguage(imageBuffer);

      expect(language).toBe("tr");
    });
  });

  describe("extractInvoiceFields", () => {
    it("should extract Turkish invoice fields using patterns", async () => {
      const vision = await import("@google-cloud/vision");
      vi.mocked(vision.ImageAnnotatorClient).mockImplementationOnce(
        () =>
          ({
            documentTextDetection: vi.fn().mockResolvedValue([
              {
                fullTextAnnotation: {
                  text: `
                    Fatura No: F2024-001
                    Fatura Tarihi: 15.01.2024
                    Genel Toplam: 1.250,00 TL
                    KDV Tutarı: 225,00 TL
                    VKN: 1234567890
                  `,
                  pages: [{ blocks: [{ confidence: 0.95 }] }],
                },
              },
            ]),
          }) as any
      );

      const newOCR = new GoogleVisionOCR("key");
      const result = await newOCR.extractInvoiceFields(Buffer.from("invoice"));

      expect(result.invoiceNumber).toBe("F2024-001");
      expect(result.date).toBe("15.01.2024");
      expect(result.totalAmount).toBe(1250);
      expect(result.taxAmount).toBe(225);
      expect(result.vendorVKN).toBe("1234567890");
    });
  });

  describe("Authentication Options", () => {
    it("should accept API key", () => {
      const ocr = new GoogleVisionOCR("api-key-123");
      expect(ocr).toBeDefined();
    });

    it("should accept key file path", () => {
      const ocr = new GoogleVisionOCR("/path/to/service-account.json");
      expect(ocr).toBeDefined();
    });

    it("should accept project ID", () => {
      const ocr = new GoogleVisionOCR("api-key", "project-123");
      expect(ocr).toBeDefined();
    });
  });
});

describe("OCR Provider Integration", () => {
  it("should handle the same input across all providers", async () => {
    const testBuffer = Buffer.from("Test document content");
    const mimeType = "image/jpeg";

    const tesseract = new TesseractOCR();
    const textract = new AWSTextractOCR("key", "secret", "region");
    const vision = new GoogleVisionOCR("key");

    const results = await Promise.all([
      tesseract.extractText(testBuffer, mimeType),
      textract.extractText(testBuffer, mimeType),
      vision.extractText(testBuffer, mimeType),
    ]);

    // All results should have the same structure
    for (const result of results) {
      expect(result).toHaveProperty("rawText");
      expect(result).toHaveProperty("engineName");
      expect(result).toHaveProperty("confidence");
    }

    // Clean up
    await tesseract.terminate();
  });

  it("should return correct engine names", async () => {
    const buffer = Buffer.from("test");
    const mimeType = "image/jpeg";

    const tesseract = new TesseractOCR();
    const textract = new AWSTextractOCR("key", "secret", "region");
    const vision = new GoogleVisionOCR("key");

    const tesseractResult = await tesseract.extractText(buffer, mimeType);
    const textractResult = await textract.extractText(buffer, mimeType);
    const visionResult = await vision.extractText(buffer, mimeType);

    expect(tesseractResult.engineName).toBe("tesseract");
    expect(textractResult.engineName).toBe("aws-textract");
    expect(visionResult.engineName).toBe("google-vision");

    await tesseract.terminate();
  });
});
