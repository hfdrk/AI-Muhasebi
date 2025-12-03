import type {
  DocumentParsedType,
  ParsedInvoiceFields,
  ParsedBankStatementFields,
  ParsedDocumentFields,
  CreateDocumentParsedDataInput,
} from "@repo/core-domain";

/**
 * Document Parser Service - Rule-based Stub Implementation
 * 
 * TODO: Replace with LLM-based parsing:
 * - Use OpenAI GPT-4, Anthropic Claude, or similar LLM
 * - Send OCR text + document type hint to LLM
 * - Use structured output/function calling to extract fields
 * - Consider using prompt engineering for Turkish document formats
 */

export interface ParsedDocumentData {
  documentType: DocumentParsedType;
  fields: ParsedDocumentFields;
  parserVersion: string;
}

export class DocumentParserService {
  private readonly PARSER_VERSION = "1.0-stub";

  /**
   * Parse document from OCR text
   * @param rawText - Raw OCR text output
   * @param documentTypeHint - Hint about document type (INVOICE, BANK_STATEMENT, etc.)
   * @param tenantId - Tenant ID for context (not used in stub, but needed for future LLM context)
   * @returns Promise resolving to parsed document data
   */
  async parseDocument(
    rawText: string,
    documentTypeHint: string,
    tenantId: string
  ): Promise<ParsedDocumentData> {
    // Determine document type from hint or text analysis
    const documentType = this.detectDocumentType(documentTypeHint, rawText);

    // Parse based on document type
    let fields: ParsedDocumentFields;

    switch (documentType) {
      case "invoice":
        fields = this.parseInvoice(rawText);
        break;
      case "bank_statement":
        fields = this.parseBankStatement(rawText);
        break;
      case "receipt":
        fields = this.parseReceipt(rawText);
        break;
      default:
        fields = {};
    }

    return {
      documentType,
      fields,
      parserVersion: this.PARSER_VERSION,
    };
  }

  private detectDocumentType(hint: string, text: string): DocumentParsedType {
    const upperHint = hint.toUpperCase();
    const upperText = text.toUpperCase();

    if (upperHint.includes("INVOICE") || upperText.includes("FATURA")) {
      return "invoice";
    }
    if (upperHint.includes("BANK") || upperText.includes("BANKA") || upperText.includes("EKSTRE")) {
      return "bank_statement";
    }
    if (upperHint.includes("RECEIPT") || upperText.includes("FİŞ") || upperText.includes("MAKBUZ")) {
      return "receipt";
    }

    return "unknown";
  }

  private parseInvoice(text: string): ParsedInvoiceFields {
    const fields: ParsedInvoiceFields = {};

    // Extract invoice number
    const invoiceNumberMatch = text.match(
      /Fatura\s*(?:No|No\.|Numarası|Numara)[\s:]*([A-Z0-9\-]+)/i
    );
    if (invoiceNumberMatch) {
      fields.invoiceNumber = invoiceNumberMatch[1].trim();
    }

    // Extract dates (Turkish format: DD.MM.YYYY or DD/MM/YYYY)
    const datePatterns = [
      /(?:Tarih|Tarihi)[\s:]*(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/i,
      /(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/g,
    ];

    const dates: string[] = [];
    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        dates.push(...matches.map((m) => (m.includes(":") ? m.split(":")[1] : m).trim()));
      }
    }

    if (dates.length > 0) {
      fields.issueDate = dates[0];
      if (dates.length > 1) {
        fields.dueDate = dates[1];
      }
    }

    // Extract amounts
    const totalMatch = text.match(/(?:Toplam|Genel\s*Toplam|Tutar)[\s:]*([\d.,]+)/i);
    if (totalMatch) {
      const amountStr = totalMatch[1].replace(/\./g, "").replace(",", ".");
      fields.totalAmount = parseFloat(amountStr) || null;
    }

    const taxMatch = text.match(/(?:KDV|Vergi)[\s:]*([\d.,]+)/i);
    if (taxMatch) {
      const taxStr = taxMatch[1].replace(/\./g, "").replace(",", ".");
      fields.taxAmount = parseFloat(taxStr) || null;
    }

    const netMatch = text.match(/(?:Net|Ara\s*Toplam)[\s:]*([\d.,]+)/i);
    if (netMatch) {
      const netStr = netMatch[1].replace(/\./g, "").replace(",", ".");
      fields.netAmount = parseFloat(netStr) || null;
    }

    // Extract currency
    const currencyMatch = text.match(/(?:Para\s*Birimi|Currency)[\s:]*([A-Z]{3})/i);
    if (currencyMatch) {
      fields.currency = currencyMatch[1].toUpperCase();
    } else if (text.includes("TRY") || text.includes("TL")) {
      fields.currency = "TRY";
    }

    // Extract counterparty name
    const counterpartyPatterns = [
      /(?:Müşteri|Alıcı|Satıcı|Firma)[\s:]*([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü\s]+)/i,
      /(?:Company|Firm)[\s:]*([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü\s]+)/i,
    ];

    for (const pattern of counterpartyPatterns) {
      const match = text.match(pattern);
      if (match && match[1].length > 3) {
        fields.counterpartyName = match[1].trim();
        break;
      }
    }

    // Extract tax number
    const taxNumberMatch = text.match(/(?:Vergi\s*No|VKN|TCKN)[\s:]*([\d]+)/i);
    if (taxNumberMatch) {
      fields.counterpartyTaxNumber = taxNumberMatch[1].trim();
    }

    // Mock line items (in real implementation, would parse from text)
    fields.lineItems = [
      {
        description: "Örnek Ürün/Hizmet",
        quantity: 1,
        unitPrice: fields.totalAmount || 0,
        lineTotal: fields.totalAmount || 0,
        vatRate: 0.18,
        vatAmount: fields.taxAmount || 0,
      },
    ];

    return fields;
  }

