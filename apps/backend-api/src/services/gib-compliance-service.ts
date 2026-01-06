/**
 * GİB (Gelir İdaresi Başkanlığı) Compliance Service
 *
 * Provides utilities for Turkish Tax Authority compliance:
 * - VKN/TCKN validation
 * - ETTN generation and validation
 * - QR code generation
 * - GİB status mapping
 * - UBL-TR format validation
 * - Error code translation
 */

import { logger } from "@repo/shared-utils";
import crypto from "crypto";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * GİB E-Fatura Status Codes
 */
export const GIB_EFATURA_STATUS = {
  DRAFT: "DRAFT", // Taslak
  QUEUED: "QUEUED", // Sırada bekliyor
  SENDING: "SENDING", // Gönderiliyor
  SENT: "SENT", // Gönderildi
  DELIVERED: "DELIVERED", // Teslim edildi
  ACCEPTED: "ACCEPTED", // Kabul edildi
  REJECTED: "REJECTED", // Reddedildi
  CANCELLED: "CANCELLED", // İptal edildi
  WAITING_RESPONSE: "WAITING_RESPONSE", // Yanıt bekleniyor
  FAILED: "FAILED", // Başarısız
} as const;

export type GibEFaturaStatus = (typeof GIB_EFATURA_STATUS)[keyof typeof GIB_EFATURA_STATUS];

/**
 * GİB E-Arşiv Status Codes
 */
export const GIB_EARSIV_STATUS = {
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
  SENT_TO_CUSTOMER: "SENT_TO_CUSTOMER",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
} as const;

export type GibEArsivStatus = (typeof GIB_EARSIV_STATUS)[keyof typeof GIB_EARSIV_STATUS];

/**
 * GİB E-Defter Status Codes
 */
export const GIB_EDEFTER_STATUS = {
  DRAFT: "DRAFT",
  GENERATED: "GENERATED",
  VALIDATED: "VALIDATED",
  SUBMITTED: "SUBMITTED",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  PENDING_CORRECTION: "PENDING_CORRECTION",
} as const;

export type GibEDefterStatus = (typeof GIB_EDEFTER_STATUS)[keyof typeof GIB_EDEFTER_STATUS];

/**
 * GİB Error Codes with Turkish descriptions
 */
export const GIB_ERROR_CODES: Record<string, { tr: string; en: string; severity: "error" | "warning" | "info" }> = {
  // Authentication Errors
  GIB_AUTH_001: { tr: "Kimlik doğrulama başarısız", en: "Authentication failed", severity: "error" },
  GIB_AUTH_002: { tr: "Oturum süresi doldu", en: "Session expired", severity: "warning" },
  GIB_AUTH_003: { tr: "Yetkisiz erişim", en: "Unauthorized access", severity: "error" },

  // VKN/TCKN Errors
  GIB_VKN_001: { tr: "Geçersiz VKN formatı", en: "Invalid VKN format", severity: "error" },
  GIB_VKN_002: { tr: "VKN GİB sisteminde kayıtlı değil", en: "VKN not registered in GİB system", severity: "error" },
  GIB_VKN_003: { tr: "E-Fatura mükellefi değil", en: "Not an E-Fatura taxpayer", severity: "warning" },

  // Invoice Errors
  GIB_INV_001: { tr: "Fatura formatı geçersiz", en: "Invalid invoice format", severity: "error" },
  GIB_INV_002: { tr: "Fatura numarası zaten kullanılmış", en: "Invoice number already used", severity: "error" },
  GIB_INV_003: { tr: "Fatura tutarı hatalı", en: "Invalid invoice amount", severity: "error" },
  GIB_INV_004: { tr: "KDV hesaplama hatası", en: "VAT calculation error", severity: "error" },
  GIB_INV_005: { tr: "Zorunlu alan eksik", en: "Required field missing", severity: "error" },
  GIB_INV_006: { tr: "Fatura iptal edilemez", en: "Invoice cannot be cancelled", severity: "error" },

  // E-Defter Errors
  GIB_DEF_001: { tr: "Dönem formatı hatalı", en: "Invalid period format", severity: "error" },
  GIB_DEF_002: { tr: "Borç/Alacak dengesi bozuk", en: "Debit/Credit imbalance", severity: "error" },
  GIB_DEF_003: { tr: "Önceki dönem eksik", en: "Previous period missing", severity: "error" },
  GIB_DEF_004: { tr: "Defter zaten gönderilmiş", en: "Ledger already submitted", severity: "warning" },

  // Network/System Errors
  GIB_SYS_001: { tr: "GİB sistemi geçici olarak kullanılamıyor", en: "GİB system temporarily unavailable", severity: "warning" },
  GIB_SYS_002: { tr: "Bağlantı zaman aşımı", en: "Connection timeout", severity: "error" },
  GIB_SYS_003: { tr: "Rate limit aşıldı", en: "Rate limit exceeded", severity: "warning" },
};

