import type {
  DocumentParsedType,
  ParsedInvoiceFields,
  ParsedBankStatementFields,
  ParsedContractFields,
  ParsedDocumentFields,
  ParsedDocumentResult,
  CreateDocumentParsedDataInput,
} from "@repo/core-domain";
import { createLLMClient, hasRealAIProvider, logger } from "@repo/shared-utils";

/**
 * Document Parser Service - LLM-Based with Rule-based Fallback
 * 
 * Uses LLM (GPT-4, Claude, etc.) for high-accuracy document parsing.
 * Falls back to rule-based parsing if LLM is unavailable or fails.
 */

export interface ParsedDocumentData {
  documentType: DocumentParsedType;
  fields: ParsedDocumentFields;
  parserVersion: string;
}

export class DocumentParserService {
  private readonly PARSER_VERSION = "2.0-llm";
  private readonly FALLBACK_PARSER_VERSION = "1.0-stub";
  private llmClient: ReturnType<typeof createLLMClient> | null = null;

  /**
   * Parse document from OCR text
   * @param rawText - Raw OCR text output
   * @param documentTypeHint - Hint about document type (INVOICE, BANK_STATEMENT, etc.)
   * @param tenantId - Tenant ID for context
   * @returns Promise resolving to parsed document data
   */
  async parseDocument(
    rawText: string,
    documentTypeHint: string,
    tenantId: string
  ): Promise<ParsedDocumentResult> {
    // Try LLM-based parsing first if available
    if (hasRealAIProvider()) {
      try {
        if (!this.llmClient) {
          this.llmClient = createLLMClient();
        }

        const result = await this.parseWithLLM(rawText, documentTypeHint, tenantId);
        if (result) {
          return {
            ...result,
            parserVersion: this.PARSER_VERSION,
          };
        }
      } catch (error) {
        logger.warn("LLM parsing failed, falling back to rule-based parser:", error);
        // Fall through to rule-based parsing
      }
    }

    // Fallback to rule-based parsing
    return this.parseWithRules(rawText, documentTypeHint);
  }

  /**
   * Parse document using LLM
   */
  private async parseWithLLM(
    rawText: string,
    documentTypeHint: string,
    tenantId: string
  ): Promise<ParsedDocumentResult | null> {
    if (!this.llmClient) {
      return null;
    }

    // Determine document type
    const documentType = this.detectDocumentType(documentTypeHint, rawText);

    // Create JSON schema based on document type
    const jsonSchema = this.getJSONSchemaForDocumentType(documentType);

    // Create system prompt
    const systemPrompt = this.getSystemPrompt(documentType);

    // Create user prompt with OCR text
    const userPrompt = this.getUserPrompt(rawText, documentTypeHint, documentType);

    try {
      // Call LLM with structured output
      const parsedData = await this.llmClient.generateJSON({
        systemPrompt,
        userPrompt,
        jsonSchema,
        maxTokens: 4000,
      });

      // Validate and map the response
      const fields = this.mapLLMResponseToFields(parsedData, documentType);

      return {
        documentType,
        fields,
        parserVersion: this.PARSER_VERSION,
      };
    } catch (error) {
      logger.error("LLM parsing error:", error);
      return null;
    }
  }

  /**
   * Parse document using rule-based approach (fallback)
   */
  private parseWithRules(
    rawText: string,
    documentTypeHint: string
  ): ParsedDocumentResult {
    const documentType = this.detectDocumentType(documentTypeHint, rawText);

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
      case "contract":
        fields = this.parseContract(rawText);
        break;
      default:
        fields = {};
    }