  private parseBankStatement(text: string): ParsedBankStatementFields {
    const fields: ParsedBankStatementFields = {};

    // Extract account number
    const accountMatch = text.match(/(?:Hesap\s*No|IBAN)[\s:]*([A-Z0-9\s]+)/i);
    if (accountMatch) {
      fields.accountNumber = accountMatch[1].trim();
    }

    // Extract currency
    if (text.includes("TRY") || text.includes("TL")) {
      fields.currency = "TRY";
    } else {
      const currencyMatch = text.match(/([A-Z]{3})/);
      if (currencyMatch) {
        fields.currency = currencyMatch[1];
      }
    }

    // Extract dates
    const datePattern = /(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/g;
    const dates = text.match(datePattern);
    if (dates && dates.length >= 2) {
      fields.startDate = dates[0];
      fields.endDate = dates[dates.length - 1];
    }

    // Extract balances
    const startingBalanceMatch = text.match(/(?:Başlangıç|Açılış)\s*Bakiye[\s:]*([\d.,]+)/i);
    if (startingBalanceMatch) {
      const balanceStr = startingBalanceMatch[1].replace(/\./g, "").replace(",", ".");
      fields.startingBalance = parseFloat(balanceStr) || null;
    }

    const endingBalanceMatch = text.match(/(?:Bitiş|Kapanış)\s*Bakiye[\s:]*([\d.,]+)/i);
    if (endingBalanceMatch) {
      const balanceStr = endingBalanceMatch[1].replace(/\./g, "").replace(",", ".");
      fields.endingBalance = parseFloat(balanceStr) || null;
    }

    // Mock transactions (in real implementation, would parse from text)
    fields.transactions = [
      {
        date: fields.startDate || new Date().toISOString().split("T")[0],
        description: "Örnek İşlem",
        amount: 1000,
        balance: fields.startingBalance || 0,
      },
    ];

    return fields;
  }

  private parseReceipt(text: string): ParsedDocumentFields {
    // Receipt parsing similar to invoice but simpler
    const fields: ParsedDocumentFields = {};

    const amountMatch = text.match(/(?:Toplam|Tutar)[\s:]*([\d.,]+)/i);
    if (amountMatch) {
      const amountStr = amountMatch[1].replace(/\./g, "").replace(",", ".");
      fields.amount = parseFloat(amountStr) || null;
    }

    const dateMatch = text.match(/(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/);
    if (dateMatch) {
      fields.date = dateMatch[1];
    }

    return fields;
  }
}

export const documentParserService = new DocumentParserService();

