import type { OCRResult } from "../ocr-service";
import { logger } from "@repo/shared-utils";

// AWS SDK types - dynamic import for optional dependency
interface TextractBlock {
  BlockType?: string;
  Text?: string;
  Confidence?: number;
  Id?: string;
  Relationships?: Array<{
    Type?: string;
    Ids?: string[];
  }>;
  Geometry?: {
    BoundingBox?: {
      Width?: number;
      Height?: number;
      Left?: number;
      Top?: number;
    };
  };
}

interface TextractResponse {
  Blocks?: TextractBlock[];
  DocumentMetadata?: {
    Pages?: number;
  };
}

interface TextractClient {
  send: (command: unknown) => Promise<TextractResponse>;
}

/**
 * AWS Textract OCR Provider
 *
 * Uses AWS Textract for high-accuracy document OCR.
 * Excellent for:
 * - Structured documents (forms, tables)
 * - Turkish invoices (e-Fatura)
 * - Multi-page PDFs
 *
 * Features:
 * - Async operations for large documents
 * - Table and form detection
 * - Handwriting recognition
 * - Multi-page PDF support
 *
 * Installation:
 *   pnpm add @aws-sdk/client-textract
 *
 * Environment Variables:
 *   AWS_ACCESS_KEY_ID - AWS access key
 *   AWS_SECRET_ACCESS_KEY - AWS secret key
 *   AWS_REGION - AWS region (default: eu-west-1)
 */
export class AWSTextractOCR {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;
  private client: TextractClient | null = null;
  private textractModule: unknown = null;

  constructor(accessKeyId: string, secretAccessKey: string, region: string = "eu-west-1") {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region;
  }

  /**
   * Lazy load AWS Textract SDK
   */
  private async loadTextract(): Promise<{
    client: TextractClient;
    DetectDocumentTextCommand: new (input: unknown) => unknown;
    AnalyzeDocumentCommand: new (input: unknown) => unknown;
  }> {
    if (this.client && this.textractModule) {
      return {
        client: this.client,
        ...(this.textractModule as {
          DetectDocumentTextCommand: new (input: unknown) => unknown;
          AnalyzeDocumentCommand: new (input: unknown) => unknown;
        }),
      };
    }

    try {
      // @ts-ignore
      const textract = await import("@aws-sdk/client-textract");

      const { TextractClient, DetectDocumentTextCommand, AnalyzeDocumentCommand } = textract;

      this.client = new TextractClient({
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      }) as unknown as TextractClient;

      this.textractModule = { DetectDocumentTextCommand, AnalyzeDocumentCommand };

      return {
        client: this.client,
        DetectDocumentTextCommand,
        AnalyzeDocumentCommand,
      };
    } catch {
      throw new Error(
        "@aws-sdk/client-textract modülü bulunamadı. Lütfen yükleyin: pnpm add @aws-sdk/client-textract"
      );
    }
  }

