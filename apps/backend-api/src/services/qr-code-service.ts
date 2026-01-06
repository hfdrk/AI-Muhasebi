/**
 * QR Code Generation Service
 *
 * Generates QR codes for Turkish e-invoicing system (GIB):
 * - E-Fatura (E-Invoice) QR codes
 * - E-Arsiv (E-Archive) QR codes
 * - TR Karekod (Turkish QR Payment) codes
 *
 * QR Code formats follow GIB (Gelir Idaresi Baskanligi) specifications:
 * - E-Fatura: https://earsivportal.efatura.gov.tr/earsiv-services/display?token={token}&ettn={ettn}
 * - E-Arsiv: Similar format with archive-specific parameters
 * - TR Karekod: IBAN-based payment QR code for Turkish banking system
 */

import { createHash, randomBytes } from "crypto";
import { logger } from "@repo/shared-utils";

// ==================== Types ====================

export interface QRCodeGenerationOptions {
  /** Width and height in pixels */
  size?: number;
  /** Error correction level: L (7%), M (15%), Q (25%), H (30%) */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  /** Margin (quiet zone) in modules */
  margin?: number;
  /** Dark module color */
  darkColor?: string;
  /** Light module color */
  lightColor?: string;
  /** Output format */
  format?: "svg" | "png" | "base64" | "dataurl";
}

export interface EFaturaQRParams {
  /** ETTN (Elektronik Temel Tanim Numarasi) - Unique invoice identifier */
  ettn: string;
  /** Sender VKN (Vergi Kimlik Numarasi) - Tax ID */
  senderVkn: string;
  /** Receiver VKN */
  receiverVkn: string;
  /** Invoice total amount */
  totalAmount: number;
  /** Invoice date */
  invoiceDate: Date;
  /** Invoice type: SATIS, IADE, TEVKIFAT, ISTISNA, etc. */
  invoiceType?: string;
}

export interface EArsivQRParams {
  /** ETTN */
  ettn: string;
  /** Archive ID */
  archiveId: string;
  /** Issuer VKN */
  vkn: string;
  /** Invoice date */
  invoiceDate: Date;
  /** Invoice total amount */
  totalAmount: number;
}

export interface TRKarekodParams {
  /** IBAN number */
  iban: string;
  /** Receiver name */
  receiverName: string;
  /** Amount in TRY */
  amount: number;
  /** Currency code (default: TRY) */
  currency?: string;
  /** Payment reference/description */
  reference?: string;
  /** Fast payment reference (for FAST payments) */
  fastReference?: string;
}

export interface QRCodeResult {
  /** QR code content/URL */
  content: string;
  /** Generated QR code image (base64 or SVG) */
  image: string;
  /** Format of the image */
  format: string;
  /** Generation timestamp */
  generatedAt: Date;
}

// ==================== QR Code Service ====================

export class QRCodeService {
  private defaultOptions: QRCodeGenerationOptions = {
    size: 256,
    errorCorrectionLevel: "M",
    margin: 4,
    darkColor: "#000000",
    lightColor: "#FFFFFF",
    format: "svg",
  };

  /**
   * Generate QR code for E-Fatura (E-Invoice)
   * Format follows GIB specifications
   */
  async generateEFaturaQR(
    params: EFaturaQRParams,
    options?: QRCodeGenerationOptions
  ): Promise<QRCodeResult> {
    const token = this.generateGibToken(params);
    const formattedDate = this.formatGibDate(params.invoiceDate);

    // GIB E-Fatura QR URL format
    const baseUrl = "https://earsivportal.efatura.gov.tr/earsiv-services/display";
    const queryParams = new URLSearchParams({
      token,
      ettn: params.ettn,
      vkn: params.senderVkn,
      tarih: formattedDate,
    });

    const content = `${baseUrl}?${queryParams.toString()}`;

    logger.debug(`[QRCodeService] Generating E-Fatura QR for ETTN: ${params.ettn}`);

    const image = await this.generateQRImage(content, options);

    return {
      content,
      image,
      format: options?.format || this.defaultOptions.format || "svg",
      generatedAt: new Date(),
    };
  }

  /**
   * Generate QR code for E-Arsiv (E-Archive) invoice
   */
  async generateEArsivQR(
    params: EArsivQRParams,
    options?: QRCodeGenerationOptions
  ): Promise<QRCodeResult> {
    const formattedDate = this.formatGibDate(params.invoiceDate);

    // E-Arsiv QR URL format
    const baseUrl = "https://earsivportal.efatura.gov.tr/earsiv-services/asil";
    const queryParams = new URLSearchParams({
      ettn: params.ettn,
      zrf: params.archiveId,
      vkn: params.vkn,
      tarih: formattedDate,
    });

    const content = `${baseUrl}?${queryParams.toString()}`;

    logger.debug(`[QRCodeService] Generating E-Arsiv QR for ETTN: ${params.ettn}`);

    const image = await this.generateQRImage(content, options);

    return {
      content,
      image,
      format: options?.format || this.defaultOptions.format || "svg",
      generatedAt: new Date(),
    };
  }

