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

  // Ensure tenant exists (prevents foreign key constraint errors)
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) {
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: `Test Tenant ${tenantId}`,
        slug: `test-tenant-${tenantId}`,
        taxNumber: `123456789${Date.now() % 10000}`,
        settings: {},
      },
    });
  }

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
  status?: string; // For test data only
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
    status = "taslak",
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
      taxAmount: taxAmount,
      netAmount: netAmount,
      status: status as any,
      currency: "TRY",
    },
  });
}

export interface CreateInvoiceLineData {
  tenantId: string;
  invoiceId: string;
  lineNumber?: number; // For test data only, will default to 1
  description?: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  vatAmount?: number; // For test data only
}

export async function createTestInvoiceLine(data: CreateInvoiceLineData) {
  const prisma = getTestPrisma();
  const {
    tenantId,
    invoiceId,
    lineNumber = 1,
    description = "Test Item",
    quantity = 1,
    unitPrice = 100,
    lineTotal = 100,
  } = data;

  return await prisma.invoiceLine.create({
    data: {
      tenantId,
      invoiceId,
      lineNumber,
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

  // Ensure tenant exists (prevents foreign key constraint errors)
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) {
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: `Test Tenant ${tenantId}`,
        slug: `test-tenant-${tenantId}`,
        taxNumber: `123456789${Date.now() % 10000}`,
        settings: {},
      },
    });
  }

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

  // Ensure tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) {
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: `Test Tenant ${tenantId}`,
        slug: `test-tenant-${tenantId}`,
        taxNumber: `123456789${Date.now() % 10000}`,
        settings: {},
      },
    });
  }

  // Ensure client company exists
  if (clientCompanyId) {
    const clientCompany = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });
    if (!clientCompany) {
      await prisma.clientCompany.create({
        data: {
          id: clientCompanyId,
          tenantId,
          name: `Test Client Company ${Date.now()}`,
          taxNumber: `${Date.now()}`,
          legalType: "Limited",
          isActive: true,
        },
      });
    }
  }

  // Ensure user exists - wait for it to be committed if it was just created
  if (uploadUserId) {
    let user = await prisma.user.findUnique({
      where: { id: uploadUserId },
    });
    if (!user) {
      // Retry up to 10 times with exponential backoff
      for (let i = 0; i < 10; i++) {
        await prisma.$queryRaw`SELECT 1`;
        const delay = Math.min(100 * Math.pow(2, i), 2000) + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
        user = await prisma.user.findUnique({
          where: { id: uploadUserId },
        });
        if (user) break;
      }
      if (!user) {
        throw new Error(`User ${uploadUserId} not found after retries. Create user before creating document.`);
      }
    }
  }

  // Create document with retry logic for deadlocks and foreign key errors
  let retries = 5;
  let attempt = 0;
  while (retries > 0) {
    try {
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
    } catch (error: any) {
      // Handle deadlocks (40P01) and foreign key errors (P2003)
      if ((error?.code === "P2003" || error?.code === "40P01") && retries > 1) {
        await prisma.$queryRaw`SELECT 1`;
        const delay = Math.min(200 * Math.pow(2, attempt), 2000) + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
        retries--;
        attempt++;
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to create document after retries");
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

