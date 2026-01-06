import { prisma } from "../lib/prisma";
import { ETAConnector } from "../integrations/connectors/eta-connector";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";
import {
  gibComplianceService,
  GIB_EFATURA_STATUS,
  GIB_ERROR_CODES,
  EFATURA_SCENARIOS,
  INVOICE_TYPES,
  type GibEFaturaStatus,
  type EFaturaScenario,
  type InvoiceType,
} from "./gib-compliance-service";

/**
 * E-Fatura (Electronic Invoice) Service
 * 
 * Handles electronic invoice operations for Turkish tax compliance.
 * Integrates with GIB (Gelir İdaresi Başkanlığı) ETA system.
 * 
 * ⚠️ IMPORTANT: This service uses placeholder implementations for:
 * - QR code generation (line 182, 337)
 * - Invoice status checking (line 242) - currently returns stored status instead of querying ETA API
 * - QR code token generation (line 337)
 * 
 * GIB API REQUIREMENTS:
 * - API Endpoint: https://earsivportal.efatura.gov.tr (verify actual endpoint)
 * - Authentication: Certificate-based or OAuth2 (verify method)
 * - Required credentials: username, password, VKN (Vergi Kimlik Numarası)
 * - Invoice format: UBL-TR 1.2 (Universal Business Language - Turkish profile)
 * - QR Code format: GIB-specific format with token generation
 * 
 * TODO: Implement actual GIB API integration:
 * 1. QR Code Generation (generateQRCode method):
 *    - Generate proper GIB token for QR code
 *    - Format: https://earsivportal.efatura.gov.tr/earsiv-services/display?token={token}&ettn={ettn}
 *    - Token generation requires GIB API documentation
 * 
 * 2. Invoice Status Checking (checkInvoiceStatus method):
 *    - Query ETA API for current invoice status
 *    - Endpoint: GET /api/v1/invoices/{externalId}/status (verify actual endpoint)
 *    - Handle API errors and rate limiting
 * 
 * 3. Error Handling:
 *    - Add proper error handling for API failures
 *    - Handle network timeouts
 *    - Handle authentication failures
 *    - Handle rate limiting
 * 
 * DOCUMENTATION REQUIRED:
 * - GIB E-Fatura API documentation
 * - QR code token generation specification
 * - Status checking endpoint details
 * - Error codes and handling
 */
export interface EFaturaInvoice {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate?: Date | null;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  currency: string;
  supplierVKN: string;
  customerVKN?: string | null;
  customerName?: string | null;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    vatRate: number;
    vatAmount: number;
  }>;
}

export interface EFaturaSubmissionResult {
  success: boolean;
  externalId?: string;
  qrCode?: string;
  status?: "sent" | "accepted" | "rejected" | "pending";
  message?: string;
  submissionDate?: Date;
}

export interface EFaturaStatus {
  invoiceId: string;
  externalId: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "cancelled";
  submissionDate?: Date | null;
  acceptanceDate?: Date | null;
  rejectionReason?: string | null;
  qrCode?: string | null;
}

export class EFaturaService {
  private etaConnector: ETAConnector;

  constructor() {
    this.etaConnector = new ETAConnector();
  }

