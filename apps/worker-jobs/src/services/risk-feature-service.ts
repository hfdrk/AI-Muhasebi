import { prisma } from "../lib/prisma";
import type {
  ParsedDocumentResult,
  RiskFeatureMap,
  RiskFlag,
  CreateDocumentRiskFeaturesInput,
} from "@repo/core-domain";
import type { ParsedInvoiceFields, ParsedBankStatementFields } from "@repo/core-domain";

/**
 * Risk Feature Service
 * 
 * Generates risk features and flags from parsed document data.
 * These features will be used for anomaly detection and risk scoring.
 */

export interface RiskFeaturesResult {
  features: RiskFeatureMap;
  riskFlags: RiskFlag[];
  riskScore: number | null;
}

export class RiskFeatureService {
  /**
   * Generate risk features from parsed document data
   * @param parsedData - Parsed document data
   * @param documentId - Document ID
   * @param tenantId - Tenant ID for duplicate checking
   * @returns Promise resolving to risk features
   */
  async generateRiskFeatures(
    parsedData: ParsedDocumentResult,
    documentId: string,
    tenantId: string
  ): Promise<RiskFeaturesResult> {
    const features: RiskFeatureMap = {};
    const flags: RiskFlag[] = [];

    // Process based on document type
    if (parsedData.documentType === "invoice") {
      const invoiceFields = parsedData.fields as ParsedInvoiceFields;
      await this.checkInvoiceRisks(invoiceFields, tenantId, documentId, features, flags);
    } else if (parsedData.documentType === "bank_statement") {
      const statementFields = parsedData.fields as ParsedBankStatementFields;
      this.checkBankStatementRisks(statementFields, features, flags);
    }

    // Calculate risk score (0-100, higher = more risk)
    const riskScore = this.calculateRiskScore(flags);

    return {
      features,
      riskFlags: flags,
      riskScore,
    };
  }

  private async checkInvoiceRisks(
    fields: ParsedInvoiceFields,
    tenantId: string,
    documentId: string,
    features: RiskFeatureMap,
    flags: RiskFlag[]
  ): Promise<void> {
    // Check for missing invoice number
    if (!fields.invoiceNumber || fields.invoiceNumber.trim() === "") {
      features.hasMissingFields = true;
      flags.push({
        code: "INVOICE_NUMBER_MISSING",
        severity: "high",
        description: "Fatura numarası bulunamadı",
      });
    }

    // Check for missing issue date
    if (!fields.issueDate) {
      features.hasMissingFields = true;
      flags.push({
        code: "ISSUE_DATE_MISSING",
        severity: "medium",
        description: "Fatura tarihi bulunamadı",
      });
    }

    // Check date inconsistency (due date earlier than issue date)
    if (fields.issueDate && fields.dueDate) {
      try {
        const issueDate = this.parseTurkishDate(fields.issueDate);
        const dueDate = this.parseTurkishDate(fields.dueDate);
        if (dueDate < issueDate) {
          features.dateInconsistency = true;
          flags.push({
            code: "DATE_INCONSISTENCY",
            severity: "high",
            description: "Vade tarihi, fatura tarihinden önce",
          });
        }
      } catch (e) {
        // Date parsing failed, skip this check
      }
    }

    // Check for negative amount
    if (fields.totalAmount !== null && fields.totalAmount !== undefined && fields.totalAmount < 0) {
      features.negativeAmount = true;
      flags.push({
        code: "NEGATIVE_AMOUNT",
        severity: "high",
        description: "Fatura tutarı negatif",
      });
    }

    // Check amount mismatch (total != sum of line items)
    if (fields.totalAmount !== null && fields.lineItems && fields.lineItems.length > 0) {
      const lineTotal = fields.lineItems.reduce((sum, item) => {
        return sum + (item.lineTotal || 0);
      }, 0);

      const tolerance = 0.01; // Allow small rounding differences
      if (fields.totalAmount !== null && fields.totalAmount !== undefined) {
        if (Math.abs(fields.totalAmount - lineTotal) > tolerance) {
          features.amountMismatch = true;
          flags.push({
            code: "AMOUNT_MISMATCH",
            severity: "medium",
            description: `Fatura toplamı (${fields.totalAmount}) ile satır toplamları (${lineTotal}) eşleşmiyor`,
            value: Math.abs(fields.totalAmount - lineTotal),
          });
        }
      }
    }

    // Check for duplicate invoice number within tenant
    if (fields.invoiceNumber) {
      await this.checkDuplicateInvoiceNumber(tenantId, documentId, fields.invoiceNumber, features, flags);
    }

    // Check for abnormally high amount (threshold: 1,000,000 TRY)
    if (fields.totalAmount !== null && fields.totalAmount !== undefined && fields.totalAmount > 1000000) {
      features.highAmount = true;
      flags.push({
        code: "HIGH_AMOUNT",
        severity: "medium",
        description: "Fatura tutarı anormal derecede yüksek",
        value: fields.totalAmount,
      });
    }

    // Check for missing counterparty information
    if (!fields.counterpartyName && !fields.counterpartyTaxNumber) {
      features.hasMissingFields = true;
      flags.push({
        code: "MISSING_COUNTERPARTY_INFO",
        severity: "medium",
        description: "Karşı taraf bilgileri eksik",
      });
    }
  }