/**
 * Invoice Scenario Types for E-Fatura
 */
export const EFATURA_SCENARIOS = {
  TICARIFATURA: "TICARIFATURA", // Commercial Invoice
  TEMELFATURA: "TEMELFATURA", // Basic Invoice
  YOLCUBERABERI: "YOLCUBERABERI", // Passenger Accompanying
  IHRACAT: "IHRACAT", // Export
  KAMU: "KAMU", // Public Sector
  OZELFATURA: "OZELFATURA", // Special Invoice
  HKS: "HKS", // Hal Kayıt Sistemi (Agricultural Market)
  SGK: "SGK", // Social Security Institution
} as const;

export type EFaturaScenario = (typeof EFATURA_SCENARIOS)[keyof typeof EFATURA_SCENARIOS];

/**
 * Invoice Types
 */
export const INVOICE_TYPES = {
  SATIS: "SATIS", // Sales
  IADE: "IADE", // Return
  TEVKIFAT: "TEVKIFAT", // Withholding
  ISTISNA: "ISTISNA", // Exception
  OZELMATRAH: "OZELMATRAH", // Special Base
  IHRACKAYITLI: "IHRACKAYITLI", // Export Registered
} as const;

export type InvoiceType = (typeof INVOICE_TYPES)[keyof typeof INVOICE_TYPES];

// =============================================================================
// GİB COMPLIANCE SERVICE CLASS
// =============================================================================

export class GibComplianceService {
  /**
   * Validate Turkish Tax Number (VKN - 10 digits)
   */
  validateVKN(vkn: string): { valid: boolean; error?: string } {
    if (!vkn) {
      return { valid: false, error: "VKN boş olamaz" };
    }

    const cleanVkn = vkn.replace(/\s/g, "");

    if (!/^\d{10}$/.test(cleanVkn)) {
      return { valid: false, error: "VKN 10 haneli rakam olmalıdır" };
    }

    // VKN checksum validation (Turkish algorithm)
    const digits = cleanVkn.split("").map(Number);
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      const temp = (digits[i] + 10 - (i + 1)) % 10;
      sum += temp === 9 ? temp : (temp * Math.pow(2, 10 - (i + 1))) % 9;
    }

    const checkDigit = (10 - (sum % 10)) % 10;

    if (digits[9] !== checkDigit) {
      return { valid: false, error: "VKN kontrol hanesi geçersiz" };
    }

