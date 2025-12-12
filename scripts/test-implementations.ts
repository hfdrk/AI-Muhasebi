#!/usr/bin/env tsx

/**
 * Manual Test Script for Implemented Features
 * 
 * This script tests:
 * 1. Push Sync Selection Logic
 * 2. Retry Queue Functionality
 * 3. Risk Score History Storage
 * 
 * Run with: pnpm tsx scripts/test-implementations.ts
 */

import { prisma } from "../apps/backend-api/src/lib/prisma";
import { retryQueueService } from "../apps/backend-api/src/services/retry-queue-service";
import { riskTrendService } from "../apps/backend-api/src/services/risk-trend-service";

async function testPushSyncSelection() {
  console.log("\n🧪 Testing Push Sync Selection Logic...\n");

  // Create test tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Test Tenant",
      slug: `test-tenant-${Date.now()}`,
    },
  });

  // Create test client company
  const clientCompany = await prisma.clientCompany.create({
    data: {
      tenantId: tenant.id,
      name: "Test Company",
      taxNumber: `1234567890-${Date.now()}`,
      legalType: "Limited",
    },
  });

  // Create invoices with different statuses
  const kesildiInvoice = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      clientCompanyId: clientCompany.id,
      externalId: "INV-KESILDI",
      type: "SATIŞ",
      issueDate: new Date(),
      totalAmount: 1000,
      taxAmount: 180,
      currency: "TRY",
      status: "kesildi",
    },
  });

  const taslakInvoice = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      clientCompanyId: clientCompany.id,
      externalId: "INV-TASLAK",
      type: "SATIŞ",
      issueDate: new Date(),
      totalAmount: 2000,
      taxAmount: 360,
      currency: "TRY",
      status: "taslak",
    },
  });

  // Test: Get invoices to push (should only return "kesildi")
  const { integrationSyncProcessor } = await import("../apps/worker-jobs/src/processors/integration-sync-processor");
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 1);

  const invoicesToPush = await (integrationSyncProcessor as any).getInvoicesToPush(
    tenant.id,
    clientCompany.id,
    sinceDate
  );

  console.log(`✅ Found ${invoicesToPush.length} invoice(s) to push`);
  console.log(`   Expected: 1 (only "kesildi" invoice)`);
  
  if (invoicesToPush.length === 1 && invoicesToPush[0].externalId === "INV-KESILDI") {
    console.log("   ✅ PASS: Only 'kesildi' invoice returned");
  } else {
    console.log("   ❌ FAIL: Wrong invoices returned");
  }

  // Test: Duplicate tracking
  await prisma.invoice.update({
    where: { id: kesildiInvoice.id },
    data: { pushedAt: new Date() },
  });

  const invoicesToPushAfter = await (integrationSyncProcessor as any).getInvoicesToPush(
    tenant.id,
    clientCompany.id,
    sinceDate
  );

  console.log(`\n✅ After marking invoice as pushed, found ${invoicesToPushAfter.length} invoice(s) to push`);
  console.log(`   Expected: 0 (already pushed)`);
  
  if (invoicesToPushAfter.length === 0) {
    console.log("   ✅ PASS: Already pushed invoice not returned");
  } else {
    console.log("   ❌ FAIL: Already pushed invoice was returned");
  }

  // Test: Transaction amount calculation
  const transaction = await prisma.transaction.create({
    data: {
      tenantId: tenant.id,
      clientCompanyId: clientCompany.id,
      date: new Date(),
      description: "Test Transaction",
    },
  });

  // Create ledger account
  const ledgerAccount = await prisma.ledgerAccount.create({
    data: {
      tenantId: tenant.id,
      code: "100",
      name: "Test Account",
      type: "asset",
    },
  });

  // Add transaction lines
  await prisma.transactionLine.createMany({
    data: [
      {
        tenantId: tenant.id,
        transactionId: transaction.id,
        ledgerAccountId: ledgerAccount.id,
        debitAmount: 1000,
        creditAmount: 0,
      },
      {
        tenantId: tenant.id,
        transactionId: transaction.id,
        ledgerAccountId: ledgerAccount.id,
        debitAmount: 0,
        creditAmount: 500,
      },
    ],
  });

  const transactionsToPush = await (integrationSyncProcessor as any).getTransactionsToPush(
    tenant.id,
    clientCompany.id,
    sinceDate
  );

  console.log(`\n✅ Found ${transactionsToPush.length} transaction(s) to push`);
  if (transactionsToPush.length > 0) {
    const amount = transactionsToPush[0].amount;
    console.log(`   Transaction amount: ${amount}`);
    console.log(`   Expected: 1500 (1000 + 500)`);
    
    if (amount === 1500) {
      console.log("   ✅ PASS: Transaction amount calculated correctly");
    } else {
      console.log("   ❌ FAIL: Transaction amount calculation incorrect");
    }
  }

  // Cleanup
  await prisma.transactionLine.deleteMany({ where: { transactionId: transaction.id } });
  await prisma.transaction.delete({ where: { id: transaction.id } });
  await prisma.ledgerAccount.delete({ where: { id: ledgerAccount.id } });
  await prisma.invoice.delete({ where: { id: kesildiInvoice.id } });
  await prisma.invoice.delete({ where: { id: taslakInvoice.id } });
  await prisma.clientCompany.delete({ where: { id: clientCompany.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } });

  console.log("\n✅ Push Sync Selection Logic tests complete!\n");
}

