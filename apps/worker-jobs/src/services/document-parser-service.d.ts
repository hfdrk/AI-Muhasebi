import type { DocumentParsedType, ParsedDocumentFields, ParsedDocumentResult } from "@repo/core-domain";
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
export declare class DocumentParserService {
    private readonly PARSER_VERSION;
    /**
     * Parse document from OCR text
     * @param rawText - Raw OCR text output
     * @param documentTypeHint - Hint about document type (INVOICE, BANK_STATEMENT, etc.)
     * @param tenantId - Tenant ID for context (not used in stub, but needed for future LLM context)
     * @returns Promise resolving to parsed document data
     */
    parseDocument(rawText: string, documentTypeHint: string, tenantId: string): Promise<ParsedDocumentResult>;
    private detectDocumentType;
    private parseInvoice;
    private parseBankStatement;
    private parseReceipt;
}
export declare const documentParserService: DocumentParserService;
//# sourceMappingURL=document-parser-service.d.ts.map