import crypto from "crypto";
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
 * GIB API INTEGRATION NOTES:
 * - API Endpoint: https://earsivportal.efatura.gov.tr
 * - Authentication: Certificate-based or OAuth2 (configured via ETA provider)
 * - Required credentials: username, password, VKN (Vergi Kimlik Numarası)
 * - Invoice format: UBL-TR 1.2 (Universal Business Language - Turkish profile)
 * - QR Code: Generated with HMAC-SHA256 hash for integrity verification
 * - Status checking: Queries ETA connector with fallback to stored status
 * - Error handling: Retries via retryFailedSubmissions(), graceful fallbacks
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

export interface EFaturaValidationIssue {
  code: string;
  severity: "error" | "warning" | "info";
  field?: string;
  message: string;
  gibReference?: string; // Reference to GIB regulation or check
}

export interface EFaturaPreSubmissionResult {
  isValid: boolean;
  canSubmit: boolean; // false only for errors, warnings still allow submission
  issues: EFaturaValidationIssue[];
  riskScore: number;
  summary: string;
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
      netAmount: Number(invoice.netAmount || (Number(invoice.totalAmount) - Number(invoice.taxAmount || 0))),
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
          netAmount: Number(invoice.netAmount || (Number(invoice.totalAmount) - Number(invoice.taxAmount || 0))),
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

      // Generate QR code with HMAC-SHA256 verification hash
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

    const externalId = eFaturaData.externalId as string;

    // Attempt to check live status via ETA connector
    try {
      const integration = await prisma.tenantIntegration.findFirst({
        where: {
          tenantId,
          provider: { code: "ETA" },
          status: "active",
        },
      });

      if (integration) {
        const liveStatus = await this.etaConnector.getInvoiceStatus(externalId);

        if (liveStatus && liveStatus.status) {
          const mappedStatus = this.mapEtaStatus(liveStatus.status);

          // Update stored status with fresh data from ETA
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
              metadata: {
                ...metadata,
                eFatura: {
                  ...eFaturaData,
                  status: mappedStatus,
                  lastStatusCheck: new Date().toISOString(),
                  ...(mappedStatus === "accepted" && !eFaturaData.acceptanceDate
                    ? { acceptanceDate: new Date().toISOString() }
                    : {}),
                  ...(mappedStatus === "rejected" && (liveStatus as any).rejectionReason
                    ? { rejectionReason: (liveStatus as any).rejectionReason }
                    : {}),
                },
              },
            },
          });

