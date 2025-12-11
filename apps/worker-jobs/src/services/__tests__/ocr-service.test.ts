import { describe, it, expect } from "@jest/globals";
import { OCRService } from "../ocr-service";

describe("OCRService", () => {
  const ocrService = new OCRService();

  describe("runOCR", () => {
    it("should extract text from PDF", async () => {
      const pdfBuffer = Buffer.from("fake PDF content");
      const result = await ocrService.runOCR(pdfBuffer, "application/pdf");

      expect(result).toHaveProperty("rawText");
      expect(result).toHaveProperty("engineName");
      expect(result.rawText.length).toBeGreaterThan(0);
    });

    it("should extract text from image", async () => {
      const imageBuffer = Buffer.from("fake image content");
      const result = await ocrService.runOCR(imageBuffer, "image/jpeg");

      expect(result).toHaveProperty("rawText");
      expect(result).toHaveProperty("engineName");
      expect(result.rawText.length).toBeGreaterThan(0);
    });

    it("should handle unsupported file types", async () => {
      const buffer = Buffer.from("fake content");
      const result = await ocrService.runOCR(buffer, "application/unknown");

      expect(result).toHaveProperty("rawText");
      expect(result).toHaveProperty("engineName");
    });

    it("should return result with correct structure", async () => {
      const buffer = Buffer.from("test");
      const result = await ocrService.runOCR(buffer, "application/pdf");

      expect(result).toMatchObject({
        rawText: expect.any(String),
        engineName: expect.any(String),
      });
    });
  });
});