    return {
      documentType,
      fields,
      parserVersion: this.FALLBACK_PARSER_VERSION,
    };
  }

  /**
   * Get JSON schema for document type
   */
  private getJSONSchemaForDocumentType(documentType: DocumentParsedType): object {
    switch (documentType) {
      case "invoice":
        return {
          type: "object",
          properties: {
            invoiceNumber: { type: "string" },
            issueDate: { type: "string", format: "date" },
            dueDate: { type: "string", format: "date", nullable: true },
            totalAmount: { type: "number" },
            taxAmount: { type: "number", nullable: true },
            netAmount: { type: "number", nullable: true },
            currency: { type: "string", default: "TRY" },
            counterpartyName: { type: "string", nullable: true },
            counterpartyTaxNumber: { type: "string", nullable: true },
            lineItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unitPrice: { type: "number" },
                  lineTotal: { type: "number" },
                  vatRate: { type: "number" },
                  vatAmount: { type: "number" },
                },
              },
            },
          },
          required: ["invoiceNumber", "issueDate", "totalAmount"],
        };
      case "bank_statement":
        return {
          type: "object",
          properties: {
            accountNumber: { type: "string" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
            startingBalance: { type: "number", nullable: true },
            endingBalance: { type: "number", nullable: true },
            currency: { type: "string", default: "TRY" },
            transactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string", format: "date" },
                  description: { type: "string" },
                  amount: { type: "number" },
                  balance: { type: "number", nullable: true },
                },
              },
            },
          },
        };
      case "contract":
        return {
          type: "object",
          properties: {
            contractNumber: { type: "string", nullable: true },
            contractDate: { type: "string", format: "date", nullable: true },
            startDate: { type: "string", format: "date", nullable: true },
            endDate: { type: "string", format: "date", nullable: true },
            expirationDate: { type: "string", format: "date", nullable: true },
            value: { type: "number", nullable: true },
            currency: { type: "string", default: "TRY" },
            contractType: { type: "string", nullable: true },
            parties: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: { type: "string", nullable: true },
                  taxNumber: { type: "string", nullable: true },
                },
              },
            },
            terms: { type: "string", nullable: true },
            renewalTerms: { type: "string", nullable: true },
          },
        };
      default:
        return {
          type: "object",
          properties: {
            amount: { type: "number", nullable: true },
            date: { type: "string", format: "date", nullable: true },
          },
        };
    }
  }

  /**
   * Get system prompt for document type
   */
  private getSystemPrompt(documentType: DocumentParsedType): string {
    const basePrompt = `Sen bir belge analiz uzmanısın. Türkçe belgelerden yapılandırılmış veri çıkarıyorsun.
Belgeler Türk muhasebe standartlarına uygun formatta olabilir.
Tarihler Türk formatında (DD.MM.YYYY veya DD/MM/YYYY) olabilir.
Tutarlar Türk formatında (1.234,56) veya uluslararası format (1,234.56) olabilir.
Tüm sayısal değerleri doğru parse et ve JSON formatında döndür.`;

    switch (documentType) {
      case "invoice":
        return `${basePrompt}
Fatura belgelerinden fatura numarası, tarihler, tutarlar, KDV bilgileri, müşteri/tedarikçi bilgileri ve kalem detaylarını çıkar.
Türk fatura formatlarını (e-fatura, e-arşiv, kağıt fatura) destekle.`;
      case "bank_statement":
        return `${basePrompt}
Banka ekstrelerinden hesap bilgileri, tarih aralığı, bakiyeler ve işlem listesini çıkar.
Türk banka ekstre formatlarını destekle.`;
      case "contract":
        return `${basePrompt}
Sözleşme belgelerinden sözleşme numarası, tarihler, taraflar, değer, sözleşme türü ve şartları çıkar.
Türk sözleşme formatlarını destekle.`;
      default:
        return basePrompt;
    }
  }

  /**
   * Get user prompt with OCR text
   */
  private getUserPrompt(
    rawText: string,
    documentTypeHint: string,
    documentType: DocumentParsedType
  ): string {
    const textPreview = rawText.length > 5000 ? rawText.substring(0, 5000) + "..." : rawText;

    return `Belge Tipi İpucu: ${documentTypeHint}
Tespit Edilen Tip: ${documentType}

OCR Metni:
${textPreview}

Yukarıdaki OCR metninden yapılandırılmış verileri çıkar ve JSON formatında döndür.
Eksik bilgiler için null değer kullan.
Tarihleri ISO formatında (YYYY-MM-DD) döndür.
Tutarları sayısal değer olarak döndür (ondalık ayırıcı: nokta).`;
  }

  /**
   * Map LLM JSON response to ParsedDocumentFields
   */
  private mapLLMResponseToFields(
    parsedData: any,
    documentType: DocumentParsedType
  ): ParsedDocumentFields {
    // Convert date strings to the format expected by the system
    const normalizeDate = (dateStr: string | null | undefined): string | undefined => {
      if (!dateStr) return undefined;
      // If already in ISO format, return as is
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      // Try to parse and convert
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split("T")[0];
        }
      } catch {
        // Ignore parse errors
      }
      return dateStr;
    };

    switch (documentType) {
      case "invoice": {
        const fields: ParsedInvoiceFields = {
          invoiceNumber: parsedData.invoiceNumber || undefined,
          issueDate: normalizeDate(parsedData.issueDate),
          dueDate: normalizeDate(parsedData.dueDate),
          totalAmount: parsedData.totalAmount || undefined,
          taxAmount: parsedData.taxAmount || undefined,
          netAmount: parsedData.netAmount || undefined,
          currency: parsedData.currency || "TRY",
          counterpartyName: parsedData.counterpartyName || undefined,
          counterpartyTaxNumber: parsedData.counterpartyTaxNumber || undefined,
          lineItems: parsedData.lineItems?.map((item: any) => ({
            description: item.description || "",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            lineTotal: item.lineTotal || 0,
            vatRate: item.vatRate || 0,
            vatAmount: item.vatAmount || 0,
          })) || [],
        };
        return fields;
      }
      case "bank_statement": {
        const fields: ParsedBankStatementFields = {
          accountNumber: parsedData.accountNumber || undefined,
          startDate: normalizeDate(parsedData.startDate),
          endDate: normalizeDate(parsedData.endDate),
          startingBalance: parsedData.startingBalance || null,
          endingBalance: parsedData.endingBalance || null,
          currency: parsedData.currency || "TRY",
          transactions: parsedData.transactions?.map((txn: any) => ({
            date: normalizeDate(txn.date) || new Date().toISOString().split("T")[0],
            description: txn.description || "",
            amount: txn.amount || 0,
            balance: txn.balance || null,
          })) || [],
        };
        return fields;
      }
      case "contract": {
        const fields: ParsedContractFields = {
          contractNumber: parsedData.contractNumber || undefined,
          contractDate: normalizeDate(parsedData.contractDate),
          startDate: normalizeDate(parsedData.startDate),
          endDate: normalizeDate(parsedData.endDate),
          expirationDate: normalizeDate(parsedData.expirationDate),
          value: parsedData.value || undefined,
          currency: parsedData.currency || "TRY",
          contractType: parsedData.contractType || undefined,
          parties: parsedData.parties?.map((party: any) => ({
            name: party.name,
            role: party.role || undefined,
            taxNumber: party.taxNumber || undefined,
          })) || [],
          terms: parsedData.terms || undefined,
          renewalTerms: parsedData.renewalTerms || undefined,
        };
        return fields;
      }
      default: {
        return {
          amount: parsedData.amount || null,
          date: normalizeDate(parsedData.date),
        };
      }
    }
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
    if (
      upperHint.includes("CONTRACT") ||
      upperText.includes("SÖZLEŞME") ||
      upperText.includes("MUKAVELE") ||
      upperText.includes("ANLAŞMA")
    ) {
      return "contract";
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

    // Extract amounts - try multiple patterns to handle different formats
    const amountPatterns = [
      // Standard patterns: "Toplam: 1.234,56" or "Toplam 1234.56" or "Toplam: 1,234.56"
      /(?:Toplam|Genel\s*Toplam|Tutar|TOPLAM)[\s:]*([\d.,\s]+)/i,
      // Patterns with currency: "1.234,56 TL" or "1234.56 TRY"
      /([\d.,\s]+)\s*(?:TL|TRY|EUR|USD)/i,
      // Patterns at end of line: "Toplam\n1.234,56"
      /(?:Toplam|Tutar)[\s:]*\n\s*([\d.,\s]+)/i,
    ];

    // Try to extract total amount
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amountStr = match[1].trim().replace(/\s/g, "");
        // Handle Turkish format: 1.234,56 or international: 1,234.56
        let normalizedStr = amountStr;
        if (amountStr.includes(",")) {
          // Has comma - could be Turkish (1.234,56) or international (1,234.56)
          const commaIndex = amountStr.lastIndexOf(",");
          const beforeComma = amountStr.substring(0, commaIndex);
          const afterComma = amountStr.substring(commaIndex + 1);
          // If there are dots before comma, it's Turkish format
          if (beforeComma.includes(".")) {
            // Turkish format: 1.234,56
            normalizedStr = beforeComma.replace(/\./g, "") + "." + afterComma;
          } else {
            // International format: 1,234.56
            normalizedStr = beforeComma.replace(/,/g, "") + "." + afterComma;
          }
        } else if (amountStr.includes(".") && amountStr.split(".").length > 2) {
          // Multiple dots but no comma - likely Turkish format without decimal: 1.234
          normalizedStr = amountStr.replace(/\./g, "");
        }
        const parsed = parseFloat(normalizedStr);
        if (!isNaN(parsed) && parsed > 0) {
          fields.totalAmount = parsed;
          break;
        }
      }
    }

    // Extract KDV/VAT amount
    const taxPatterns = [
      /(?:KDV|Vergi|VAT)[\s:]*([\d.,\s]+)/i,
      /(?:KDV|Vergi)[\s:]*\n\s*([\d.,\s]+)/i,
    ];
    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amountStr = match[1].trim().replace(/\s/g, "");
        let normalizedStr = amountStr;
        if (amountStr.includes(",") && amountStr.split(",").length === 2) {
          normalizedStr = amountStr.replace(/\./g, "").replace(",", ".");
        } else if (amountStr.includes(".") && amountStr.split(".").length > 2) {
          const parts = amountStr.split(",");
          normalizedStr = parts[0].replace(/\./g, "") + "." + (parts[1] || "00");
        }
        const parsed = parseFloat(normalizedStr);
        if (!isNaN(parsed) && parsed > 0) {
          fields.taxAmount = parsed;
          break;
        }
      }
    }

    // Extract net amount
    const netPatterns = [
      /(?:Net|Ara\s*Toplam|Net\s*Tutar)[\s:]*([\d.,\s]+)/i,
      /(?:Net|Ara\s*Toplam)[\s:]*\n\s*([\d.,\s]+)/i,
    ];
    for (const pattern of netPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amountStr = match[1].trim().replace(/\s/g, "");
        let normalizedStr = amountStr;
        if (amountStr.includes(",") && amountStr.split(",").length === 2) {
          normalizedStr = amountStr.replace(/\./g, "").replace(",", ".");
        } else if (amountStr.includes(".") && amountStr.split(".").length > 2) {
          const parts = amountStr.split(",");
          normalizedStr = parts[0].replace(/\./g, "") + "." + (parts[1] || "00");
        }
        const parsed = parseFloat(normalizedStr);
        if (!isNaN(parsed) && parsed > 0) {
          fields.netAmount = parsed;
          break;
        }
      }
    }

    // If we have totalAmount but not netAmount or taxAmount, try to calculate
    if (fields.totalAmount && !fields.netAmount && !fields.taxAmount) {
      // Try to find net and tax separately
      // This is a fallback - ideally the patterns above should catch them
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

  private parseContract(text: string): ParsedContractFields {
    const fields: ParsedContractFields = {};

    // Extract contract number
    const contractNumberPatterns = [
      /(?:Sözleşme\s*(?:No|No\.|Numarası|Numara)|Contract\s*(?:No|Number))[\s:]*([A-Z0-9\-]+)/i,
      /(?:Sözleşme|Contract)[\s:]*([A-Z0-9\-]+)/i,
    ];

    for (const pattern of contractNumberPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        fields.contractNumber = match[1].trim();
        break;
      }
    }

    // Extract contract date
    const contractDatePatterns = [
      /(?:Sözleşme\s*Tarihi|Contract\s*Date|İmza\s*Tarihi)[\s:]*(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/i,
      /(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/g,
    ];

    for (const pattern of contractDatePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        fields.contractDate = match[1];
        break;
      }
    }

    // Extract start date
    const startDatePatterns = [
      /(?:Başlangıç\s*Tarihi|Start\s*Date|Başlama\s*Tarihi)[\s:]*(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/i,
      /(?:Geçerlilik\s*Başlangıcı|Valid\s*From)[\s:]*(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/i,
    ];

    for (const pattern of startDatePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        fields.startDate = match[1];
        break;
      }
    }

    // Extract end date / expiration date
    const endDatePatterns = [
      /(?:Bitiş\s*Tarihi|End\s*Date|Bitiş\s*Tarihi)[\s:]*(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/i,
      /(?:Geçerlilik\s*Bitişi|Valid\s*Until|Expiration\s*Date)[\s:]*(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/i,
      /(?:Süre|Duration)[\s:]*(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/i,
    ];

    for (const pattern of endDatePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        fields.endDate = match[1];
        fields.expirationDate = match[1]; // Same as end date for contracts
        break;
      }
    }

    // Extract contract value
    const valuePatterns = [
      /(?:Sözleşme\s*Bedeli|Contract\s*Value|Tutar|Amount)[\s:]*([\d.,]+)/i,
      /(?:Toplam\s*Tutar|Total\s*Amount)[\s:]*([\d.,]+)/i,
    ];

    for (const pattern of valuePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const valueStr = match[1].replace(/\./g, "").replace(",", ".");
        const parsed = parseFloat(valueStr);
        if (!isNaN(parsed) && parsed > 0) {
          fields.value = parsed;
          break;
        }
      }
    }

    // Extract currency
    const currencyMatch = text.match(/(?:Para\s*Birimi|Currency)[\s:]*([A-Z]{3})/i);
    if (currencyMatch) {
      fields.currency = currencyMatch[1].toUpperCase();
    } else if (text.includes("TRY") || text.includes("TL")) {
      fields.currency = "TRY";
    }

    // Extract parties (contract parties)
    const parties: Array<{ name?: string; role?: string; taxNumber?: string }> = [];

    // Try to find party names and roles
    const partyPatterns = [
      /(?:Taraflar|Parties)[\s:]*([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü\s]+)/i,
      /(?:Birinci\s*Taraf|First\s*Party)[\s:]*([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü\s]+)/i,
      /(?:İkinci\s*Taraf|Second\s*Party)[\s:]*([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü\s]+)/i,
    ];

    for (const pattern of partyPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].length > 3) {
        parties.push({
          name: match[1].trim(),
        });
      }
    }

    // Extract tax numbers for parties
    const taxNumberMatches = text.matchAll(/(?:Vergi\s*No|VKN|TCKN)[\s:]*([\d]+)/gi);
    for (const match of taxNumberMatches) {
      if (parties.length > 0) {
        const lastParty = parties[parties.length - 1];
        if (!lastParty.taxNumber) {
          lastParty.taxNumber = match[1].trim();
        }
      }
    }

    if (parties.length > 0) {
      fields.parties = parties;
    }

    // Extract contract type
    const contractTypePatterns = [
      /(?:Sözleşme\s*Türü|Contract\s*Type)[\s:]*([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü\s]+)/i,
    ];

    const upperText = text.toUpperCase();
    if (upperText.includes("KİRA") || upperText.includes("LEASE")) {
      fields.contractType = "lease";
    } else if (upperText.includes("HİZMET") || upperText.includes("SERVICE")) {
      fields.contractType = "service";
    } else if (upperText.includes("SATIN ALMA") || upperText.includes("PURCHASE")) {
      fields.contractType = "purchase";
    } else if (upperText.includes("İŞ") || upperText.includes("EMPLOYMENT")) {
      fields.contractType = "employment";
    }

    // Extract terms (basic - would need more sophisticated parsing for full terms)
    const termsMatch = text.match(/(?:Şartlar|Terms|Koşullar)[\s:]*([^\n]{50,500})/i);
    if (termsMatch) {
      fields.terms = termsMatch[1].trim().substring(0, 1000); // Limit length
    }

    // Extract renewal terms
    const renewalMatch = text.match(/(?:Yenileme|Renewal)[\s:]*([^\n]{20,200})/i);
    if (renewalMatch) {
      fields.renewalTerms = renewalMatch[1].trim().substring(0, 500);
    }

    return fields;
  }
}

export const documentParserService = new DocumentParserService();

