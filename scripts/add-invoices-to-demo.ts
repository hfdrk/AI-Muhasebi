/**
 * Add Invoices to Demo Tenant
 * 
 * Adds sample invoices to the existing "Demo Ofis" tenant
 * 
 * Usage:
 *   pnpm tsx scripts/add-invoices-to-demo.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function addInvoicesToDemo() {
  console.log("🌱 Adding invoices to Demo Ofis tenant...\n");

  // Find the demo tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "demo-ofis" },
  });

  if (!tenant) {
    console.log("❌ Demo tenant not found. Please run 'pnpm seed:demo-tenant' first.");
    process.exit(1);
  }

  console.log(`✅ Found tenant: ${tenant.name} (${tenant.id})\n`);

  // Get client companies for this tenant
  const companies = await prisma.clientCompany.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
    },
    take: 5,
  });

  if (companies.length === 0) {
    console.log("❌ No client companies found. Please create companies first.");
    process.exit(1);
  }

  console.log(`✅ Found ${companies.length} client companies\n`);

  // Check existing invoices
  const existingCount = await prisma.invoice.count({
    where: { tenantId: tenant.id },
  });

  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing invoices. Adding more...\n`);
  }

  // Create invoices with different statuses
  console.log("📄 Creating invoices...");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 30);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const invoiceStatuses = ["taslak", "kesildi", "kesildi", "iptal", "muhasebeleştirilmiş"];
  const invoiceTypes = ["SATIŞ", "ALIŞ"];
  
  let invoiceCount = 0;
  const invoicesToCreate = [];

  for (let i = 0; i < 15; i++) {
    const company = companies[i % companies.length];
    const status = invoiceStatuses[i % invoiceStatuses.length];
    const type = invoiceTypes[i % 2];
    const baseAmount = 1000 + (i * 500);
    const taxAmount = baseAmount * 0.18;
    const netAmount = baseAmount - taxAmount;
    
    const issueDate = new Date(today);
    issueDate.setDate(issueDate.getDate() - (i % 30)); // Spread over last 30 days
    
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    invoicesToCreate.push({
      tenantId: tenant.id,
      clientCompanyId: company.id,
      externalId: `INV-2025-${String(existingCount + i + 1).padStart(4, "0")}`,
      type,
      issueDate,
      dueDate,
      totalAmount: new Decimal(baseAmount),
      currency: "TRY",
      taxAmount: new Decimal(taxAmount),
      netAmount: new Decimal(netAmount),
      counterpartyName: company.name,
      counterpartyTaxNumber: company.taxNumber,
      status,
      source: "manual",
    });
  }

  // Create invoices with lines
  for (const invoiceData of invoicesToCreate) {
    const invoice = await prisma.invoice.create({
      data: {
        ...invoiceData,
        lines: {
          create: [
            {
              tenantId: tenant.id,
              lineNumber: 1,
              description: `Ürün/Hizmet ${invoiceCount + 1}`,
              quantity: new Decimal(1),
              unitPrice: new Decimal(Number(invoiceData.netAmount)),
              lineTotal: new Decimal(Number(invoiceData.netAmount)),
              vatRate: new Decimal(0.18),
              vatAmount: new Decimal(Number(invoiceData.taxAmount)),
            },
          ],
        },
      },
    });
    invoiceCount++;
    console.log(`   ✅ Created invoice: ${invoice.externalId} (${invoice.status})`);
  }

  console.log(`\n✅ Successfully created ${invoiceCount} invoices!`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Total invoices in tenant: ${existingCount + invoiceCount}`);
  console.log(`   - Status breakdown:`);
  
  const statusCounts = await prisma.invoice.groupBy({
    by: ["status"],
    where: { tenantId: tenant.id },
    _count: true,
  });
  
  statusCounts.forEach(({ status, _count }) => {
    console.log(`     ${status}: ${_count}`);
  });
}

addInvoicesToDemo()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