          return {
            invoiceId: invoice.id,
            externalId,
            status: mappedStatus,
            submissionDate: eFaturaData.submissionDate ? new Date(eFaturaData.submissionDate as string) : null,
            acceptanceDate: mappedStatus === "accepted"
              ? new Date(((eFaturaData.acceptanceDate as string) || new Date().toISOString()))
              : null,
            rejectionReason: (liveStatus as any).rejectionReason || (eFaturaData.rejectionReason as string | null | undefined),
            qrCode: eFaturaData.qrCode as string | null | undefined,
          };
        }
      }
    } catch (error) {
      logger.warn("[EFaturaService] Could not check live status from ETA, using stored status", {
        invoiceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Fallback: return stored status
    return {
      invoiceId: invoice.id,
      externalId,
      status: (eFaturaData.status as EFaturaStatus["status"]) || "sent",
      submissionDate: eFaturaData.submissionDate ? new Date(eFaturaData.submissionDate as string) : null,
      acceptanceDate: eFaturaData.acceptanceDate ? new Date(eFaturaData.acceptanceDate as string) : null,
      rejectionReason: eFaturaData.rejectionReason as string | null | undefined,
      qrCode: eFaturaData.qrCode as string | null | undefined,
    };
  }

  /**
   * Map ETA connector status to internal E-Fatura status
   */
  private mapEtaStatus(etaStatus: string): EFaturaStatus["status"] {
    const statusMap: Record<string, EFaturaStatus["status"]> = {
      SENT: "sent",
      ACCEPTED: "accepted",
      REJECTED: "rejected",
      CANCELLED: "cancelled",
      PENDING: "sent",
      DRAFT: "draft",
      sent: "sent",
      accepted: "accepted",
      rejected: "rejected",
      cancelled: "cancelled",
      pending: "sent",
      draft: "draft",
    };
    return statusMap[etaStatus] || "sent";
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
   * Generate QR code data for invoice (GIB format)
   *
   * GIB e-fatura QR code contains a verification URL with the ETTN and
   * a HMAC-SHA256 hash of invoice parameters for integrity verification.
   * The QR code allows recipients to verify invoice authenticity via GIB portal.
   *
   * @param externalId - E-Fatura external ID (ETTN)
   * @param invoice - Invoice data
   * @returns QR code verification URL
   */
  private generateQRCode(externalId: string, invoice: EFaturaInvoice): string {
    // crypto imported at top of file

    const issueDate = invoice.issueDate.toISOString().split("T")[0];
    const totalAmount = invoice.totalAmount.toFixed(2);

    // Build verification payload from invoice parameters
    const payload = [
      externalId,
      invoice.supplierVKN,
      invoice.customerVKN || "",
      issueDate,
      totalAmount,
    ].join("|");

    // Generate HMAC-SHA256 hash for integrity verification
    const secret = process.env.GIB_QR_SECRET || process.env.JWT_SECRET || "ai-muhasebi-qr-key";
    const hash = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")
      .substring(0, 32);

    // GIB e-arşiv portal verification URL format
    const baseUrl = process.env.GIB_EARSIV_PORTAL_URL
      || "https://earsivportal.efatura.gov.tr/earsiv-services/display";

    return `${baseUrl}?ettn=${encodeURIComponent(externalId)}&vkn=${encodeURIComponent(invoice.supplierVKN)}&date=${encodeURIComponent(issueDate)}&hash=${hash}`;
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

  // =============================================================================
  // PRE-SUBMISSION VALIDATION
  // =============================================================================

  /**
   * Comprehensive pre-submission validation for E-Fatura
   *
   * Runs all risk rules against an invoice BEFORE it is submitted to GIB,
   * catching issues that GIB's system would flag. Checks include:
   * 1. Mandatory field validation (GIB rejects these)
   * 2. VAT validation (GIB cross-checks)
   * 3. Cross-validation (GIB's risk analysis checks)
   * 4. Risk-based checks (what GIB's AI would flag)
   */
  async validateBeforeSubmission(
    tenantId: string,
    invoiceId: string
  ): Promise<EFaturaPreSubmissionResult> {
    const issues: EFaturaValidationIssue[] = [];

    // Fetch invoice with relations
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: true, clientCompany: true },
    });

    if (!invoice) {
      return {
        isValid: false,
        canSubmit: false,
        issues: [
          {
            code: "INV_NOT_FOUND",
            severity: "error",
            message: "Fatura bulunamadı.",
          },
        ],
        riskScore: 100,
        summary: "Fatura bulunamadı, doğrulama yapılamadı.",
      };
    }

    // =========================================================================
    // 1. MANDATORY FIELD VALIDATION (GIB rejects these)
    // =========================================================================
    this.validateMandatoryFields(invoice, issues);

    // =========================================================================
    // 2. VAT VALIDATION (GIB cross-checks)
    // =========================================================================
    this.validateVAT(invoice, issues);

    // =========================================================================
    // 3. CROSS-VALIDATION (GIB's risk analysis checks)
    // =========================================================================
    await this.validateCrossChecks(tenantId, invoice, issues);

    // =========================================================================
    // 4. RISK-BASED CHECKS (what GIB's AI would flag)
    // =========================================================================
    await this.validateRiskChecks(tenantId, invoice, issues);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(issues);

    // Determine validity
    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;
    const infoCount = issues.filter((i) => i.severity === "info").length;
    const isValid = errorCount === 0 && warningCount === 0;
    const canSubmit = errorCount === 0;

    // Build summary
    const summaryParts: string[] = [];
    if (errorCount > 0) {
      summaryParts.push(`${errorCount} hata`);
    }
    if (warningCount > 0) {
      summaryParts.push(`${warningCount} uyarı`);
    }
    if (infoCount > 0) {
      summaryParts.push(`${infoCount} bilgi`);
    }

    let summary: string;
    if (errorCount === 0 && warningCount === 0 && infoCount === 0) {
      summary = "Fatura GİB'e gönderim için hazır. Herhangi bir sorun tespit edilmedi.";
    } else if (canSubmit) {
      summary = `Fatura gönderilebilir ancak dikkat edilmesi gereken konular var: ${summaryParts.join(", ")}. Risk skoru: ${riskScore}/100.`;
    } else {
      summary = `Fatura gönderilemez. Düzeltilmesi gereken sorunlar: ${summaryParts.join(", ")}. Risk skoru: ${riskScore}/100.`;
    }

    return {
      isValid,
      canSubmit,
      issues,
      riskScore,
      summary,
    };
  }

  // ---------------------------------------------------------------------------
  // Private validation helpers for validateBeforeSubmission
  // ---------------------------------------------------------------------------

  /**
   * 1. Mandatory field validation - GIB rejects invoices missing these
   */
  private validateMandatoryFields(
    invoice: {
      externalId: string | null;
      issueDate: Date;
      totalAmount: any;
      taxAmount: any;
      currency: string;
      counterpartyTaxNumber: string | null;
      counterpartyName: string | null;
      clientCompany: { taxNumber: string | null; name: string } | null;
      lines: Array<any>;
    },
    issues: EFaturaValidationIssue[]
  ): void {
    // Invoice number present and valid format
    const invoiceNumber = invoice.externalId;
    if (!invoiceNumber || invoiceNumber.trim().length === 0) {
      issues.push({
        code: "MND_001",
        severity: "error",
        field: "invoiceNumber",
        message: "Fatura numarası eksik. GİB tarafından reddedilir.",
        gibReference: "VUK Md. 229 - Fatura düzenlemesi",
      });
    } else {
      // GIB format: 3-letter prefix + year + 9-digit serial, e.g. ABC2024000000001
      const gibInvoiceFormat = /^[A-Z]{3}\d{13}$/;
      if (!gibInvoiceFormat.test(invoiceNumber)) {
        issues.push({
          code: "MND_002",
          severity: "warning",
          field: "invoiceNumber",
          message: `Fatura numarası GİB formatına uymuyor (beklenen: 3 harf + yıl + 9 haneli seri no, örn: ABC2024000000001). Mevcut: ${invoiceNumber}`,
          gibReference: "GİB E-Fatura Uygulama Kılavuzu - Fatura ID formatı",
        });
      }
    }

    // Seller tax number present and valid
    const sellerVkn = invoice.clientCompany?.taxNumber;
    if (!sellerVkn || sellerVkn.trim().length === 0) {
      issues.push({
        code: "MND_003",
        severity: "error",
        field: "supplierVKN",
        message: "Satıcı vergi kimlik numarası (VKN) eksik.",
        gibReference: "VUK Md. 230 - Faturada bulunması gereken bilgiler",
      });
    } else {
      this.validateTaxNumberForSubmission(sellerVkn, "Satıcı", issues);
    }

    // Buyer tax number present and valid
    const buyerVkn = invoice.counterpartyTaxNumber;
    if (!buyerVkn || buyerVkn.trim().length === 0) {
      issues.push({
        code: "MND_005",
        severity: "error",
        field: "customerVKN",
        message: "Alıcı vergi kimlik numarası (VKN/TCKN) eksik. E-Fatura için zorunludur.",
        gibReference: "E-Fatura Uygulaması - Alıcı bilgileri zorunlu alan",
      });
    } else {
      this.validateTaxNumberForSubmission(buyerVkn, "Alıcı", issues);
    }

    // Invoice date not in the future
    const invoiceDate = new Date(invoice.issueDate);
    const now = new Date();
    if (invoiceDate.getTime() > now.getTime()) {
      issues.push({
        code: "MND_007",
        severity: "error",
        field: "issueDate",
        message: "Fatura tarihi gelecekte olamaz.",
        gibReference: "VUK Md. 231 - Fatura düzenleme süresi",
      });
    }

    // Invoice date not more than 7 days in the past (GIB limit for e-fatura)
    const daysDiff = Math.floor(
      (now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > 7) {
      issues.push({
        code: "MND_008",
        severity: "error",
        field: "issueDate",
        message: `Fatura tarihi ${daysDiff} gün önce. GİB e-fatura için en fazla 7 gün geriye dönük fatura kabul eder.`,
        gibReference: "VUK Md. 231/5 - 7 gün kuralı",
      });
    }

    // Total amount > 0
    const totalAmount = Number(invoice.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      issues.push({
        code: "MND_009",
        severity: "error",
        field: "totalAmount",
        message: "Fatura toplam tutarı 0'dan büyük olmalıdır.",
        gibReference: "GİB E-Fatura teknik kılavuzu - Tutar doğrulama",
      });
    }

    // At least one invoice line
    if (!invoice.lines || invoice.lines.length === 0) {
      issues.push({
        code: "MND_010",
        severity: "error",
        field: "lines",
        message: "Faturada en az bir kalem satırı bulunmalıdır.",
        gibReference: "UBL-TR 1.2 - InvoiceLine zorunlu alan",
      });
    }

    // Currency code valid
    const validCurrencies = ["TRY", "USD", "EUR", "GBP"];
    const currency = invoice.currency || "TRY";
    if (!validCurrencies.includes(currency)) {
      issues.push({
        code: "MND_011",
        severity: "error",
        field: "currency",
        message: `Geçersiz para birimi: ${currency}. Kabul edilen değerler: ${validCurrencies.join(", ")}`,
        gibReference: "GİB E-Fatura - DocumentCurrencyCode",
      });
    }
  }

  /**
   * Validate a tax number (VKN 10-digit or TCKN 11-digit) with checksum
   */
  private validateTaxNumberForSubmission(
    taxNumber: string,
    ownerLabel: string,
    issues: EFaturaValidationIssue[]
  ): void {
    const clean = taxNumber.replace(/\s/g, "");

    // Check length: must be 10 (VKN) or 11 (TCKN)
    if (clean.length !== 10 && clean.length !== 11) {
      issues.push({
        code: "MND_004",
        severity: "error",
        field: ownerLabel === "Satıcı" ? "supplierVKN" : "customerVKN",
        message: `${ownerLabel} vergi numarası 10 haneli (VKN) veya 11 haneli (TCKN) olmalıdır. Mevcut: ${clean.length} hane.`,
        gibReference: "VUK Md. 8 - Vergi kimlik numarası",
      });
      return;
    }

    // Must be all digits
    if (!/^\d+$/.test(clean)) {
      issues.push({
        code: "MND_004",
        severity: "error",
        field: ownerLabel === "Satıcı" ? "supplierVKN" : "customerVKN",
        message: `${ownerLabel} vergi numarası sadece rakam içermelidir.`,
        gibReference: "VUK Md. 8 - Vergi kimlik numarası",
      });
      return;
    }

    if (clean.length === 10) {
      // VKN checksum validation (Turkish algorithm)
      const validation = gibComplianceService.validateVKN(clean);
      if (!validation.valid) {
        issues.push({
          code: "MND_006",
          severity: "error",
          field: ownerLabel === "Satıcı" ? "supplierVKN" : "customerVKN",
          message: `${ownerLabel} VKN kontrol hanesi geçersiz: ${validation.error}`,
          gibReference: "GİB VKN doğrulama algoritması",
        });
      }
    } else {
      // TCKN checksum validation
      const validation = gibComplianceService.validateTCKN(clean);
      if (!validation.valid) {
        issues.push({
          code: "MND_006",
          severity: "error",
          field: ownerLabel === "Satıcı" ? "supplierVKN" : "customerVKN",
          message: `${ownerLabel} TCKN kontrol hanesi geçersiz: ${validation.error}`,
          gibReference: "Nüfus ve Vatandaşlık İşleri - TCKN doğrulama algoritması",
        });
      }
    }
  }

  /**
   * 2. VAT validation - GIB cross-checks these
   */
  private validateVAT(
    invoice: {
      totalAmount: any;
      taxAmount: any;
      netAmount: any;
      currency: string;
      lines: Array<{
        lineTotal: any;
        vatRate: any;
        vatAmount: any;
        quantity: any;
        unitPrice: any;
      }>;
    },
    issues: EFaturaValidationIssue[]
  ): void {
    // Legal VAT rates in Turkey (as percentages)
    const legalVatRatesPercent = [0, 1, 10, 20];
    // Common KDV tevkifat rates (as fractions, e.g. 2/10, 5/10, 7/10, 9/10)
    const validTevkifatRates = [2 / 10, 5 / 10, 7 / 10, 9 / 10];
    const tolerance = 0.01;

    for (let i = 0; i < invoice.lines.length; i++) {
      const line = invoice.lines[i];
      const lineTotal = Number(line.lineTotal);
      const rawVatRate = Number(line.vatRate);
      const vatAmount = Number(line.vatAmount);
      const lineNumber = i + 1;

      // The vatRate in the database is stored as a decimal fraction (e.g. 0.18 for 18%)
      // Convert to percentage for comparison with legal rates
      const vatRatePercent = rawVatRate <= 1 ? rawVatRate * 100 : rawVatRate;

      // Check VAT rate matches Turkish legal rates
      const isLegalRate = legalVatRatesPercent.some(
        (rate) => Math.abs(vatRatePercent - rate) < tolerance
      );
      if (!isLegalRate) {
        issues.push({
          code: "VAT_001",
          severity: "error",
          field: `lines[${i}].vatRate`,
          message: `Satır ${lineNumber}: KDV oranı (%${vatRatePercent.toFixed(0)}) Türkiye'de geçerli bir oran değil. Geçerli oranlar: %0, %1, %10, %20`,
          gibReference: "3065 sayılı KDV Kanunu Md. 28",
        });
      }

      // Check VAT calculation matches (lineTotal * rate = vatAmount, within tolerance)
      const vatRateFraction = vatRatePercent / 100;
      const expectedVatAmount = Math.round(lineTotal * vatRateFraction * 100) / 100;
      if (Math.abs(expectedVatAmount - vatAmount) > tolerance) {
        issues.push({
          code: "VAT_002",
          severity: "error",
          field: `lines[${i}].vatAmount`,
          message: `Satır ${lineNumber}: KDV tutarı hesaplaması uyuşmuyor. Beklenen: ${expectedVatAmount.toFixed(2)}, Beyan edilen: ${vatAmount.toFixed(2)} (matrah: ${lineTotal.toFixed(2)} x %${vatRatePercent.toFixed(0)})`,
          gibReference: "GİB E-Fatura KDV hesaplama doğrulaması",
        });
      }
    }

    // Check aggregate amounts
    const calculatedNetAmount = invoice.lines.reduce(
      (sum: number, l: any) => sum + Number(l.lineTotal),
      0
    );
    const calculatedTaxAmount = invoice.lines.reduce(
      (sum: number, l: any) => sum + Number(l.vatAmount),
      0
    );
    const calculatedTotal = calculatedNetAmount + calculatedTaxAmount;
    const declaredTotal = Number(invoice.totalAmount);
    const declaredTax = Number(invoice.taxAmount || 0);

    if (Math.abs(calculatedTotal - declaredTotal) > tolerance) {
      issues.push({
        code: "VAT_003",
        severity: "error",
        field: "totalAmount",
        message: `Toplam tutar uyuşmazlığı: Satır hesaplaması ${calculatedTotal.toFixed(2)}, Fatura toplamı ${declaredTotal.toFixed(2)}`,
        gibReference: "GİB E-Fatura - LegalMonetaryTotal doğrulama",
      });
    }

    if (Math.abs(calculatedTaxAmount - declaredTax) > tolerance) {
      issues.push({
        code: "VAT_004",
        severity: "error",
        field: "taxAmount",
        message: `KDV toplam uyuşmazlığı: Satır KDV toplamı ${calculatedTaxAmount.toFixed(2)}, Beyan edilen KDV ${declaredTax.toFixed(2)}`,
        gibReference: "GİB E-Fatura - TaxTotal doğrulama",
      });
    }

    // Check for withholding tax (stopaj) if metadata indicates it
    // Check for KDV tevkifat in metadata
    const metadata = (invoice as any).metadata as Record<string, unknown> | null;
    if (metadata) {
      const withholdingRate = metadata.withholdingRate as number | undefined;
      if (withholdingRate !== undefined && withholdingRate > 0) {
        const isValidWithholdingRate = [15, 20, 30, 40, 50].includes(withholdingRate);
        if (!isValidWithholdingRate) {
          issues.push({
            code: "VAT_005",
            severity: "warning",
            field: "withholdingRate",
            message: `Stopaj oranı (%${withholdingRate}) standart oranlar arasında değil. Yaygın oranlar: %15, %20, %30, %40, %50`,
            gibReference: "GVK Md. 94 - Stopaj oranları",
          });
        }
      }

      const tevkifatRate = metadata.tevkifatRate as number | undefined;
      if (tevkifatRate !== undefined && tevkifatRate > 0) {
        const isValidTevkifat = validTevkifatRates.some(
          (rate) => Math.abs(tevkifatRate - rate) < tolerance
        );
        if (!isValidTevkifat) {
          issues.push({
            code: "VAT_006",
            severity: "warning",
            field: "tevkifatRate",
            message: `KDV tevkifat oranı (${tevkifatRate}) standart oranlar arasında değil. Yaygın oranlar: 2/10, 5/10, 7/10, 9/10`,
            gibReference: "KDV Genel Uygulama Tebliği - Tevkifat oranları",
          });
        }
      }
    }
  }

  /**
   * 3. Cross-validation - GIB's risk analysis checks
   */
  private async validateCrossChecks(
    tenantId: string,
    invoice: {
      id: string;
      externalId: string | null;
      issueDate: Date;
      totalAmount: any;
      counterpartyTaxNumber: string | null;
      counterpartyName: string | null;
      clientCompany: { taxNumber: string | null; name: string } | null;
    },
    issues: EFaturaValidationIssue[]
  ): Promise<void> {
    const buyerVkn = invoice.counterpartyTaxNumber;
    const totalAmount = Number(invoice.totalAmount);
    const invoiceDate = new Date(invoice.issueDate);

    // 3a. Check if buyer has been seen before (simulate GIB's registered taxpayer check)
    if (buyerVkn) {
      const previousInvoicesWithBuyer = await prisma.invoice.count({
        where: {
          tenantId,
          counterpartyTaxNumber: buyerVkn,
          id: { not: invoice.id },
        },
      });

      if (previousInvoicesWithBuyer === 0) {
        issues.push({
          code: "CROSS_001",
          severity: "info",
          field: "customerVKN",
          message: `Alıcı (VKN: ${buyerVkn}) ile daha önce fatura kaydı bulunmuyor. İlk kez fatura kesilen bir karşı taraf.`,
          gibReference: "GİB Risk Analizi - Yeni mükellef kontrolü",
        });
      }
    }

    // 3b. Duplicate invoice detection (same buyer + same amount + within 7 days)
    if (buyerVkn) {
      const sevenDaysAgo = new Date(invoiceDate);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysLater = new Date(invoiceDate);
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

      const duplicateCandidates = await prisma.invoice.findMany({
        where: {
          tenantId,
          counterpartyTaxNumber: buyerVkn,
          id: { not: invoice.id },
          issueDate: {
            gte: sevenDaysAgo,
            lte: sevenDaysLater,
          },
        },
        select: {
          id: true,
          externalId: true,
          totalAmount: true,
          issueDate: true,
        },
      });

      const exactDuplicates = duplicateCandidates.filter(
        (d) => Math.abs(Number(d.totalAmount) - totalAmount) < 0.01
      );

      if (exactDuplicates.length > 0) {
        const dupInfo = exactDuplicates
          .map(
            (d) =>
              `${d.externalId || d.id} (${new Date(d.issueDate).toLocaleDateString("tr-TR")})`
          )
          .join(", ");
        issues.push({
          code: "CROSS_002",
          severity: "warning",
          field: "totalAmount",
          message: `Olası mükerrer fatura tespit edildi. Aynı alıcıya, aynı tutara (${totalAmount.toFixed(2)}) sahip ve 7 gün içindeki faturalar: ${dupInfo}`,
          gibReference: "GİB Mükerrer Fatura Kontrolü",
        });
      }
    }

    // 3c. Invoice number sequence gap check
    if (invoice.externalId) {
      // Extract serial number from GIB format (3 letter prefix + year + serial)
      const match = invoice.externalId.match(/^([A-Z]{3})(\d{4})(\d{9})$/);
      if (match) {
        const prefix = match[1];
        const year = match[2];
        const serial = parseInt(match[3], 10);

        // Find the most recent invoice with the same prefix and year
        const recentInvoices = await prisma.invoice.findMany({
          where: {
            tenantId,
            id: { not: invoice.id },
            externalId: { startsWith: `${prefix}${year}` },
          },
          select: { externalId: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

        if (recentInvoices.length > 0) {
          const recentSerials = recentInvoices
            .map((inv) => {
              const m = inv.externalId?.match(/^[A-Z]{3}\d{4}(\d{9})$/);
              return m ? parseInt(m[1], 10) : null;
            })
            .filter((s): s is number => s !== null)
            .sort((a, b) => b - a);

          if (recentSerials.length > 0) {
            const highestSerial = recentSerials[0];
            const gap = serial - highestSerial;

            if (gap > 1) {
              issues.push({
                code: "CROSS_003",
                severity: "warning",
                field: "invoiceNumber",
                message: `Fatura numarası sıra atlama tespit edildi. Son fatura seri no: ${highestSerial.toString().padStart(9, "0")}, bu fatura: ${serial.toString().padStart(9, "0")} (${gap - 1} atlama).`,
                gibReference: "VUK Md. 215 - Fatura sıra numarası",
              });
            } else if (gap <= 0) {
              issues.push({
                code: "CROSS_004",
                severity: "warning",
                field: "invoiceNumber",
                message: `Fatura seri numarası geri gitmiş veya tekrar kullanılmış olabilir. Son seri: ${highestSerial.toString().padStart(9, "0")}, bu fatura: ${serial.toString().padStart(9, "0")}`,
                gibReference: "VUK Md. 215 - Fatura sıra numarası",
              });
            }
          }
        }
      }
    }

    // 3d. Counterparty analysis - is this a new or unusual counterparty?
    if (buyerVkn) {
      const allCounterpartyInvoices = await prisma.invoice.findMany({
        where: {
          tenantId,
          counterpartyTaxNumber: buyerVkn,
          id: { not: invoice.id },
        },
        select: { totalAmount: true, issueDate: true },
        orderBy: { issueDate: "desc" },
        take: 20,
      });

      if (allCounterpartyInvoices.length >= 3) {
        const avgAmount =
          allCounterpartyInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0) /
          allCounterpartyInvoices.length;

        // If this invoice is more than 3x the average with this counterparty
        if (totalAmount > avgAmount * 3 && avgAmount > 0) {
          issues.push({
            code: "CROSS_005",
            severity: "warning",
            field: "totalAmount",
            message: `Bu fatura tutarı (${totalAmount.toFixed(2)}) bu alıcıyla olan ortalama tutarın (${avgAmount.toFixed(2)}) 3 katından fazla. Olağandışı işlem.`,
            gibReference: "GİB Risk Analizi - Karşı taraf analizi",
          });
        }
      }
    }
  }

  /**
   * 4. Risk-based checks - what GIB's AI would flag
   */
  private async validateRiskChecks(
    tenantId: string,
    invoice: {
      id: string;
      issueDate: Date;
      totalAmount: any;
      currency: string;
      counterpartyTaxNumber: string | null;
    },
    issues: EFaturaValidationIssue[]
  ): Promise<void> {
    const totalAmount = Number(invoice.totalAmount);
    const invoiceDate = new Date(invoice.issueDate);

    // 4a. Round number amounts (multiples of 1000, 5000, 10000)
    if (totalAmount >= 1000) {
      if (totalAmount % 10000 === 0) {
        issues.push({
          code: "RISK_001",
          severity: "info",
          field: "totalAmount",
          message: `Fatura tutarı (${totalAmount.toFixed(2)}) tam yuvarlak bir rakam (10.000 katı). GİB risk analizi bu tür tutarları işaretleyebilir.`,
          gibReference: "GİB Yapay Zeka Risk Analizi - Yuvarlak tutar kontrolü",
        });
      } else if (totalAmount % 5000 === 0) {
        issues.push({
          code: "RISK_001",
          severity: "info",
          field: "totalAmount",
          message: `Fatura tutarı (${totalAmount.toFixed(2)}) yuvarlak bir rakam (5.000 katı). GİB risk analizi bu tür tutarları işaretleyebilir.`,
          gibReference: "GİB Yapay Zeka Risk Analizi - Yuvarlak tutar kontrolü",
        });
      } else if (totalAmount % 1000 === 0) {
        issues.push({
          code: "RISK_002",
          severity: "info",
          field: "totalAmount",
          message: `Fatura tutarı (${totalAmount.toFixed(2)}) yuvarlak bir rakam (1.000 katı).`,
          gibReference: "GİB Yapay Zeka Risk Analizi - Yuvarlak tutar kontrolü",
        });
      }
    }

    // 4b. Amount just below MASAK reporting threshold (290,000 TL)
    // The actual MASAK threshold is 290,000 TL for financial reporting
    const masakThreshold = 290000;
    const masakProximityLower = masakThreshold * 0.9; // 261,000
    if (totalAmount >= masakProximityLower && totalAmount < masakThreshold) {
      issues.push({
        code: "RISK_003",
        severity: "warning",
        field: "totalAmount",
        message: `Fatura tutarı (${totalAmount.toFixed(2)} TL) MASAK şüpheli işlem bildirim eşiğinin (${masakThreshold.toLocaleString("tr-TR")} TL) hemen altında. Bu durum GİB tarafından risk olarak değerlendirilebilir.`,
        gibReference: "5549 sayılı Suç Gelirlerinin Aklanmasının Önlenmesi Hakkında Kanun",
      });
    }

    // Also flag if above threshold (for informational purposes)
    if (totalAmount >= masakThreshold) {
      issues.push({
        code: "RISK_004",
        severity: "info",
        field: "totalAmount",
        message: `Fatura tutarı (${totalAmount.toFixed(2)} TL) MASAK bildirim eşiğinin (${masakThreshold.toLocaleString("tr-TR")} TL) üzerinde. MASAK bildirimi gerekebilir.`,
        gibReference: "5549 sayılı Kanun - Şüpheli işlem bildirimi",
      });
    }

    // 4c. Unusual timing (weekends, holidays, outside business hours)
    const dayOfWeek = invoiceDate.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      issues.push({
        code: "RISK_005",
        severity: "info",
        field: "issueDate",
        message: `Fatura hafta sonu (${dayOfWeek === 0 ? "Pazar" : "Cumartesi"}) tarihli. GİB risk analizi hafta sonu kesilen faturaları olağandışı olarak işaretleyebilir.`,
        gibReference: "GİB Risk Analizi - Zamanlama kontrolü",
      });
    }

    // Check for known Turkish public holidays (approximate - major ones)
    const month = invoiceDate.getMonth() + 1; // 1-based
    const day = invoiceDate.getDate();
    const turkishHolidays = [
      { month: 1, day: 1, name: "Yılbaşı" },
      { month: 4, day: 23, name: "Ulusal Egemenlik ve Çocuk Bayramı" },
      { month: 5, day: 1, name: "Emek ve Dayanışma Günü" },
      { month: 5, day: 19, name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
      { month: 7, day: 15, name: "Demokrasi ve Millî Birlik Günü" },
      { month: 8, day: 30, name: "Zafer Bayramı" },
      { month: 10, day: 29, name: "Cumhuriyet Bayramı" },
    ];

    const holiday = turkishHolidays.find(
      (h) => h.month === month && h.day === day
    );
    if (holiday) {
      issues.push({
        code: "RISK_006",
        severity: "info",
        field: "issueDate",
        message: `Fatura resmi tatil gününde (${holiday.name}) kesilmiş. GİB risk analizi tatil günlerinde kesilen faturaları inceleyebilir.`,
        gibReference: "GİB Risk Analizi - Tatil günü kontrolü",
      });
    }

    // Check for outside business hours (check the time component of issueDate)
    const hour = invoiceDate.getHours();
    if (hour < 6 || hour >= 22) {
      issues.push({
        code: "RISK_007",
        severity: "info",
        field: "issueDate",
        message: `Fatura mesai saatleri dışında (${hour.toString().padStart(2, "0")}:00) kesilmiş. Normal mesai saatleri: 06:00 - 22:00.`,
        gibReference: "GİB Risk Analizi - Zamanlama kontrolü",
      });
    }

    // 4d. Very high invoice amount compared to company's historical average
    const historicalInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        id: { not: invoice.id },
        currency: invoice.currency || "TRY",
      },
      select: { totalAmount: true },
      orderBy: { issueDate: "desc" },
      take: 100,
    });

    if (historicalInvoices.length >= 5) {
      const amounts = historicalInvoices.map((inv) => Number(inv.totalAmount));
      const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const stdDev = Math.sqrt(
        amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length
      );

      // Flag if more than 3 standard deviations above the mean
      if (stdDev > 0 && totalAmount > avgAmount + 3 * stdDev) {
        issues.push({
          code: "RISK_008",
          severity: "warning",
          field: "totalAmount",
          message: `Fatura tutarı (${totalAmount.toFixed(2)}) şirketin ortalama fatura tutarının (${avgAmount.toFixed(2)}) çok üzerinde (3 standart sapmadan fazla). Bu olağandışı bir tutar.`,
          gibReference: "GİB Yapay Zeka Risk Analizi - İstatistiksel sapma kontrolü",
        });
      } else if (stdDev > 0 && totalAmount > avgAmount + 2 * stdDev) {
        issues.push({
          code: "RISK_009",
          severity: "info",
          field: "totalAmount",
          message: `Fatura tutarı (${totalAmount.toFixed(2)}) şirketin ortalama fatura tutarının (${avgAmount.toFixed(2)}) önemli ölçüde üzerinde.`,
          gibReference: "GİB Risk Analizi - Tutar karşılaştırma",
        });
      }
    }
  }

  /**
   * Calculate a composite risk score (0-100) from validation issues
   */
  private calculateRiskScore(issues: EFaturaValidationIssue[]): number {
    let score = 0;

    for (const issue of issues) {
      switch (issue.severity) {
        case "error":
          score += 25; // Each error adds 25 points
          break;
        case "warning":
          score += 10; // Each warning adds 10 points
          break;
        case "info":
          score += 3; // Each info adds 3 points
          break;
      }
    }

    // Cap at 100
    return Math.min(score, 100);
  }
}

export const eFaturaService = new EFaturaService();

