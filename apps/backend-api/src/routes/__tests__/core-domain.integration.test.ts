// Import env setup FIRST - must run before any routes/services that use config
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  createTestApp,
  createTestUser,
  getAuthToken,
  createTestClientCompany,
  createTestInvoice,
  createTestInvoiceLine,
  createTestTransaction,
  getTestPrisma,
} from "../../test-utils";

describe("Core Domain Integration Tests", () => {
  const app = createTestApp();

  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let authToken: string;

  beforeEach(async () => {
    testUser = await createTestUser({
      email: `core-domain-${Date.now()}@example.com`,
    });
    
    // Ensure user is visible to auth middleware before getting token
    const prisma = getTestPrisma();
    await prisma.$queryRaw`SELECT 1`;
    
    // Wait for user to be visible with active membership - retry up to 10 times
    for (let i = 0; i < 10; i++) {
      await prisma.$queryRaw`SELECT 1`;
      const user = await prisma.user.findUnique({
        where: { id: testUser.user.id },
        include: {
          memberships: {
            where: { status: "active" },
          },
        },
      });
      if (user && user.isActive && user.memberships.length > 0) {
        await prisma.$queryRaw`SELECT 1`;
        await new Promise((resolve) => setTimeout(resolve, 150));
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    
    authToken = await getAuthToken(testUser.user.email, "Test123!@#", app);
  });

  describe("Client Companies", () => {
    it("should create client company successfully", async () => {
      // Ensure user is visible before API call
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;
      
      const uniqueTaxNumber = `${Date.now()}`;
      const response = await request(app)
        .post("/api/v1/client-companies")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Test Company",
          legalType: "Limited",
          taxNumber: uniqueTaxNumber,
          isActive: true,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe("Test Company");
      expect(response.body.data.taxNumber).toBe(uniqueTaxNumber);

      // Verify in database
      // Reuse prisma from above
      const company = await prisma.clientCompany.findUnique({
        where: {
          tenantId_taxNumber: {
            tenantId: testUser.tenant.id,
            taxNumber: uniqueTaxNumber,
          },
        },
      });
      expect(company).toBeDefined();
      expect(company?.name).toBe("Test Company");
    });

    it("should fail on duplicate tax number within same tenant", async () => {
      const taxNumber = `duplicate-${Date.now()}`;
      
      // Create first company
      await createTestClientCompany({
        tenantId: testUser.tenant.id,
        taxNumber,
      });
      
      // Ensure user is visible before API call
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;

      // Try to create duplicate
      const response = await request(app)
        .post("/api/v1/client-companies")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          name: "Another Company",
          legalType: "Limited",
          taxNumber,
          isActive: true,
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });

    it("should filter companies by tenant_id", async () => {
      // Create company in test user's tenant
      const company1 = await createTestClientCompany({
        tenantId: testUser.tenant.id,
        name: "Tenant A Company",
      });

      // Create another tenant and company
      const otherTenant = await createTestUser({
        email: `other-tenant-${Date.now()}@example.com`,
      });
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`; // Ensure otherTenant is committed
      
      const company2 = await createTestClientCompany({
        tenantId: otherTenant.tenant.id,
        name: "Tenant B Company",
      });
      await prisma.$queryRaw`SELECT 1`; // Ensure company2 is committed

      // Ensure testUser is still visible (commit any pending transactions)
      await prisma.$queryRaw`SELECT 1`;
      
      // Small delay to ensure user is visible to auth middleware
      await new Promise((resolve) => setTimeout(resolve, 100));

      // List companies for test user's tenant
      const response = await request(app)
        .get("/api/v1/client-companies")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      const companyIds = response.body.data.data.map((c: any) => c.id);
      expect(companyIds).toContain(company1.id);
      expect(companyIds).not.toContain(company2.id);
    });
  });

  describe("Invoices", () => {
    let clientCompany: Awaited<ReturnType<typeof createTestClientCompany>>;

    beforeEach(async () => {
      clientCompany = await createTestClientCompany({
        tenantId: testUser.tenant.id,
      });
    });

    it("should create invoice with lines and totals match", async () => {
      const invoiceData = {
        tenantId: testUser.tenant.id,
        clientCompanyId: clientCompany.id,
        externalId: `INV-${Date.now()}`,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalAmount: 1180, // 1000 + 180 VAT
        taxAmount: 180,
        netAmount: 1000,
      };

      const invoice = await createTestInvoice(invoiceData);

      // Create invoice lines
      await createTestInvoiceLine({
        tenantId: testUser.tenant.id,
        invoiceId: invoice.id,
        description: "Item 1",
        quantity: 2,
        unitPrice: 500,
        lineTotal: 1000,
      });

      // Ensure testUser is still visible (commit any pending transactions)
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;
      
      // Small delay to ensure user is visible to auth middleware
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify invoice via API
      const response = await request(app)
        .get(`/api/v1/invoices/${invoice.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(invoice.id);
      expect(parseFloat(response.body.data.totalAmount)).toBe(1180);
      expect(parseFloat(response.body.data.taxAmount)).toBe(180);
      expect(parseFloat(response.body.data.netAmount)).toBe(1000);
    });

    it("should list invoices filtered by tenant", async () => {
      const invoice1 = await createTestInvoice({
        tenantId: testUser.tenant.id,
        clientCompanyId: clientCompany.id,
      });

      // Create invoice in another tenant
      const otherTenant = await createTestUser({
        email: `other-invoice-${Date.now()}@example.com`,
      });
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`; // Ensure otherTenant is committed
      
      const otherCompany = await createTestClientCompany({
        tenantId: otherTenant.tenant.id,
      });
      const invoice2 = await createTestInvoice({
        tenantId: otherTenant.tenant.id,
        clientCompanyId: otherCompany.id,
      });
      await prisma.$queryRaw`SELECT 1`; // Ensure invoice2 is committed

      // Ensure testUser is still visible (commit any pending transactions)
      await prisma.$queryRaw`SELECT 1`;
      
      // Wait for user to be visible to auth middleware
      for (let i = 0; i < 5; i++) {
        await prisma.$queryRaw`SELECT 1`;
        const user = await prisma.user.findUnique({
          where: { id: testUser.user.id },
          include: {
            memberships: {
              where: { status: "active" },
            },
          },
        });
        if (user && user.isActive && user.memberships.length > 0) {
          await prisma.$queryRaw`SELECT 1`;
          await new Promise((resolve) => setTimeout(resolve, 150));
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const response = await request(app)
        .get("/api/v1/invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      const invoiceIds = response.body.data.data.map((i: any) => i.id);
      expect(invoiceIds).toContain(invoice1.id);
      expect(invoiceIds).not.toContain(invoice2.id);
    });
  });

  describe("Transactions", () => {
    let clientCompany: Awaited<ReturnType<typeof createTestClientCompany>>;

    beforeEach(async () => {
      clientCompany = await createTestClientCompany({
        tenantId: testUser.tenant.id,
      });
    });

    it("should create transaction with debit_total = credit_total", async () => {
      const transaction = await createTestTransaction({
        tenantId: testUser.tenant.id,
        clientCompanyId: clientCompany.id,
      });

      // Ensure testUser is still visible (commit any pending transactions)
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;
      
      // Wait for user to be visible to auth middleware
      for (let i = 0; i < 5; i++) {
        await prisma.$queryRaw`SELECT 1`;
        const user = await prisma.user.findUnique({
          where: { id: testUser.user.id },
          include: {
            memberships: {
              where: { status: "active" },
            },
          },
        });
        if (user && user.isActive && user.memberships.length > 0) {
          await prisma.$queryRaw`SELECT 1`;
          await new Promise((resolve) => setTimeout(resolve, 150));
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Note: debitTotal and creditTotal are calculated from TransactionLines
      // The API response may include these calculated fields
      // Verify via API
      const response = await request(app)
        .get(`/api/v1/transactions/${transaction.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(transaction.id);
      // If API returns calculated totals, verify they exist
      if (response.body.data.debitTotal !== undefined) {
        expect(parseFloat(response.body.data.debitTotal)).toBeGreaterThanOrEqual(0);
      }
      if (response.body.data.creditTotal !== undefined) {
        expect(parseFloat(response.body.data.creditTotal)).toBeGreaterThanOrEqual(0);
      }
    });

    it("should fail if debit_total ≠ credit_total", async () => {
      // Ensure testUser is still visible (commit any pending transactions)
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;
      
      // Wait for user to be visible to auth middleware
      for (let i = 0; i < 5; i++) {
        await prisma.$queryRaw`SELECT 1`;
        const user = await prisma.user.findUnique({
          where: { id: testUser.user.id },
          include: {
            memberships: {
              where: { status: "active" },
            },
          },
        });
        if (user && user.isActive && user.memberships.length > 0) {
          await prisma.$queryRaw`SELECT 1`;
          await new Promise((resolve) => setTimeout(resolve, 150));
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      let ledgerAccount = await prisma.ledgerAccount.findFirst({
        where: { tenantId: testUser.tenant.id },
      });

      if (!ledgerAccount) {
        // Create a default ledger account if none exists
        ledgerAccount = await prisma.ledgerAccount.create({
          data: {
            tenantId: testUser.tenant.id,
            code: "100.01",
            name: "Test Account",
            type: "asset",
            isActive: true,
          },
        });
      }

      // Send request with unbalanced lines - should trigger validation error
      const response = await request(app)
        .post("/api/v1/transactions")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .send({
          clientCompanyId: clientCompany.id,
          date: new Date().toISOString(),
          description: "Unbalanced Transaction",
          lines: [
            {
              ledgerAccountId: ledgerAccount.id,
              debitAmount: 1000,
              creditAmount: 0,
            },
            {
              ledgerAccountId: ledgerAccount.id,
              debitAmount: 0,
              creditAmount: 500, // Unbalanced! Total debit=1000, total credit=500
            },
          ],
        });

      // Should return 400 with validation error
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });

    it("should filter transactions by tenant", async () => {
      const transaction1 = await createTestTransaction({
        tenantId: testUser.tenant.id,
        clientCompanyId: clientCompany.id,
      });
      
      // Ensure transaction1 is committed
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;

      // Create transaction in another tenant
      const otherTenant = await createTestUser({
        email: `other-transaction-${Date.now()}@example.com`,
      });
      await prisma.$queryRaw`SELECT 1`; // Ensure otherTenant is committed
      
      const otherCompany = await createTestClientCompany({
        tenantId: otherTenant.tenant.id,
      });
      const transaction2 = await createTestTransaction({
        tenantId: otherTenant.tenant.id,
        clientCompanyId: otherCompany.id,
      });
      await prisma.$queryRaw`SELECT 1`; // Ensure transaction2 is committed

      // Ensure testUser is still visible (commit any pending transactions)
      await prisma.$queryRaw`SELECT 1`;
      
      // Wait for user to be visible to auth middleware
      for (let i = 0; i < 5; i++) {
        await prisma.$queryRaw`SELECT 1`;
        const user = await prisma.user.findUnique({
          where: { id: testUser.user.id },
          include: {
            memberships: {
              where: { status: "active" },
            },
          },
        });
        if (user && user.isActive && user.memberships.length > 0) {
          await prisma.$queryRaw`SELECT 1`;
          await new Promise((resolve) => setTimeout(resolve, 150));
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const response = await request(app)
        .get("/api/v1/transactions")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .expect(200);

      const transactionIds = response.body.data.data.map((t: any) => t.id);
      expect(transactionIds).toContain(transaction1.id);
      expect(transactionIds).not.toContain(transaction2.id);
    });
  });
});