    return { valid: true };
  }

  /**
   * Validate Turkish National ID (TCKN - 11 digits)
   */
  validateTCKN(tckn: string): { valid: boolean; error?: string } {
    if (!tckn) {
      return { valid: false, error: "TCKN boş olamaz" };
    }

    const cleanTckn = tckn.replace(/\s/g, "");

    if (!/^\d{11}$/.test(cleanTckn)) {
      return { valid: false, error: "TCKN 11 haneli rakam olmalıdır" };
    }

    // TCKN cannot start with 0
    if (cleanTckn[0] === "0") {
      return { valid: false, error: "TCKN 0 ile başlayamaz" };
    }

    const digits = cleanTckn.split("").map(Number);

    // Checksum validation
    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7];

    const check10 = (oddSum * 7 - evenSum) % 10;
    const check11 = (oddSum + evenSum + digits[9]) % 10;

    if (digits[9] !== check10) {
      return { valid: false, error: "TCKN 10. hane kontrol hatası" };
    }

    if (digits[10] !== check11) {
      return { valid: false, error: "TCKN 11. hane kontrol hatası" };
    }

    return { valid: true };
  }

  /**
   * Validate either VKN or TCKN
   */
  validateTaxId(taxId: string): { valid: boolean; type: "VKN" | "TCKN" | null; error?: string } {
    const clean = taxId.replace(/\s/g, "");

    if (clean.length === 10) {
      const result = this.validateVKN(clean);
      return { ...result, type: result.valid ? "VKN" : null };
    }

    if (clean.length === 11) {
      const result = this.validateTCKN(clean);
      return { ...result, type: result.valid ? "TCKN" : null };
    }

    return { valid: false, type: null, error: "Vergi kimlik numarası 10 veya 11 haneli olmalıdır" };
  }

  /**
   * Generate ETTN (E-Fatura Transaction Number)
   * Format: UUID v4 without dashes (32 hex characters)
   */
  generateETTN(): string {
    return crypto.randomUUID().replace(/-/g, "").toUpperCase();
  }

  /**
   * Validate ETTN format
   */
  validateETTN(ettn: string): boolean {
    return /^[A-F0-9]{32}$/i.test(ettn);
  }

  /**
   * Generate Invoice ID according to GİB format
   * Format: {PREFIX}{YEAR}{SERIAL} - e.g., ABC2024000001
   */
  generateInvoiceId(prefix: string, year: number, serial: number): string {
    const paddedPrefix = prefix.toUpperCase().substring(0, 3).padEnd(3, "X");
    const paddedSerial = serial.toString().padStart(9, "0");
    return `${paddedPrefix}${year}${paddedSerial}`;
  }

  /**
   * Generate QR Code data for E-Arşiv invoice
   * Contains URL to verify invoice on GİB portal
   */
  generateEArsivQRData(params: {
    ettn: string;
    vkn: string;
    invoiceDate: Date;
    invoiceAmount: number;
  }): string {
    const { ettn, vkn, invoiceDate, invoiceAmount } = params;

    // Generate verification hash
    const dataToHash = `${ettn}${vkn}${invoiceDate.toISOString()}${invoiceAmount}`;
    const verificationHash = crypto
      .createHash("sha256")
      .update(dataToHash)
      .digest("hex")
      .substring(0, 16);

    // E-Arşiv portal URL format
    const baseUrl = "https://earsivportal.efatura.gov.tr/intragibi/pages/FaturaGoruntule.xhtml";
    const qrData = `${baseUrl}?ettn=${ettn}&hmac=${verificationHash}`;

    return qrData;
  }

  /**
   * Generate E-Fatura QR Code data
   */
  generateEFaturaQRData(params: {
    ettn: string;
    senderVkn: string;
    receiverVkn: string;
    invoiceDate: Date;
  }): string {
    const { ettn, senderVkn, receiverVkn, invoiceDate } = params;

    const dateStr = invoiceDate.toISOString().split("T")[0].replace(/-/g, "");
    const verificationHash = crypto
      .createHash("sha256")
      .update(`${ettn}${senderVkn}${receiverVkn}${dateStr}`)
      .digest("hex")
      .substring(0, 16);

    return `https://efatura.gov.tr/verify?ettn=${ettn}&h=${verificationHash}`;
  }

  /**
   * Translate GİB error code to human-readable message
   */
  translateError(
    errorCode: string,
    language: "tr" | "en" = "tr"
  ): { message: string; severity: "error" | "warning" | "info" } {
    const error = GIB_ERROR_CODES[errorCode];

    if (error) {
      return {
        message: language === "tr" ? error.tr : error.en,
        severity: error.severity,
      };
    }

    return {
      message: language === "tr" ? `Bilinmeyen hata: ${errorCode}` : `Unknown error: ${errorCode}`,
      severity: "error",
    };
  }

  /**
   * Map internal status to GİB status
   */
  mapToGibStatus(
    internalStatus: string,
    type: "efatura" | "earsiv" | "edefter"
  ): string {
    const statusMaps: Record<string, Record<string, string>> = {
      efatura: {
        DRAFT: GIB_EFATURA_STATUS.DRAFT,
        PENDING: GIB_EFATURA_STATUS.QUEUED,
        SUBMITTED: GIB_EFATURA_STATUS.SENT,
        ACCEPTED: GIB_EFATURA_STATUS.ACCEPTED,
        REJECTED: GIB_EFATURA_STATUS.REJECTED,
        CANCELLED: GIB_EFATURA_STATUS.CANCELLED,
        FAILED: GIB_EFATURA_STATUS.FAILED,
      },
      earsiv: {
        DRAFT: GIB_EARSIV_STATUS.DRAFT,
        ARCHIVED: GIB_EARSIV_STATUS.ARCHIVED,
        SENT: GIB_EARSIV_STATUS.SENT_TO_CUSTOMER,
        CANCELLED: GIB_EARSIV_STATUS.CANCELLED,
        FAILED: GIB_EARSIV_STATUS.FAILED,
      },
      edefter: {
        DRAFT: GIB_EDEFTER_STATUS.DRAFT,
        GENERATED: GIB_EDEFTER_STATUS.GENERATED,
        VALIDATED: GIB_EDEFTER_STATUS.VALIDATED,
        SUBMITTED: GIB_EDEFTER_STATUS.SUBMITTED,
        ACCEPTED: GIB_EDEFTER_STATUS.ACCEPTED,
        REJECTED: GIB_EDEFTER_STATUS.REJECTED,
      },
    };

    return statusMaps[type]?.[internalStatus] || internalStatus;
  }

  /**
   * Validate UBL-TR invoice structure
   */
  validateUBLStructure(ublXml: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic structure checks
    if (!ublXml.includes("<Invoice")) {
      errors.push("Fatura root elementi eksik");
    }

    if (!ublXml.includes("<cbc:ID>")) {
      errors.push("Fatura numarası (ID) eksik");
    }

    if (!ublXml.includes("<cbc:IssueDate>")) {
      errors.push("Fatura tarihi eksik");
    }

    if (!ublXml.includes("<cac:AccountingSupplierParty>")) {
      errors.push("Satıcı bilgileri eksik");
    }

    if (!ublXml.includes("<cac:AccountingCustomerParty>")) {
      errors.push("Alıcı bilgileri eksik");
    }

    if (!ublXml.includes("<cac:TaxTotal>")) {
      errors.push("Vergi toplamı eksik");
    }

    if (!ublXml.includes("<cac:LegalMonetaryTotal>")) {
      errors.push("Parasal toplamlar eksik");
    }

    // Check for required namespaces
    const requiredNamespaces = [
      "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
      "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
      "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    ];

    for (const ns of requiredNamespaces) {
      if (!ublXml.includes(ns)) {
        errors.push(`Zorunlu namespace eksik: ${ns}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Calculate KDV (VAT) amounts with rounding per Turkish regulations
   */
  calculateKDV(params: {
    netAmount: number;
    kdvRate: number;
    isKdvIncluded?: boolean;
  }): {
    matrah: number; // Tax base
    kdvTutari: number; // VAT amount
    toplamTutar: number; // Total amount
  } {
    const { netAmount, kdvRate, isKdvIncluded = false } = params;

    let matrah: number;
    let kdvTutari: number;
    let toplamTutar: number;

    if (isKdvIncluded) {
      // KDV dahil tutardan hesaplama
      toplamTutar = netAmount;
      matrah = Math.round((netAmount / (1 + kdvRate / 100)) * 100) / 100;
      kdvTutari = Math.round((toplamTutar - matrah) * 100) / 100;
    } else {
      // KDV hariç tutardan hesaplama
      matrah = netAmount;
      kdvTutari = Math.round((matrah * (kdvRate / 100)) * 100) / 100;
      toplamTutar = Math.round((matrah + kdvTutari) * 100) / 100;
    }

    return { matrah, kdvTutari, toplamTutar };
  }

  /**
   * Validate invoice amounts for consistency
   */
  validateInvoiceAmounts(params: {
    lineItems: Array<{ quantity: number; unitPrice: number; kdvRate: number }>;
    declaredSubtotal: number;
    declaredKdv: number;
    declaredTotal: number;
    tolerance?: number;
  }): { valid: boolean; errors: string[] } {
    const { lineItems, declaredSubtotal, declaredKdv, declaredTotal, tolerance = 0.01 } = params;
    const errors: string[] = [];

    // Calculate from line items
    let calculatedSubtotal = 0;
    let calculatedKdv = 0;

    for (const item of lineItems) {
      const lineTotal = item.quantity * item.unitPrice;
      calculatedSubtotal += lineTotal;
      calculatedKdv += lineTotal * (item.kdvRate / 100);
    }

    calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;
    calculatedKdv = Math.round(calculatedKdv * 100) / 100;
    const calculatedTotal = calculatedSubtotal + calculatedKdv;

    // Compare with declared amounts
    if (Math.abs(calculatedSubtotal - declaredSubtotal) > tolerance) {
      errors.push(
        `Ara toplam uyuşmazlığı: Hesaplanan ${calculatedSubtotal}, Beyan edilen ${declaredSubtotal}`
      );
    }

    if (Math.abs(calculatedKdv - declaredKdv) > tolerance) {
      errors.push(`KDV uyuşmazlığı: Hesaplanan ${calculatedKdv}, Beyan edilen ${declaredKdv}`);
    }

    if (Math.abs(calculatedTotal - declaredTotal) > tolerance) {
      errors.push(
        `Toplam uyuşmazlığı: Hesaplanan ${calculatedTotal}, Beyan edilen ${declaredTotal}`
      );
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generate E-Defter period identifier
   * Format: YYYY-MM for monthly, YYYY-Q# for quarterly
   */
  generateEDefterPeriod(
    date: Date,
    periodType: "monthly" | "quarterly" | "yearly"
  ): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    switch (periodType) {
      case "monthly":
        return `${year}-${month.toString().padStart(2, "0")}`;
      case "quarterly":
        const quarter = Math.ceil(month / 3);
        return `${year}-Q${quarter}`;
      case "yearly":
        return `${year}`;
      default:
        return `${year}-${month.toString().padStart(2, "0")}`;
    }
  }

  /**
   * Validate E-Defter entries for double-entry bookkeeping
   */
  validateDoubleEntry(entries: Array<{ borc: number; alacak: number }>): {
    valid: boolean;
    totalBorc: number;
    totalAlacak: number;
    difference: number;
  } {
    const totalBorc = entries.reduce((sum, e) => sum + (e.borc || 0), 0);
    const totalAlacak = entries.reduce((sum, e) => sum + (e.alacak || 0), 0);
    const difference = Math.abs(totalBorc - totalAlacak);

    return {
      valid: difference < 0.01, // Allow 1 kuruş tolerance
      totalBorc: Math.round(totalBorc * 100) / 100,
      totalAlacak: Math.round(totalAlacak * 100) / 100,
      difference: Math.round(difference * 100) / 100,
    };
  }

  /**
   * Format amount for Turkish display
   */
  formatTurkishAmount(amount: number): string {
    return amount.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Format date for GİB API
   */
  formatGibDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Format datetime for GİB API
   */
  formatGibDateTime(date: Date): string {
    return date.toISOString().replace("Z", "+03:00"); // Turkey timezone
  }

  /**
   * Check if VKN is registered as E-Fatura mükellef
   * This would typically call GİB API
   */
  async checkEFaturaRegistration(vkn: string): Promise<{
    registered: boolean;
    alias?: string;
    title?: string;
    registrationDate?: Date;
  }> {
    // Validate VKN first
    const validation = this.validateVKN(vkn);
    if (!validation.valid) {
      return { registered: false };
    }

    // In production, this would call GİB's mükellef sorgulama API
    // For now, return mock data
    logger.info("Checking E-Fatura registration for VKN", undefined, { vkn });

    // Mock implementation - in production, call actual GİB API
    return {
      registered: true,
      alias: `urn:mail:${vkn}@hs01.kep.tr`,
      title: "Örnek Şirket A.Ş.",
      registrationDate: new Date("2020-01-01"),
    };
  }

  /**
   * Get Ba-Bs requirement threshold (currently 5,000 TL)
   */
  getBaBsThreshold(): number {
    return 5000; // TL
  }

  /**
   * Check if transaction requires Ba-Bs reporting
   */
  requiresBaBsReporting(amount: number): boolean {
    return amount >= this.getBaBsThreshold();
  }

  /**
   * Generate Ba form code (for purchases)
   */
  generateBaFormCode(): string {
    return "Form Ba";
  }

  /**
   * Generate Bs form code (for sales)
   */
  generateBsFormCode(): string {
    return "Form Bs";
  }
}

export const gibComplianceService = new GibComplianceService();
