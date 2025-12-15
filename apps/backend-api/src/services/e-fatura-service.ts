import { prisma } from "../lib/prisma";
import { ETAConnector } from "../integrations/connectors/eta-connector";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";

/**
 * E-Fatura (Electronic Invoice) Service
 * 
 * Handles electronic invoice operations for Turkish tax compliance.
 * Integrates with GIB (Gelir İdaresi Başkanlığı) ETA system.
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
    const pushResult = await this.etaConnector.pushInvoices(
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
    // For now, return stored status
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
   */
  private generateQRCode(externalId: string, invoice: EFaturaInvoice): string {
    // GIB QR code format: URL with invoice parameters
    // Format: https://earsivportal.efatura.gov.tr/earsiv-services/display?token={token}&ettn={ettn}
    // For now, return a placeholder - actual implementation would generate proper token
    const qrData = {
      e: externalId,
      vkn: invoice.supplierVKN,
      date: invoice.issueDate.toISOString().split("T")[0],
      amount: invoice.totalAmount.toFixed(2),
    };

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
}

export const eFaturaService = new EFaturaService();