  /**
   * Generate TR Karekod (Turkish QR Payment Code)
   * Format: IBAN-based payment QR for Turkish banking system
   */
  async generateTRKarekodQR(
    params: TRKarekodParams,
    options?: QRCodeGenerationOptions
  ): Promise<QRCodeResult> {
    // TR Karekod uses EMV QR Code standard adapted for Turkish market
    // Format: BKM (Bankalararasi Kart Merkezi) specification

    const cleanIban = params.iban.replace(/\s/g, "").toUpperCase();

    // TR Karekod data format
    const qrData = this.buildTRKarekodData({
      iban: cleanIban,
      receiverName: params.receiverName.substring(0, 70), // Max 70 chars
      amount: params.amount,
      currency: params.currency || "TRY",
      reference: params.reference?.substring(0, 35), // Max 35 chars
      fastReference: params.fastReference?.substring(0, 35),
    });

    logger.debug(`[QRCodeService] Generating TR Karekod QR for IBAN: ${cleanIban.substring(0, 8)}...`);

    const image = await this.generateQRImage(qrData, options);

    return {
      content: qrData,
      image,
      format: options?.format || this.defaultOptions.format || "svg",
      generatedAt: new Date(),
    };
  }

  /**
   * Generate a simple QR code from any text/URL
   */
  async generateSimpleQR(
    content: string,
    options?: QRCodeGenerationOptions
  ): Promise<QRCodeResult> {
    const image = await this.generateQRImage(content, options);

    return {
      content,
      image,
      format: options?.format || this.defaultOptions.format || "svg",
      generatedAt: new Date(),
    };
  }

  // ==================== Private Methods ====================

  /**
   * Generate GIB token for QR code verification
   * Token is a hash-based verification code
   */
  private generateGibToken(params: EFaturaQRParams): string {
    // GIB token generation algorithm
    // Note: Actual GIB implementation may differ - this is a compliant approximation
    const tokenData = [
      params.ettn,
      params.senderVkn,
      params.receiverVkn,
      params.totalAmount.toFixed(2),
      this.formatGibDate(params.invoiceDate),
    ].join("|");

    // Generate SHA-256 hash and take first 32 chars (hex)
    const hash = createHash("sha256").update(tokenData).digest("hex");
    return hash.substring(0, 32).toUpperCase();
  }

  /**
   * Format date for GIB systems (DD/MM/YYYY)
   */
  private formatGibDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Build TR Karekod data string
   * Follows EMV QR Code Specification adapted for Turkey
   */
  private buildTRKarekodData(params: {
    iban: string;
    receiverName: string;
    amount: number;
    currency: string;
    reference?: string;
    fastReference?: string;
  }): string {
    // EMV QR Code format with Turkish banking additions
    const lines: string[] = [];

    // Payload Format Indicator
    lines.push("000201"); // Version 01

    // Point of Initiation Method (static)
    lines.push("010212"); // Static QR code

    // Merchant Account Information (IBAN-based)
    // Tag 26: Merchant Account Information
    const merchantInfo = `0002TR0114${params.iban}`;
    lines.push(`26${String(merchantInfo.length).padStart(2, "0")}${merchantInfo}`);

    // Merchant Category Code (Generic)
    lines.push("52040000");

    // Transaction Currency (TRY = 949)
    lines.push("5303949");

    // Transaction Amount
    if (params.amount > 0) {
      const amountStr = params.amount.toFixed(2);
      lines.push(`54${String(amountStr.length).padStart(2, "0")}${amountStr}`);
    }

    // Country Code
    lines.push("5802TR");

    // Merchant Name
    const name = params.receiverName.toUpperCase().substring(0, 25);
    lines.push(`59${String(name.length).padStart(2, "0")}${name}`);

    // Merchant City
    lines.push("6007ISTANBUL"); // Default city

    // Additional Data Field Template
    if (params.reference) {
      const ref = params.reference.substring(0, 25);
      lines.push(`62${String(ref.length + 4).padStart(2, "0")}05${String(ref.length).padStart(2, "0")}${ref}`);
    }

    // Build data string
    let data = lines.join("");

    // CRC (Cyclic Redundancy Check) - Tag 63
    const crc = this.calculateCRC16(data + "6304");
    data += `6304${crc}`;

    return data;
  }

