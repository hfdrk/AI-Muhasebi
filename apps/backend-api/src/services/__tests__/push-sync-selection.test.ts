// Import env setup FIRST
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import { getTestPrisma, createTestTenant, createTestClientCompany, createTestInvoice, createTestTransaction, createTestInvoiceLine } from "../../test-utils";

// Import integration sync processor dynamically to avoid module loading issues
async function getIntegrationSyncProcessor() {
  try {
    const module = await import("../../../../worker-jobs/src/processors/integration-sync-processor.js");
    return module.integrationSyncProcessor;
  } catch (error1: unknown) {
    try {
      const module = await import("../../../../worker-jobs/src/processors/integration-sync-processor");
      return module.integrationSyncProcessor;
    } catch (error2: unknown) {
      const msg1 = error1 instanceof Error ? error1.message : String(error1);
      const msg2 = error2 instanceof Error ? error2.message : String(error2);
      throw new Error(`Failed to load IntegrationSyncProcessor: ${msg1}, ${msg2}`);
    }
  }
}

describe("Push Sync Selection Logic", () => {
  let tenantId: string;
  let clientCompanyId: string;
  const prisma = getTestPrisma();

  beforeEach(async () => {
    // Create test tenant and client company
    const tenant = await createTestTenant("Test Tenant", "test-tenant");
    tenantId = tenant.tenantId;

    const clientCompany = await createTestClientCompany({
      tenantId,
      name: "Test Company",
      taxNumber: "1234567890",
    });
    clientCompanyId = clientCompany.id;
  });

  describe("getInvoicesToPush", () => {
    it("should only return invoices with status 'kesildi'", async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      // Create invoices with different statuses
      const kesildiInvoice = await createTestInvoice({
        tenantId,
        clientCompanyId,
        externalId: "INV-001",
        status: "kesildi",
        issueDate: yesterday,
        totalAmount: 1000,
        taxAmount: 180,
      });

      const taslakInvoice = await createTestInvoice({
        tenantId,
        clientCompanyId,
        externalId: "INV-002",
        status: "taslak",
        issueDate: yesterday,
        totalAmount: 2000,
        taxAmount: 360,
      });

      const iptalInvoice = await createTestInvoice({
        tenantId,
        clientCompanyId,
        externalId: "INV-003",
        status: "iptal",
        issueDate: yesterday,
        totalAmount: 3000,
        taxAmount: 540,
      });

      // Access private method via reflection (for testing)
      const processor = await getIntegrationSyncProcessor();
      const invoicesToPush = await (processor as any).getInvoicesToPush(
        tenantId,
        clientCompanyId,
        yesterday
      );

      // Should only return the "kesildi" invoice
      expect(invoicesToPush).toHaveLength(1);
      expect(invoicesToPush[0].invoiceId).toBe(kesildiInvoice.id);
      expect(invoicesToPush[0].externalId).toBe("INV-001");
    });

    it("should not return invoices that were already pushed", async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Create invoice that was already pushed
      const pushedInvoice = await createTestInvoice({
        tenantId,
        clientCompanyId,
        externalId: "INV-PUSHED",
        status: "kesildi",
        issueDate: twoDaysAgo,
        totalAmount: 1000,
        taxAmount: 180,
      });

      // Mark as pushed
      await prisma.invoice.update({
        where: { id: pushedInvoice.id },
        data: { pushedAt: twoDaysAgo },
      });

      // Create new invoice that should be pushed
      const newInvoice = await createTestInvoice({
        tenantId,
        clientCompanyId,
        externalId: "INV-NEW",
        status: "kesildi",
        issueDate: yesterday,
        totalAmount: 2000,
        taxAmount: 360,
      });

      const processor = await getIntegrationSyncProcessor();
      const invoicesToPush = await (processor as any).getInvoicesToPush(
        tenantId,
        clientCompanyId,
        twoDaysAgo
      );

      // Should only return the new invoice, not the already pushed one
      expect(invoicesToPush).toHaveLength(1);
      expect(invoicesToPush[0].invoiceId).toBe(newInvoice.id);
      expect(invoicesToPush[0].externalId).toBe("INV-NEW");
    });

    it("should include invoice lines in the result", async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const invoice = await createTestInvoice({
        tenantId,
        clientCompanyId,
        externalId: "INV-WITH-LINES",
        status: "kesildi",
        issueDate: yesterday,
        totalAmount: 1180,
        taxAmount: 180,
      });

      await createTestInvoiceLine({
        tenantId,
        invoiceId: invoice.id,
        lineNumber: 1,
        description: "Test Item",
        quantity: 1,
        unitPrice: 1000,
        lineTotal: 1180,
        vatRate: 0.18,
        vatAmount: 180,
      });

      const processor = await getIntegrationSyncProcessor();
      const invoicesToPush = await (processor as any).getInvoicesToPush(
        tenantId,
        clientCompanyId,
        yesterday
      );

      expect(invoicesToPush).toHaveLength(1);
      expect(invoicesToPush[0].lines).toHaveLength(1);
      expect(invoicesToPush[0].lines[0].description).toBe("Test Item");
      expect(invoicesToPush[0].lines[0].quantity).toBe(1);
    });
  });

  describe("getTransactionsToPush", () => {
    it("should calculate transaction amount from transaction lines", async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const transaction = await createTestTransaction({
        tenantId,
        clientCompanyId,
        date: yesterday,
        description: "Test Transaction",
      });

      // Add transaction lines
      await prisma.transactionLine.create({
        data: {
          tenantId,
          transactionId: transaction.id,
          ledgerAccountId: (await prisma.ledgerAccount.findFirst({ where: { tenantId } }))!.id,
          debitAmount: 1000,
          creditAmount: 0,
        },
      });

      await prisma.transactionLine.create({
        data: {
          tenantId,
          transactionId: transaction.id,
          ledgerAccountId: (await prisma.ledgerAccount.findFirst({ where: { tenantId } }))!.id,
          debitAmount: 0,
          creditAmount: 500,
        },
      });

      const processor = await getIntegrationSyncProcessor();
      const transactionsToPush = await (processor as any).getTransactionsToPush(
        tenantId,
        clientCompanyId,
        yesterday
      );

      expect(transactionsToPush).toHaveLength(1);
      // Amount should be sum of debit and credit: 1000 + 0 + 0 + 500 = 1500
      expect(transactionsToPush[0].amount).toBe(1500);
    });

    it("should detect currency from primary bank account", async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      // Create bank account with EUR currency
      await prisma.clientCompanyBankAccount.create({
        data: {
          tenantId,
          clientCompanyId,
          bankName: "Test Bank",
          iban: "TR330006100519786457841326",
          currency: "EUR",
          isPrimary: true,
        },
      });

      const transaction = await createTestTransaction({
        tenantId,
        clientCompanyId,
        date: yesterday,
        description: "EUR Transaction",
      });

      const processor = await getIntegrationSyncProcessor();
      const transactionsToPush = await (processor as any).getTransactionsToPush(
        tenantId,
        clientCompanyId,
        yesterday
      );

      expect(transactionsToPush).toHaveLength(1);
      expect(transactionsToPush[0].currency).toBe("EUR");
    });

    it("should default to TRY if no bank account found", async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const transaction = await createTestTransaction({
        tenantId,
        clientCompanyId,
        date: yesterday,
        description: "Transaction without bank account",
      });

      const processor = await getIntegrationSyncProcessor();
      const transactionsToPush = await (processor as any).getTransactionsToPush(
        tenantId,
        clientCompanyId,
        yesterday
      );

      expect(transactionsToPush).toHaveLength(1);
      expect(transactionsToPush[0].currency).toBe("TRY");
    });

    it("should not return transactions that were already pushed", async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const pushedTransaction = await createTestTransaction({
        tenantId,
        clientCompanyId,
        date: twoDaysAgo,
        description: "Already Pushed",
      });

      // Mark as pushed
      await prisma.transaction.update({
        where: { id: pushedTransaction.id },
        data: { pushedAt: twoDaysAgo },
      });

      const newTransaction = await createTestTransaction({
        tenantId,
        clientCompanyId,
        date: yesterday,
        description: "New Transaction",
      });

      const processor = await getIntegrationSyncProcessor();
      const transactionsToPush = await (processor as any).getTransactionsToPush(
        tenantId,
        clientCompanyId,
        twoDaysAgo
      );

      // Should only return the new transaction
      expect(transactionsToPush).toHaveLength(1);
      expect(transactionsToPush[0].transactionId).toBe(newTransaction.id);
    });
  });
});


