import { getTestPrisma } from "./test-db.js";
import type { TenantRole } from "@repo/core-domain";

/**
 * Factory functions for creating test data
 */

export interface CreateClientCompanyData {
  tenantId: string;
  name?: string;
  taxNumber?: string;
  legalType?: string;
  isActive?: boolean;
}

export async function createTestClientCompany(
  data: CreateClientCompanyData
) {
  const prisma = getTestPrisma();
  const {
    tenantId,
    name = `Test Company ${Date.now()}`,
    taxNumber = `${Date.now()}`,
    legalType = "Limited",
    isActive = true,
  } = data;

  return await prisma.clientCompany.create({
    data: {
      tenantId,
      name,
      taxNumber,
      legalType,
      isActive,
    },
  });
}

export interface CreateInvoiceData {
  tenantId: string;
  clientCompanyId: string;
  externalId?: string;
  issueDate?: Date;
  dueDate?: Date;
  totalAmount?: number;
  vatAmount?: number;
  taxAmount?: number;
  netAmount?: number;
  type?: string;
}

export async function createTestInvoice(data: CreateInvoiceData) {
  const prisma = getTestPrisma();
  const {
    tenantId,
    clientCompanyId,
    externalId = `INV-${Date.now()}`,
    issueDate = new Date(),
    dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    totalAmount = 1000,
    vatAmount = 180,
    taxAmount = vatAmount || 0,
    netAmount = 820,
    type = "SATIŞ",
  } = data;

  return await prisma.invoice.create({
    data: {
      tenantId,
      clientCompanyId,
      externalId,
      type,
      issueDate,
      dueDate,
      totalAmount: totalAmount,
      vatAmount: vatAmount,
      taxAmount: taxAmount,
      netAmount: netAmount,
      status: "taslak",
      currency: "TRY",
    },
  });
}

export interface CreateInvoiceLineData {
  tenantId: string;
  invoiceId: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
}

export async function createTestInvoiceLine(data: CreateInvoiceLineData) {
  const prisma = getTestPrisma();
  const {
    tenantId,
    invoiceId,
    description = "Test Item",
    quantity = 1,
    unitPrice = 100,
    lineTotal = 100,
  } = data;

  return await prisma.invoiceLine.create({
    data: {
      tenantId,
      invoiceId,
      lineNumber: 1,
      description,
      quantity: quantity,
      unitPrice: unitPrice,
      lineTotal: lineTotal,
      vatRate: 0.18,
      vatAmount: lineTotal * 0.18,
    },
  });
}

export interface CreateTransactionData {
  tenantId: string;
  clientCompanyId?: string;
  date?: Date;
  referenceNo?: string;
  description?: string;
}

export async function createTestTransaction(data: CreateTransactionData) {
  const prisma = getTestPrisma();
  const {
    tenantId,
    clientCompanyId,
    date = new Date(),
    referenceNo = `TXN-${Date.now()}`,
    description = "Test Transaction",
  } = data;

  return await prisma.transaction.create({
    data: {
      tenantId,
      clientCompanyId,
      date,
      referenceNo,
      description,
    },
  });
}

export interface CreateDocumentData {
  tenantId: string;
  clientCompanyId: string;
  uploadUserId: string;
  type?: string;
  originalFileName?: string;
  storagePath?: string;
  mimeType?: string;
  status?: string;
}

export async function createTestDocument(data: CreateDocumentData) {
  const prisma = getTestPrisma();
  const {
    tenantId,
    clientCompanyId,
    uploadUserId,
    type = "INVOICE",
    originalFileName = "test-document.pdf",
    storagePath = `documents/${tenantId}/test-document.pdf`,
    mimeType = "application/pdf",
    status = "UPLOADED",
  } = data;

  return await prisma.document.create({
    data: {
      tenantId,
      clientCompanyId,
      uploadUserId,
      type,
      originalFileName,
      storagePath,
      mimeType,
      fileSizeBytes: BigInt(1024),
      uploadSource: "manual",
      status,
    },
  });
}

export interface CreateRiskRuleData {
  tenantId?: string | null;
  scope: "document" | "company";
  code: string;
  description: string;
  weight?: number;
  isActive?: boolean;
  defaultSeverity?: string;
}

export async function createTestRiskRule(data: CreateRiskRuleData) {
  const prisma = getTestPrisma();
  const {
    tenantId = null,
    scope,
    code,
    description,
    weight = 1.0,
    isActive = true,
    defaultSeverity = "medium",
  } = data;

  return await prisma.riskRule.create({
    data: {
      tenantId,
      scope,
      code,
      description,
      weight: weight.toString(),
      isActive,
      defaultSeverity,
      config: {},
    },
  });
}