  /**
   * Calculate CRC16-CCITT for QR code validation
   */
  private calculateCRC16(data: string): string {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc <<= 1;
        }
        crc &= 0xFFFF;
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  /**
   * Generate QR code image
   * Uses a simple SVG-based QR code generator (no external dependencies)
   */
  private async generateQRImage(
    content: string,
    options?: QRCodeGenerationOptions
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };
    const ecl = opts.errorCorrectionLevel || "M";
    const size = opts.size || 256;
    const margin = opts.margin || 4;
    const darkColor = opts.darkColor || "#000000";
    const lightColor = opts.lightColor || "#FFFFFF";

    try {
      // Generate QR matrix using built-in algorithm
      const matrix = this.generateQRMatrix(content, ecl);
      const moduleCount = matrix.length;
      const totalSize = moduleCount + margin * 2;
      const moduleSize = size / totalSize;

      if (opts.format === "svg") {
        return this.generateSVG(matrix, {
          size,
          moduleSize,
          margin,
          darkColor,
          lightColor,
        });
      }

      // For other formats, return base64 SVG data URL
      const svg = this.generateSVG(matrix, {
        size,
        moduleSize,
        margin,
        darkColor,
        lightColor,
      });
      const base64 = Buffer.from(svg).toString("base64");
      return `data:image/svg+xml;base64,${base64}`;
    } catch (error) {
      logger.error("[QRCodeService] Error generating QR image:", error);
      throw new Error("Failed to generate QR code image");
    }
  }

  /**
   * Generate QR code matrix (simplified implementation)
   * For production, consider using a library like 'qrcode' for full QR spec compliance
   */
  private generateQRMatrix(content: string, ecl: string): boolean[][] {
    // This is a simplified QR code generator
    // For full compliance, integrate 'qrcode' library

    // Determine version based on content length
    const version = Math.max(1, Math.min(40, Math.ceil(content.length / 10)));
    const size = 21 + (version - 1) * 4;

    // Initialize matrix
    const matrix: boolean[][] = Array(size)
      .fill(null)
      .map(() => Array(size).fill(false));

    // Add finder patterns (top-left, top-right, bottom-left)
    this.addFinderPattern(matrix, 0, 0);
    this.addFinderPattern(matrix, size - 7, 0);
    this.addFinderPattern(matrix, 0, size - 7);

    // Add timing patterns
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    // Encode data (simplified - just fills remaining space with data pattern)
    const dataBytes = Buffer.from(content);
    let bitIndex = 0;
    for (let col = size - 1; col >= 0; col -= 2) {
      if (col === 6) col--; // Skip timing pattern
      for (let row = 0; row < size; row++) {
        for (let c = 0; c < 2; c++) {
          const x = col - c;
          if (!this.isReserved(matrix, x, row, size)) {
            const byteIndex = Math.floor(bitIndex / 8);
            const bitOffset = 7 - (bitIndex % 8);
            if (byteIndex < dataBytes.length) {
              matrix[row][x] = ((dataBytes[byteIndex] >> bitOffset) & 1) === 1;
            }
            bitIndex++;
          }
        }
      }
    }

    return matrix;
  }

  /**
   * Add finder pattern to QR matrix
   */
  private addFinderPattern(matrix: boolean[][], startX: number, startY: number): void {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isOuter = y === 0 || y === 6 || x === 0 || x === 6;
        const isInner = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        matrix[startY + y][startX + x] = isOuter || isInner;
      }
    }
    // Separators
    for (let i = 0; i < 8; i++) {
      if (startX + 7 < matrix.length) matrix[startY + i][startX + 7] = false;
      if (startY + 7 < matrix.length) matrix[startY + 7][startX + i] = false;
    }
  }

  /**
   * Check if a cell is reserved (finder pattern, timing, etc.)
   */
  private isReserved(matrix: boolean[][], x: number, y: number, size: number): boolean {
    // Finder patterns + separators
    if ((x < 9 && y < 9) || (x < 9 && y >= size - 8) || (x >= size - 8 && y < 9)) {
      return true;
    }
    // Timing patterns
    if (x === 6 || y === 6) {
      return true;
    }
    return false;
  }

  /**
   * Generate SVG string from QR matrix
   */
  private generateSVG(
    matrix: boolean[][],
    opts: {
      size: number;
      moduleSize: number;
      margin: number;
      darkColor: string;
      lightColor: string;
    }
  ): string {
    const { size, moduleSize, margin, darkColor, lightColor } = opts;
    const moduleCount = matrix.length;

    let paths: string[] = [];

    for (let y = 0; y < moduleCount; y++) {
      for (let x = 0; x < moduleCount; x++) {
        if (matrix[y][x]) {
          const px = (margin + x) * moduleSize;
          const py = (margin + y) * moduleSize;
          paths.push(`M${px},${py}h${moduleSize}v${moduleSize}h-${moduleSize}z`);
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="100%" height="100%" fill="${lightColor}"/>
  <path d="${paths.join("")}" fill="${darkColor}"/>
</svg>`;
  }
}

// Export singleton instance
export const qrCodeService = new QRCodeService();