  /**
   * Submit invoice to E-Fatura system
   */
  async submitInvoice(
    tenantId: string,
    invoiceId: string,
    config: Record<string, unknown>
  ): Promise<EFaturaSubmissionResult> {
    // Verify invoice belongs to tenant
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        lines: true,
        clientCompany: true,
      },
    });

    if (!invoice) {
      throw new NotFoundError("Fatura bulunamadı.");
    }

    // Get tenant integration for ETA
    const integration = await prisma.tenantIntegration.findFirst({
      where: {
        tenantId,
        provider: {
          code: "ETA",
        },
        status: "active",
      },
      include: {
        provider: true,
      },
    });

    if (!integration) {
      throw new ValidationError("ETA entegrasyonu bulunamadı veya aktif değil.");
    }

    // Prepare invoice data for ETA
    const eFaturaInvoice: EFaturaInvoice = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.externalId || `INV-${invoice.id}`,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      totalAmount: Number(invoice.totalAmount),
      taxAmount: Number(invoice.taxAmount || 0),
      netAmount: Number(invoice.netAmount || invoice.totalAmount - (invoice.taxAmount || 0)),
      currency: invoice.currency || "TRY",
      supplierVKN: invoice.clientCompany?.taxNumber || "",
      customerVKN: invoice.counterpartyTaxNumber || null,
      customerName: invoice.counterpartyName || null,
      lines: invoice.lines.map((line) => ({
        description: line.description || "",
        quantity: Number(line.quantity || 1),
        unitPrice: Number(line.unitPrice || 0),
        lineTotal: Number(line.lineTotal || 0),
        vatRate: Number(line.vatRate || 0),
        vatAmount: Number(line.vatAmount || 0),
      })),
    };

    // Generate UBL-TR format XML
    const ublXml = this.generateUBLTR(eFaturaInvoice);

    // Submit to ETA via connector
    const integrationConfig = integration.config as Record<string, unknown>;
    
    let pushResult;
    try {
      pushResult = await this.etaConnector.pushInvoices(
        [
          {
            invoiceId: invoice.id,
            externalId: invoice.externalId || undefined,
          clientCompanyName: invoice.clientCompany?.name || undefined,
          clientCompanyTaxNumber: invoice.clientCompany?.taxNumber || undefined,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          totalAmount: Number(invoice.totalAmount),
          currency: invoice.currency || "TRY",
          taxAmount: Number(invoice.taxAmount || 0),
          netAmount: Number(invoice.netAmount || invoice.totalAmount - (invoice.taxAmount || 0)),
          counterpartyName: invoice.counterpartyName || null,
          counterpartyTaxNumber: invoice.counterpartyTaxNumber || null,
          status: invoice.status || undefined,
          type: invoice.type as "SATIŞ" | "ALIŞ" | undefined,
          lines: invoice.lines.map((line) => ({
            lineNumber: line.lineNumber,
            description: line.description || "",
            quantity: Number(line.quantity || 1),
            unitPrice: Number(line.unitPrice || 0),
            lineTotal: Number(line.lineTotal || 0),
            vatRate: Number(line.vatRate || 0),
            vatAmount: Number(line.vatAmount || 0),
          })),
        },
      ],
      integrationConfig
      );
    } catch (error) {
      logger.error("[EFaturaService] Error submitting invoice to ETA:", {
        error: error instanceof Error ? error.message : String(error),
        invoiceId,
        tenantId,
      });
      
      // Update invoice metadata with error
      const existingMetadata = (invoice.metadata as Record<string, unknown>) || {};
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          metadata: {
            ...existingMetadata,
            eFatura: {
              submissionDate: new Date().toISOString(),
              status: "rejected",
              rejectionReason: error instanceof Error ? error.message : "Bilinmeyen hata",
              error: true,
            },
          },
        },
      });
      
      throw new ValidationError(
        `E-Fatura gönderim hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`
      );
    }

    const result = pushResult[0];
    const existingMetadata = (invoice.metadata as Record<string, unknown>) || {};
    const submissionDate = new Date().toISOString();

    if (result.success && result.externalId) {
      // Update invoice with E-Fatura external ID
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          externalId: result.externalId,
          metadata: {
            ...existingMetadata,
            eFatura: {
              externalId: result.externalId,
              submissionDate,
              status: "sent",
            },
          },
        },
      });

      // Generate QR code (placeholder - actual implementation would use GIB QR code format)
      // TODO: Implement proper GIB QR code token generation when API documentation is available
      const qrCode = this.generateQRCode(result.externalId, eFaturaInvoice);

      return {
        success: true,
        externalId: result.externalId,
        qrCode,
        status: "sent",
        message: result.message || "Fatura E-Fatura sistemine gönderildi.",
        submissionDate: new Date(),
      };
    }

    // Update invoice metadata even on failure to track the rejection
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        metadata: {
          ...existingMetadata,
          eFatura: {
            submissionDate,
            status: "rejected",
            rejectionReason: result.message || "Fatura gönderilemedi.",
          },
        },
      },
    });

    return {
      success: false,
      status: "rejected",
      message: result.message || "Fatura gönderilemedi.",
    };
  }

  /**
   * Check invoice status in E-Fatura system
   */
  async checkInvoiceStatus(
    tenantId: string,
    invoiceId: string
  ): Promise<EFaturaStatus> {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
    });

    if (!invoice) {
      throw new NotFoundError("Fatura bulunamadı.");
    }

    const metadata = (invoice.metadata as Record<string, unknown>) || {};
    const eFaturaData = metadata.eFatura as Record<string, unknown> | undefined;

    if (!eFaturaData || !eFaturaData.externalId) {
      throw new ValidationError("Fatura E-Fatura sistemine gönderilmemiş.");
    }

    // TODO: Query ETA API for current status
    // Current implementation returns stored status instead of querying ETA API
    // This should be replaced with actual API call when GIB API documentation is available
    // Example:
    // try {
    //   const statusResponse = await fetch(
    //     `https://earsivportal.efatura.gov.tr/api/v1/invoices/${eFaturaData.externalId}/status`,
    //     {
    //       method: 'GET',
    //       headers: {
    //         'Authorization': `Bearer ${token}`,
    //         'X-VKN': vkn,
    //       },
    //     }
    //   );
    //   if (statusResponse.ok) {
    //     const statusData = await statusResponse.json();
    //     // Update stored status and return
    //   }
    // } catch (error) {
    //   logger.error("[EFaturaService] Error checking invoice status from ETA API:", { error, invoiceId });
    //   // Fall back to stored status
    // }
    
    logger.warn(
      "[EFaturaService] checkInvoiceStatus() returning stored status instead of querying ETA API. " +
      "Implement actual API call when GIB API documentation is available."
    );
    
    return {
      invoiceId: invoice.id,
      externalId: eFaturaData.externalId as string,
      status: (eFaturaData.status as EFaturaStatus["status"]) || "sent",
      submissionDate: eFaturaData.submissionDate ? new Date(eFaturaData.submissionDate as string) : null,
      acceptanceDate: eFaturaData.acceptanceDate ? new Date(eFaturaData.acceptanceDate as string) : null,
      rejectionReason: eFaturaData.rejectionReason as string | null | undefined,
      qrCode: eFaturaData.qrCode as string | null | undefined,
    };
  }

  /**
   * Generate UBL-TR 1.2 format XML for invoice
   */
  private generateUBLTR(invoice: EFaturaInvoice): string {
    // UBL-TR 1.2 XML generation
    // This is a simplified version - full implementation would include all required fields
    const issueDate = invoice.issueDate.toISOString().split("T")[0];
    const issueTime = invoice.issueDate.toISOString().split("T")[1].split(".")[0];

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">${invoice.supplierVKN}</cbc:ID>
      </cac:PartyIdentification>
      ${invoice.customerName ? `<cac:PartyName><cbc:Name>${this.escapeXml(invoice.customerName)}</cbc:Name></cac:PartyName>` : ""}
    </cac:Party>
  </cac:AccountingSupplierParty>
  ${invoice.customerVKN ? `
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">${invoice.customerVKN}</cbc:ID>
      </cac:PartyIdentification>
    </cac:Party>
  </cac:AccountingCustomerParty>
  ` : ""}
  <cac:InvoiceLine>
    ${invoice.lines.map((line, index) => `
    <cac:InvoiceLine>
      <cbc:ID>${index + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="C62">${line.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${invoice.currency}">${line.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Name>${this.escapeXml(line.description)}</cbc:Name>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${invoice.currency}">${line.unitPrice.toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${invoice.currency}">${line.vatAmount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="${invoice.currency}">${line.lineTotal.toFixed(2)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="${invoice.currency}">${line.vatAmount.toFixed(2)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:Percent>${line.vatRate}</cbc:Percent>
            <cac:TaxScheme>
              <cbc:Name>KDV</cbc:Name>
              <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
    </cac:InvoiceLine>
    `).join("")}
  </cac:InvoiceLine>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.netAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.netAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.totalAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.totalAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${invoice.currency}">${invoice.taxAmount.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
</Invoice>`;
  }

  /**
   * Generate QR code for invoice (GIB format)
   * 
   * ⚠️ PLACEHOLDER IMPLEMENTATION
   * 
   * GIB QR code format: URL with invoice parameters and token
   * Format: https://earsivportal.efatura.gov.tr/earsiv-services/display?token={token}&ettn={ettn}
   * 
   * TODO: Implement proper GIB QR code token generation
   * - Token generation requires GIB API documentation
   * - Token may need to be generated via API call or using specific algorithm
   * - Current implementation returns URL without proper token
   * 
   * @param externalId - E-Fatura external ID (ETTN)
   * @param invoice - Invoice data
   * @returns QR code URL (placeholder format)
   */
  private generateQRCode(externalId: string, invoice: EFaturaInvoice): string {
    // GIB QR code format: URL with invoice parameters
    // Format: https://earsivportal.efatura.gov.tr/earsiv-services/display?token={token}&ettn={ettn}
    // For now, return a placeholder - actual implementation would generate proper token
    // TODO: Generate proper GIB token when API documentation is available
    
    logger.warn(
      "[EFaturaService] generateQRCode() using placeholder implementation. " +
      "Proper GIB token generation requires API documentation."
    );
    
    const qrData = {
      e: externalId,
      vkn: invoice.supplierVKN,
      date: invoice.issueDate.toISOString().split("T")[0],
      amount: invoice.totalAmount.toFixed(2),
    };

    // Placeholder: Return URL without proper token
    // In production, token should be generated via GIB API or algorithm
    return `https://earsivportal.efatura.gov.tr/earsiv-services/display?ettn=${externalId}`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Retry failed invoice submissions
   */
  async retryFailedSubmissions(tenantId: string): Promise<number> {
    // Find all invoices for tenant and filter by metadata in memory
    // Prisma JSON filtering has limitations, so we fetch and filter
    const allInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        metadata: {
          path: ["eFatura"],
          not: null,
        },
      },
    });

    // Filter invoices with rejected status
    const failedInvoices = allInvoices.filter((invoice) => {
      const metadata = (invoice.metadata as Record<string, unknown>) || {};
      const eFaturaData = metadata.eFatura as Record<string, unknown> | undefined;
      return eFaturaData?.status === "rejected";
    });

    let retryCount = 0;

    for (const invoice of failedInvoices) {
      try {
        const integration = await prisma.tenantIntegration.findFirst({
          where: {
            tenantId,
            provider: {
              code: "ETA",
            },
            status: "active",
          },
        });

        if (integration) {
          await this.submitInvoice(tenantId, invoice.id, integration.config as Record<string, unknown>);
          retryCount++;
        }
      } catch (error) {
        logger.error(`Failed to retry invoice ${invoice.id}:`, error);
      }
    }

    return retryCount;
  }

  // =============================================================================
  // ENHANCED GİB COMPLIANCE METHODS
  // =============================================================================

  /**
   * Validate invoice data before submission
   */
  async validateInvoiceForEFatura(
    tenantId: string,
    invoiceId: string
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: true, clientCompany: true },
    });

    if (!invoice) {
      return { valid: false, errors: ["Fatura bulunamadı"], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate supplier VKN
    const supplierVkn = invoice.clientCompany?.taxNumber;
    if (!supplierVkn) {
      errors.push("Satıcı VKN bilgisi eksik");
    } else {
      const vknValidation = gibComplianceService.validateTaxId(supplierVkn);
      if (!vknValidation.valid) {
        errors.push(`Satıcı VKN geçersiz: ${vknValidation.error}`);
      }
    }

    // Validate customer VKN if provided
    if (invoice.counterpartyTaxNumber) {
      const customerVknValidation = gibComplianceService.validateTaxId(invoice.counterpartyTaxNumber);
      if (!customerVknValidation.valid) {
        errors.push(`Alıcı VKN/TCKN geçersiz: ${customerVknValidation.error}`);
      }
    } else {
      warnings.push("Alıcı VKN/TCKN bilgisi eksik - E-Arşiv fatura olarak gönderilecek");
    }

    // Validate amounts
    const lineTotal = invoice.lines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0);
    const lineTax = invoice.lines.reduce((sum, line) => sum + Number(line.vatAmount || 0), 0);
    const declaredTotal = Number(invoice.totalAmount);
    const declaredTax = Number(invoice.taxAmount || 0);

    if (Math.abs(lineTotal + lineTax - declaredTotal) > 0.01) {
      errors.push(
        `Tutar uyuşmazlığı: Satır toplamı ${(lineTotal + lineTax).toFixed(2)}, Fatura toplamı ${declaredTotal.toFixed(2)}`
      );
    }

    // Validate KDV calculation
    const amountValidation = gibComplianceService.validateInvoiceAmounts({
      lineItems: invoice.lines.map((line) => ({
        quantity: Number(line.quantity || 1),
        unitPrice: Number(line.unitPrice || 0),
        kdvRate: Number(line.vatRate || 0),
      })),
      declaredSubtotal: Number(invoice.netAmount || declaredTotal - declaredTax),
      declaredKdv: declaredTax,
      declaredTotal,
    });

    if (!amountValidation.valid) {
      errors.push(...amountValidation.errors);
    }

    // Validate invoice date
    const invoiceDate = new Date(invoice.issueDate);
    const now = new Date();
    const daysDiff = Math.ceil((now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 7) {
      warnings.push("Fatura tarihi 7 günden eski - GİB tarafından reddedilebilir");
    }

    // Check if lines exist
    if (invoice.lines.length === 0) {
      errors.push("Fatura satırları eksik");
    }

    // Check Ba-Bs requirement
    if (gibComplianceService.requiresBaBsReporting(declaredTotal)) {
      if (!invoice.counterpartyTaxNumber) {
        warnings.push("Bu tutar Ba-Bs bildirimi gerektirir - Alıcı VKN zorunludur");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Cancel a submitted E-Fatura invoice
   */
  async cancelInvoice(
    tenantId: string,
    invoiceId: string,
    reason: string
  ): Promise<{
    success: boolean;
    message: string;
    cancellationDate?: Date;
  }> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundError("Fatura bulunamadı");
    }

    const metadata = (invoice.metadata as Record<string, unknown>) || {};
    const eFaturaData = metadata.eFatura as Record<string, unknown> | undefined;

    if (!eFaturaData?.externalId) {
      throw new ValidationError("Fatura henüz E-Fatura sistemine gönderilmemiş");
    }

    const status = eFaturaData.status as string;
    if (status === "cancelled") {
      throw new ValidationError("Fatura zaten iptal edilmiş");
    }

    if (status === "accepted") {
      // Check if within cancellation period (7 days for accepted invoices)
      const submissionDate = eFaturaData.submissionDate
        ? new Date(eFaturaData.submissionDate as string)
        : null;

      if (submissionDate) {
        const daysSinceSubmission = Math.ceil(
          (new Date().getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceSubmission > 7) {
          throw new ValidationError(
            "Kabul edilmiş faturalar 7 gün içinde iptal edilebilir. Bu süre geçmiş."
          );
        }
      }
    }

    // Get integration
    const integration = await prisma.tenantIntegration.findFirst({
      where: {
        tenantId,
        provider: { code: "ETA" },
        status: "active",
      },
      include: { provider: true },
    });

    if (!integration) {
      throw new ValidationError("ETA entegrasyonu bulunamadı");
    }

    try {
      // Call ETA connector to cancel
      await this.etaConnector.cancelInvoice(
        eFaturaData.externalId as string,
        reason
      );

      const cancellationDate = new Date();

      // Update invoice metadata
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          metadata: {
            ...metadata,
            eFatura: {
              ...eFaturaData,
              status: "cancelled",
              cancellationDate: cancellationDate.toISOString(),
              cancellationReason: reason,
            },
          },
        },
      });

      logger.info("E-Fatura cancelled successfully", { tenantId }, { invoiceId, reason });

      return {
        success: true,
        message: "Fatura başarıyla iptal edildi",
        cancellationDate,
      };
    } catch (error) {
      logger.error("Failed to cancel E-Fatura", { tenantId }, { invoiceId, error });

      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      throw new ValidationError(`Fatura iptal edilemedi: ${errorMessage}`);
    }
  }

  /**
   * Check if a VKN is registered as E-Fatura mükellef
   */
  async checkEFaturaRegistration(vkn: string): Promise<{
    registered: boolean;
    alias?: string;
    title?: string;
    type?: "EFATURA" | "EARSIV";
    registrationDate?: Date;
  }> {
    // Validate VKN first
    const validation = gibComplianceService.validateVKN(vkn);
    if (!validation.valid) {
      return { registered: false };
    }

    try {
      // Try to check via ETA connector
      const result = await this.etaConnector.checkEFaturaRegistration(vkn);

      return {
        registered: result.isRegistered,
        alias: result.alias,
        title: result.title,
        type: result.isRegistered ? "EFATURA" : "EARSIV",
      };
    } catch (error) {
      logger.warn("Failed to check E-Fatura registration, using compliance service", undefined, {
        vkn,
        error,
      });

      // Fallback to compliance service
      return gibComplianceService.checkEFaturaRegistration(vkn);
    }
  }

  /**
   * Get invoice with enhanced GİB status
   */
  async getInvoiceWithGibStatus(
    tenantId: string,
    invoiceId: string
  ): Promise<{
    invoice: any;
    gibStatus: GibEFaturaStatus;
    qrCodeUrl?: string;
    ettn?: string;
    submissionDate?: Date;
    lastStatusCheck?: Date;
  }> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: true, clientCompany: true },
    });

    if (!invoice) {
      throw new NotFoundError("Fatura bulunamadı");
    }

    const metadata = (invoice.metadata as Record<string, unknown>) || {};
    const eFaturaData = metadata.eFatura as Record<string, unknown> | undefined;

    const gibStatus = gibComplianceService.mapToGibStatus(
      (eFaturaData?.status as string) || "DRAFT",
      "efatura"
    ) as GibEFaturaStatus;

    let qrCodeUrl: string | undefined;
    let ettn: string | undefined;

    if (eFaturaData?.externalId) {
      ettn = eFaturaData.externalId as string;

      // Generate QR code URL
      qrCodeUrl = gibComplianceService.generateEFaturaQRData({
        ettn,
        senderVkn: invoice.clientCompany?.taxNumber || "",
        receiverVkn: invoice.counterpartyTaxNumber || "",
        invoiceDate: invoice.issueDate,
      });
    }

    return {
      invoice,
      gibStatus,
      qrCodeUrl,
      ettn,
      submissionDate: eFaturaData?.submissionDate
        ? new Date(eFaturaData.submissionDate as string)
        : undefined,
      lastStatusCheck: new Date(),
    };
  }

  /**
   * Generate ETTN for new invoice
   */
  generateETTN(): string {
    return gibComplianceService.generateETTN();
  }

  /**
   * Get E-Fatura scenarios
   */
  getScenarios(): typeof EFATURA_SCENARIOS {
    return EFATURA_SCENARIOS;
  }

  /**
   * Get invoice types
   */
  getInvoiceTypes(): typeof INVOICE_TYPES {
    return INVOICE_TYPES;
  }

  /**
   * Translate GİB error code
   */
  translateGibError(errorCode: string, language: "tr" | "en" = "tr"): string {
    return gibComplianceService.translateError(errorCode, language).message;
  }

  /**
   * Get submission statistics for tenant
   */
  async getSubmissionStats(
    tenantId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    total: number;
    sent: number;
    accepted: number;
    rejected: number;
    cancelled: number;
    pending: number;
  }> {
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        ...(dateRange && {
          issueDate: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        }),
      },
      select: { metadata: true },
    });

    const stats = {
      total: invoices.length,
      sent: 0,
      accepted: 0,
      rejected: 0,
      cancelled: 0,
      pending: 0,
    };

    for (const invoice of invoices) {
      const metadata = (invoice.metadata as Record<string, unknown>) || {};
      const eFaturaData = metadata.eFatura as Record<string, unknown> | undefined;

      if (eFaturaData) {
        const status = eFaturaData.status as string;
        switch (status) {
          case "sent":
            stats.sent++;
            break;
          case "accepted":
            stats.accepted++;
            break;
          case "rejected":
            stats.rejected++;
            break;
          case "cancelled":
            stats.cancelled++;
            break;
          default:
            stats.pending++;
        }
      }
    }

    return stats;
  }
}

export const eFaturaService = new EFaturaService();