async function testRetryQueue() {
  console.log("\n🧪 Testing Retry Queue Functionality...\n");

  // Create test tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Test Tenant",
      slug: `test-tenant-retry-${Date.now()}`,
    },
  });

  // Test: Enqueue email
  const emailPayload = {
    to: "test@example.com",
    subject: "Test Email",
    html: "<p>Test</p>",
  };

  const emailItemId = await retryQueueService.enqueue("email", emailPayload, 3, 1000);
  console.log(`✅ Enqueued email retry item: ${emailItemId}`);

  // Test: Enqueue job
  const jobPayload = {
    jobType: "DOCUMENT_PROCESSING",
    tenantId: tenant.id,
    documentId: "test-doc-id",
  };

  const jobItemId = await retryQueueService.enqueue("job", jobPayload, 3, 1000);
  console.log(`✅ Enqueued job retry item: ${jobItemId}`);

  // Test: Enqueue sync
  const syncPayload = {
    jobId: "test-sync-job-id",
  };

  const syncItemId = await retryQueueService.enqueue("sync", syncPayload, 3, 1000);
  console.log(`✅ Enqueued sync retry item: ${syncItemId}`);

  // Get stats
  const stats = await retryQueueService.getStats();
  console.log(`\n📊 Retry Queue Stats:`);
  console.log(`   Pending: ${stats.pending}`);
  console.log(`   Processing: ${stats.processing}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Success: ${stats.success}`);

  if (stats.pending >= 3) {
    console.log("   ✅ PASS: All items enqueued successfully");
  } else {
    console.log("   ❌ FAIL: Some items not enqueued");
  }

  // Cleanup
  await prisma.retryQueue.deleteMany({
    where: {
      id: { in: [emailItemId, jobItemId, syncItemId] },
    },
  });

  await prisma.tenant.delete({ where: { id: tenant.id } });

  console.log("\n✅ Retry Queue tests complete!\n");
}

async function testRiskScoreHistory() {
  console.log("\n🧪 Testing Risk Score History Storage...\n");

  // Create test tenant and client company
  const tenant = await prisma.tenant.create({
    data: {
      name: "Test Tenant",
      slug: `test-tenant-history-${Date.now()}`,
    },
  });

  const clientCompany = await prisma.clientCompany.create({
    data: {
      tenantId: tenant.id,
      name: "Test Company",
      taxNumber: `1234567890-${Date.now()}`,
      legalType: "Limited",
    },
  });

  const document = await prisma.document.create({
    data: {
      tenantId: tenant.id,
      clientCompanyId: clientCompany.id,
      type: "INVOICE",
      originalFileName: "test.pdf",
      storagePath: "test/test.pdf",
      mimeType: "application/pdf",
      status: "PENDING",
    },
  });

  // Test: Store document risk score history
  await riskTrendService.storeRiskScoreHistory(
    tenant.id,
    "document",
    document.id,
    75,
    "high"
  );

  const docHistory = await prisma.riskScoreHistory.findFirst({
    where: {
      tenantId: tenant.id,
      entityType: "document",
      entityId: document.id,
    },
  });

  console.log(`✅ Stored document risk score history`);
  if (docHistory && docHistory.score === 75 && docHistory.severity === "high") {
    console.log("   ✅ PASS: Document history stored correctly");
  } else {
    console.log("   ❌ FAIL: Document history not stored correctly");
  }

  // Test: Store company risk score history
  await riskTrendService.storeRiskScoreHistory(
    tenant.id,
    "company",
    clientCompany.id,
    60,
    "medium"
  );

  const companyHistory = await prisma.riskScoreHistory.findFirst({
    where: {
      tenantId: tenant.id,
      entityType: "company",
      entityId: clientCompany.id,
    },
  });

  console.log(`✅ Stored company risk score history`);
  if (companyHistory && companyHistory.score === 60 && companyHistory.severity === "medium") {
    console.log("   ✅ PASS: Company history stored correctly");
  } else {
    console.log("   ❌ FAIL: Company history not stored correctly");
  }

  // Test: Multiple history records
  await riskTrendService.storeRiskScoreHistory(
    tenant.id,
    "document",
    document.id,
    80,
    "high"
  );

  const allHistory = await prisma.riskScoreHistory.findMany({
    where: {
      tenantId: tenant.id,
      entityType: "document",
      entityId: document.id,
    },
  });

  console.log(`\n✅ Stored multiple history records: ${allHistory.length}`);
  if (allHistory.length === 2) {
    console.log("   ✅ PASS: Multiple history records stored");
  } else {
    console.log("   ❌ FAIL: Multiple history records not stored");
  }

  // Cleanup
  await prisma.riskScoreHistory.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.document.delete({ where: { id: document.id } });
  await prisma.clientCompany.delete({ where: { id: clientCompany.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } });

  console.log("\n✅ Risk Score History tests complete!\n");
}

async function main() {
  console.log("🚀 Starting Implementation Tests...\n");
  console.log("=" .repeat(60));

  try {
    await testPushSyncSelection();
    await testRetryQueue();
    await testRiskScoreHistory();

    console.log("=" .repeat(60));
    console.log("\n✅ All tests completed successfully!\n");
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

