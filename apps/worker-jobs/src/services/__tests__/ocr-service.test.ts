import { describe, it, expect } from "vitest";
import { OCRService } from "../ocr-service";

describe("OCRService", () => {
  const service = new OCRService();

  it("should return stub text for PDF files", async () => {
    const fileBuffer = Buffer.from("fake PDF content");
    const result = await service.runOCR(fileBuffer, "application/pdf");

    expect(result.rawText).toContain("stub PDF OCR content");
    expect(result.engineName).toBe("stub");
    expect(result.confidence).toBeNull();
  });

  it("should return stub text for image files", async () => {
    const fileBuffer = Buffer.from("fake image content");
    const result = await service.runOCR(fileBuffer, "image/jpeg");

    expect(result.rawText).toContain("stub image OCR content");
    expect(result.engineName).toBe("stub");
  });

  it("should return stub text for PNG images", async () => {
    const fileBuffer = Buffer.from("fake PNG content");
    const result = await service.runOCR(fileBuffer, "image/png");

    expect(result.rawText).toContain("stub image OCR content");
    expect(result.engineName).toBe("stub");
  });

  it("should return generic stub text for unknown file types", async () => {
    const fileBuffer = Buffer.from("fake content");
    const result = await service.runOCR(fileBuffer, "application/unknown");

    expect(result.rawText).toContain("stub OCR content");
    expect(result.engineName).toBe("stub");
  });
});

