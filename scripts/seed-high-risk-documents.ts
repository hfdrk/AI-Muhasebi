/**
 * Seed High Risk Documents Only
 * 
 * Creates additional high-risk documents specifically for testing.
 * This script focuses on creating documents with high risk scores (70-100).
 * 
 * Usage:
 *   pnpm tsx scripts/seed-high-risk-documents.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedHighRiskDocuments() {
  console.log("🌱 Starting high-risk document seeding...\n");

  // Get the first active tenant
  const tenant = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
    include: {
      memberships: {
        where: { role: "TenantOwner" },
        take: 1,
        include: { user: true },
      },
      clientCompanies: {
        where: { isActive: true },
        take: 10,
      },
    },
  });

  if (!tenant) {
    console.error("❌ No active tenant found. Please create a tenant first.");
    process.exit(1);
  }

  if (tenant.clientCompanies.length === 0) {
    console.error("❌ No client companies found. Please create client companies first.");
    process.exit(1);
  }

  const user = tenant.memberships[0]?.user;
  if (!user) {
    console.error("❌ No user found for tenant. Please create a user first.");
    process.exit(1);
  }

  console.log(`✅ Found tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`✅ Found ${tenant.clientCompanies.length} client companies`);
  console.log(`✅ Using user: ${user.email}\n`);

  const today = new Date();

  // Document types
  const documentTypes: Array<"INVOICE" | "BANK_STATEMENT" | "RECEIPT" | "OTHER"> = [
    "INVOICE",
    "BANK_STATEMENT",
    "RECEIPT",
    "OTHER",
  ];

  // High-risk scenarios with different issues
  const riskScenarios = [
    { name: "OCR_FAILED", rule: "DOC_PARSING_FAILED", score: 85 },
    { name: "MISSING_TAX", rule: "INV_MISSING_TAX_NUMBER", score: 78 },
    { name: "AMOUNT_MISMATCH", rule: "INV_AMOUNT_MISMATCH", score: 82 },
    { name: "SUSPICIOUS_AMOUNT", rule: "INV_SUSPICIOUS_AMOUNT", score: 90 },
    { name: "DUPLICATE", rule: "INV_DUPLICATE_DETECTED", score: 88 },
    { name: "DATE_ANOMALY", rule: "INV_DATE_ANOMALY", score: 75 },
    { name: "MISSING_SIGNATURE", rule: "INV_MISSING_SIGNATURE", score: 80 },
    { name: "INVALID_FORMAT", rule: "DOC_INVALID_FORMAT", score: 72 },
    { name: "MULTIPLE_ISSUES", rule: "MULTIPLE_RISK_FLAGS", score: 95 },
    { name: "CRITICAL_ERROR", rule: "DOC_CRITICAL_ERROR", score: 98 },
  ];

  console.log("📄 Creating 30 high-risk documents...\n");

  // Create 30 high-risk documents
  const documents = await Promise.all(
    Array.from({ length: 30 }, (_, i) => {
      const scenario = riskScenarios[i % riskScenarios.length];
      const clientIndex = i % tenant.clientCompanies.length;
      const docType = documentTypes[i % documentTypes.length];
      
      return prisma.document.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: tenant.clientCompanies[clientIndex].id,
          type: docType,
          originalFileName: `HIGH_RISK_${scenario.name}_${String(i + 1).padStart(3, "0")}.pdf`,
          storagePath: `documents/${tenant.id}/high_risk_${scenario.name}_${String(i + 1).padStart(3, "0")}.pdf`,
          mimeType: "application/pdf",
          fileSizeBytes: BigInt((250 + i * 30) * 1024),
          uploadUserId: user.id,
          uploadSource: "manual",
          status: i % 5 === 0 ? "FAILED" : i % 5 === 1 ? "PROCESSING" : "PROCESSED",
          processingErrorMessage: i % 5 === 0 ? `Processing failed: ${scenario.rule}` : null,
          processedAt: i % 5 === 0 || i % 5 === 1 ? null : new Date(today.getTime() - i * 12 * 60 * 60 * 1000),
        },
      });
    })
  );

  console.log(`✅ Created ${documents.length} high-risk documents\n`);

  // Create risk scores for all documents
  console.log("⚠️  Creating high-risk scores...\n");
  
  const riskScores = await Promise.all(
    documents.map((doc, i) => {
      const scenario = riskScenarios[i % riskScenarios.length];
      const baseScore = scenario.score;
      // Vary scores slightly (70-100 range)
      const score = Math.min(100, baseScore + (i % 5) - 2);
      
      // Multiple rule codes for more realistic scenarios
      const ruleCodes = [scenario.rule];
      if (i % 3 === 0) {
        ruleCodes.push("INV_AMOUNT_MISMATCH");
      }
      if (i % 4 === 0) {
        ruleCodes.push("INV_DATE_ANOMALY");
      }
      if (i % 5 === 0) {
        ruleCodes.push("INV_SUSPICIOUS_AMOUNT");
      }

      return prisma.documentRiskScore.create({
        data: {
          tenantId: tenant.id,
          documentId: doc.id,
          score: score,
          severity: "high",
          triggeredRuleCodes: ruleCodes,
          generatedAt: new Date(today.getTime() - i * 12 * 60 * 60 * 1000),
        },
      });
    })
  );

  console.log(`✅ Created ${riskScores.length} high-risk scores\n`);

  // Summary
  const scoreRange = riskScores.map(rs => Number(rs.score));
  const minScore = Math.min(...scoreRange);
  const maxScore = Math.max(...scoreRange);
  const avgScore = scoreRange.reduce((a, b) => a + b, 0) / scoreRange.length;

  console.log("📊 High-Risk Documents Summary:");
  console.log(`   Total High-Risk Documents: ${riskScores.length}`);
  console.log(`   Score Range: ${minScore.toFixed(1)} - ${maxScore.toFixed(1)}`);
  console.log(`   Average Score: ${avgScore.toFixed(1)}`);
  console.log(`   Document Types: INVOICE, BANK_STATEMENT, RECEIPT, OTHER`);
  console.log(`   Status Distribution:`);
  
  const statusCounts = documents.reduce((acc, doc) => {
    acc[doc.status] = (acc[doc.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`     ${status}: ${count}`);
  });

  console.log("\n✅ High-risk document seeding completed successfully!");
  console.log("\n💡 Next steps:");
  console.log("   1. Restart your backend server if it's running");
  console.log("   2. Refresh the Documents page");
  console.log("   3. Filter by 'Yüksek Risk' to see all high-risk documents");
  console.log("   4. Check the Risk Dashboard for updated counts");
}

seedHighRiskDocuments()
  .catch((error) => {
    console.error("❌ Error seeding high-risk documents:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