  /**
   * Extract text from image or PDF buffer
   */
  async extractText(fileBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    try {
      const { client, DetectDocumentTextCommand } = await this.loadTextract();

      // For PDFs larger than 5MB, we need async operations
      // For now, we use sync operations for smaller documents
      if (fileBuffer.length > 5 * 1024 * 1024) {
        logger.warn(
          "[AWSTextractOCR] Document larger than 5MB. Consider using async operations with S3."
        );
      }

      // Detect document text
      const command = new DetectDocumentTextCommand({
        Document: {
          Bytes: fileBuffer,
        },
      });

      const response = await client.send(command);

      // Extract text from LINE blocks (preserves reading order)
      const lines = this.extractLines(response.Blocks || []);
      const fullText = lines.join("\n");

      // Calculate average confidence
      const confidence = this.calculateAverageConfidence(response.Blocks || []);

      return {
        rawText: fullText.trim(),
        engineName: "aws-textract",
        confidence,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[AWSTextractOCR] OCR error", undefined, { error: errorMessage });

      // Check if it's a missing module error
      if (errorMessage.includes("modülü bulunamadı")) {
        throw error;
      }

      // Check for AWS-specific errors
      if (errorMessage.includes("InvalidImageFormatException")) {
        throw new Error("Geçersiz görüntü formatı. Desteklenen formatlar: JPEG, PNG, PDF");
      }

      if (errorMessage.includes("ImageTooLargeException")) {
        throw new Error(
          "Görüntü çok büyük. Maksimum 10MB (senkron) veya S3'e yükleyin (async)."
        );
      }

      if (errorMessage.includes("AccessDeniedException")) {
        throw new Error("AWS Textract erişim reddedildi. IAM izinlerini kontrol edin.");
      }

      // Return empty result for other errors
      return {
        rawText: "",
        engineName: "aws-textract",
        confidence: 0,
      };
    }
  }

  /**
   * Extract text with table and form analysis
   * More expensive but provides structured data extraction
   */
  async extractTextWithAnalysis(
    fileBuffer: Buffer,
    mimeType: string,
    features: ("TABLES" | "FORMS")[] = ["TABLES", "FORMS"]
  ): Promise<OCRResult & { tables?: string[][]; forms?: Record<string, string> }> {
    try {
      const { client, AnalyzeDocumentCommand } = await this.loadTextract();

      const command = new AnalyzeDocumentCommand({
        Document: {
          Bytes: fileBuffer,
        },
        FeatureTypes: features,
      });

      const response = await client.send(command);
      const blocks = response.Blocks || [];

      // Extract text
      const lines = this.extractLines(blocks);
      const fullText = lines.join("\n");

      // Extract tables if requested
      const tables = features.includes("TABLES") ? this.extractTables(blocks) : undefined;

      // Extract forms (key-value pairs) if requested
      const forms = features.includes("FORMS") ? this.extractForms(blocks) : undefined;

      // Calculate average confidence
      const confidence = this.calculateAverageConfidence(blocks);

      return {
        rawText: fullText.trim(),
        engineName: "aws-textract-analyze",
        confidence,
        tables,
        forms,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[AWSTextractOCR] Analysis error", undefined, { error: errorMessage });

      return {
        rawText: "",
        engineName: "aws-textract-analyze",
        confidence: 0,
      };
    }
  }

  /**
   * Extract LINE blocks in reading order
   */
  private extractLines(blocks: TextractBlock[]): string[] {
    const lines: string[] = [];

    // Filter LINE blocks and sort by position (top to bottom, left to right)
    const lineBlocks = blocks
      .filter((block) => block.BlockType === "LINE" && block.Text)
      .sort((a, b) => {
        const aTop = a.Geometry?.BoundingBox?.Top || 0;
        const bTop = b.Geometry?.BoundingBox?.Top || 0;

        // Group lines by approximate vertical position (within 2% tolerance)
        if (Math.abs(aTop - bTop) < 0.02) {
          const aLeft = a.Geometry?.BoundingBox?.Left || 0;
          const bLeft = b.Geometry?.BoundingBox?.Left || 0;
          return aLeft - bLeft;
        }

        return aTop - bTop;
      });

    for (const block of lineBlocks) {
      if (block.Text) {
        lines.push(block.Text);
      }
    }

    return lines;
  }

  /**
   * Extract tables from Textract response
   */
  private extractTables(blocks: TextractBlock[]): string[][] {
    const tables: string[][] = [];

    // Find TABLE blocks
    const tableBlocks = blocks.filter((block) => block.BlockType === "TABLE");

    for (const table of tableBlocks) {
      const tableData: string[][] = [];

      // Get CELL blocks for this table
      const cellIds = table.Relationships?.find((r) => r.Type === "CHILD")?.Ids || [];

      // Build cell map
      const cells = blocks.filter(
        (block) => block.BlockType === "CELL" && cellIds.includes(block.Id || "")
      );

      // Group cells by row
      const rowMap = new Map<number, Map<number, string>>();

      for (const cell of cells) {
        // Get row and column index from cell relationships
        const rowIndex = Math.round((cell.Geometry?.BoundingBox?.Top || 0) * 100);
        const colIndex = Math.round((cell.Geometry?.BoundingBox?.Left || 0) * 100);

        // Get cell text from WORD children
        const wordIds = cell.Relationships?.find((r) => r.Type === "CHILD")?.Ids || [];
        const words = blocks
          .filter((b) => b.BlockType === "WORD" && wordIds.includes(b.Id || ""))
          .map((w) => w.Text || "")
          .join(" ");

        if (!rowMap.has(rowIndex)) {
          rowMap.set(rowIndex, new Map());
        }
        rowMap.get(rowIndex)!.set(colIndex, words);
      }

      // Convert to 2D array
      const sortedRows = Array.from(rowMap.keys()).sort((a, b) => a - b);
      for (const rowIndex of sortedRows) {
        const rowData = rowMap.get(rowIndex)!;
        const sortedCols = Array.from(rowData.keys()).sort((a, b) => a - b);
        const row = sortedCols.map((col) => rowData.get(col) || "");
        tableData.push(row);
      }

      if (tableData.length > 0) {
        tables.push(...tableData);
      }
    }

    return tables;
  }

  /**
   * Extract key-value pairs from forms
   */
  private extractForms(blocks: TextractBlock[]): Record<string, string> {
    const forms: Record<string, string> = {};

    // Find KEY_VALUE_SET blocks
    const keyBlocks = blocks.filter(
      (block) =>
        block.BlockType === "KEY_VALUE_SET" &&
        block.Relationships?.some((r) => r.Type === "KEY")
    );

    for (const keyBlock of keyBlocks) {
      // Get the KEY text
      const keyChildIds =
        keyBlock.Relationships?.find((r) => r.Type === "CHILD")?.Ids || [];
      const keyText = blocks
        .filter((b) => b.BlockType === "WORD" && keyChildIds.includes(b.Id || ""))
        .map((w) => w.Text || "")
        .join(" ")
        .trim();

      // Get the VALUE block
      const valueBlockId =
        keyBlock.Relationships?.find((r) => r.Type === "VALUE")?.Ids?.[0];
      const valueBlock = blocks.find((b) => b.Id === valueBlockId);

      if (valueBlock) {
        // Get the VALUE text
        const valueChildIds =
          valueBlock.Relationships?.find((r) => r.Type === "CHILD")?.Ids || [];
        const valueText = blocks
          .filter((b) => b.BlockType === "WORD" && valueChildIds.includes(b.Id || ""))
          .map((w) => w.Text || "")
          .join(" ")
          .trim();

        if (keyText) {
          forms[keyText] = valueText;
        }
      }
    }

    return forms;
  }

  /**
   * Calculate average confidence from blocks
   */
  private calculateAverageConfidence(blocks: TextractBlock[]): number {
    const confidences = blocks
      .filter((block) => block.BlockType === "LINE" && block.Confidence !== undefined)
      .map((block) => block.Confidence!);

    if (confidences.length === 0) {
      return 0;
    }

    const sum = confidences.reduce((acc, conf) => acc + conf, 0);
    return sum / confidences.length;
  }

  /**
   * Extract invoice-specific fields using Turkish patterns
   * Optimized for e-Fatura and Turkish accounting documents
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
    lineItems?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
  }> {
    const result = await this.extractTextWithAnalysis(fileBuffer, "application/pdf", [
      "FORMS",
      "TABLES",
    ]);

    const fields: ReturnType<typeof this.extractInvoiceFields> extends Promise<infer T>
      ? T
      : never = {};

    // Extract from forms (key-value pairs)
    if (result.forms) {
      // Turkish invoice field patterns
      const fieldMappings: Record<string, keyof typeof fields> = {
        "Fatura No": "invoiceNumber",
        "FATURA NO": "invoiceNumber",
        "Fatura Tarihi": "date",
        "FATURA TARİHİ": "date",
        "Tarih": "date",
        "Toplam": "totalAmount",
        "TOPLAM": "totalAmount",
        "Genel Toplam": "totalAmount",
        "KDV": "taxAmount",
        "KDV Tutarı": "taxAmount",
        "Satıcı": "vendorName",
        "Tedarikçi": "vendorName",
        "VKN": "vendorVKN",
        "Vergi No": "vendorVKN",
        "Alıcı": "customerName",
        "Müşteri": "customerName",
      };

      for (const [key, value] of Object.entries(result.forms)) {
        const normalizedKey = key.trim();

        for (const [pattern, field] of Object.entries(fieldMappings)) {
          if (normalizedKey.includes(pattern)) {
            if (field === "totalAmount" || field === "taxAmount") {
              // Parse Turkish number format (1.234,56)
              const numValue = this.parseTurkishNumber(value);
              if (numValue !== null) {
                (fields as Record<string, unknown>)[field] = numValue;
              }
            } else {
              (fields as Record<string, unknown>)[field] = value;
            }
            break;
          }
        }
      }
    }

    // Extract line items from tables
    if (result.tables && result.tables.length > 0) {
      const lineItems: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
      }> = [];

      // Skip header row, process data rows
      for (let i = 1; i < result.tables.length; i++) {
        const row = result.tables[i];

        if (row.length >= 4) {
          lineItems.push({
            description: row[0] || "",
            quantity: this.parseTurkishNumber(row[1]) || 0,
            unitPrice: this.parseTurkishNumber(row[2]) || 0,
            amount: this.parseTurkishNumber(row[3]) || 0,
          });
        }
      }

      if (lineItems.length > 0) {
        fields.lineItems = lineItems;
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
}