  private checkBankStatementRisks(
    fields: ParsedBankStatementFields,
    features: RiskFeatureMap,
    flags: RiskFlag[]
  ): void {
    // Check for missing balances
    if (fields.startingBalance === null && fields.endingBalance === null) {
      features.hasMissingFields = true;
      flags.push({
        code: "MISSING_BALANCE_INFO",
        severity: "medium",
        description: "Bakiye bilgileri eksik",
      });
    }

    // Check for negative ending balance (if starting was positive)
    if (
      fields.startingBalance !== null &&
      fields.startingBalance !== undefined &&
      fields.startingBalance > 0 &&
      fields.endingBalance !== null &&
      fields.endingBalance !== undefined &&
      fields.endingBalance < 0
    ) {
      features.negativeBalance = true;
      flags.push({
        code: "NEGATIVE_BALANCE",
        severity: "high",
        description: "Bitiş bakiyesi negatif",
      });
    }

    // Check for high transaction amounts
    if (fields.transactions && fields.transactions.length > 0) {
      const highTransactions = fields.transactions.filter(
        (t) => t.amount && Math.abs(t.amount) > 100000
      );
      if (highTransactions.length > 0) {
        features.highAmount = true;
        flags.push({
          code: "HIGH_AMOUNT",
          severity: "medium",
          description: `${highTransactions.length} adet yüksek tutarlı işlem tespit edildi`,
          value: highTransactions.length,
        });
      }
    }
  }

  private async checkDuplicateInvoiceNumber(
    tenantId: string,
    currentDocumentId: string,
    invoiceNumber: string,
    features: RiskFeatureMap,
    flags: RiskFlag[]
  ): Promise<void> {
    try {
      // Check if this invoice number exists in other documents for this tenant
      // Note: Prisma JSON filtering can be complex, so we fetch all and filter in memory
      // In production, consider using raw SQL or a more efficient approach
      const existing = await prisma.documentParsedData.findMany({
        where: {
          tenantId,
          documentId: { not: currentDocumentId },
          documentType: "invoice",
        },
      });

      // Check if any existing document has the same invoice number
      const duplicate = existing.some((doc) => {
        const fields = doc.fields as any;
        return fields?.invoiceNumber === invoiceNumber;
      });

      if (duplicate) {
        features.duplicateInvoiceNumber = true;
        flags.push({
          code: "DUPLICATE_INVOICE_NUMBER",
          severity: "high",
          description: `Bu fatura numarası (${invoiceNumber}) daha önce kullanılmış`,
        });
      }
    } catch (error) {
      // If query fails, skip duplicate check
      // In production, might want to log this
    }
  }

  private parseTurkishDate(dateStr: string): Date {
    // Try DD.MM.YYYY or DD/MM/YYYY format
    const parts = dateStr.split(/[.\/]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    throw new Error("Invalid date format");
  }

  private calculateRiskScore(flags: RiskFlag[]): number {
    if (flags.length === 0) {
      return 0;
    }

    let score = 0;
    for (const flag of flags) {
      switch (flag.severity) {
        case "high":
          score += 30;
          break;
        case "medium":
          score += 15;
          break;
        case "low":
          score += 5;
          break;
      }
    }

    // Cap at 100
    return Math.min(100, score);
  }
}

export const riskFeatureService = new RiskFeatureService();

