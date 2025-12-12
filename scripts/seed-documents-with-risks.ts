/**
 * Seed Documents with Risk Scores
 * 
 * Creates sample documents with various risk levels for testing.
 * 
 * Usage:
 *   pnpm tsx scripts/seed-documents-with-risks.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedDocumentsWithRisks() {
  console.log("🌱 Starting document seeding with risk scores...\n");

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
        take: 5,
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
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Document types and risk scenarios
  const documentTypes: Array<"INVOICE" | "BANK_STATEMENT" | "RECEIPT" | "OTHER"> = [
    "INVOICE",
    "BANK_STATEMENT",
    "RECEIPT",
    "OTHER",
  ];

  // Create documents with various risk levels
  const documents = await Promise.all([
    // HIGH RISK documents (score 70-100) - Increased to 20 for better testing
    ...Array.from({ length: 20 }, (_, i) =>
      prisma.document.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: tenant.clientCompanies[i % tenant.clientCompanies.length].id,
          type: documentTypes[i % documentTypes.length],
          originalFileName: `high_risk_document_${String(i + 1).padStart(3, "0")}.pdf`,
          storagePath: `documents/${tenant.id}/high_risk_${String(i + 1).padStart(3, "0")}.pdf`,
          mimeType: "application/pdf",
          fileSizeBytes: BigInt((200 + i * 50) * 1024),
          uploadUserId: user.id,
          uploadSource: "manual",
          status: i % 4 === 0 ? "FAILED" : i % 4 === 1 ? "PROCESSING" : "PROCESSED",
          processingErrorMessage: i % 4 === 0 ? "OCR parsing failed - low confidence" : i % 4 === 1 ? "Processing in progress" : null,
          processedAt: i % 4 === 0 || i % 4 === 1 ? null : new Date(today.getTime() - i * 24 * 60 * 60 * 1000),
        },
      })
    ),

    // MEDIUM RISK documents (score 40-69)
    ...Array.from({ length: 6 }, (_, i) =>
      prisma.document.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: tenant.clientCompanies[(i + 2) % tenant.clientCompanies.length].id,
          type: documentTypes[(i + 1) % documentTypes.length],
          originalFileName: `medium_risk_document_${String(i + 1).padStart(3, "0")}.pdf`,
          storagePath: `documents/${tenant.id}/medium_risk_${String(i + 1).padStart(3, "0")}.pdf`,
          mimeType: "application/pdf",
          fileSizeBytes: BigInt((150 + i * 30) * 1024),
          uploadUserId: user.id,
          uploadSource: "manual",
          status: "PROCESSED",
          processedAt: new Date(today.getTime() - (i + 2) * 24 * 60 * 60 * 1000),
        },
      })
    ),

    // LOW RISK documents (score 0-39)
    ...Array.from({ length: 5 }, (_, i) =>
      prisma.document.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: tenant.clientCompanies[(i + 1) % tenant.clientCompanies.length].id,
          type: documentTypes[(i + 2) % documentTypes.length],
          originalFileName: `low_risk_document_${String(i + 1).padStart(3, "0")}.pdf`,
          storagePath: `documents/${tenant.id}/low_risk_${String(i + 1).padStart(3, "0")}.pdf`,
          mimeType: "application/pdf",
          fileSizeBytes: BigInt((100 + i * 20) * 1024),
          uploadUserId: user.id,
          uploadSource: "manual",
          status: "PROCESSED",
          processedAt: new Date(today.getTime() - (i + 3) * 24 * 60 * 60 * 1000),
        },
      })
    ),
  ]);

  console.log(`✅ Created ${documents.length} documents\n`);

  // Create risk scores for documents
  const riskScores = await Promise.all([
    // HIGH RISK scores (70-100) - Now for 20 documents
    ...documents.slice(0, 20).map((doc, i) =>
      prisma.documentRiskScore.create({
        data: {
          tenantId: tenant.id,
          documentId: doc.id,
          score: 70 + (i * 1.5), // 70, 71.5, 73, 74.5, ... up to 98.5
          severity: "high",
          triggeredRuleCodes: [
            i % 3 === 0 ? "DOC_PARSING_FAILED" : null,
            i % 3 === 1 ? "INV_MISSING_TAX_NUMBER" : null,
            i % 3 === 2 ? "INV_AMOUNT_MISMATCH" : null,
            i % 4 === 0 ? "INV_SUSPICIOUS_AMOUNT" : null,
            i % 5 === 0 ? "INV_DUPLICATE_DETECTED" : null,
            i % 6 === 0 ? "INV_DATE_ANOMALY" : null,
          ].filter(Boolean) as string[],
          generatedAt: new Date(today.getTime() - i * 24 * 60 * 60 * 1000),
        },
      })
    ),

    // MEDIUM RISK scores (40-69)
    ...documents.slice(20, 26).map((doc, i) =>
      prisma.documentRiskScore.create({
        data: {
          tenantId: tenant.id,
          documentId: doc.id,
          score: 40 + i * 4.5, // 40, 44.5, 49, 53.5, 58, 62.5
          severity: "medium",
          triggeredRuleCodes: i % 2 === 0 ? ["INV_INCOMPLETE_DATA"] : [],
          generatedAt: new Date(today.getTime() - (i + 2) * 24 * 60 * 60 * 1000),
        },
      })
    ),

    // LOW RISK scores (0-39)
    ...documents.slice(26, 31).map((doc, i) =>
      prisma.documentRiskScore.create({
        data: {
          tenantId: tenant.id,
          documentId: doc.id,
          score: 10 + i * 5, // 10, 15, 20, 25, 30
          severity: "low",
          triggeredRuleCodes: [],
          generatedAt: new Date(today.getTime() - (i + 3) * 24 * 60 * 60 * 1000),
        },
      })
    ),
  ]);

  console.log(`✅ Created ${riskScores.length} document risk scores\n`);

  // Summary
  const highRiskCount = riskScores.filter((rs) => rs.severity === "high").length;
  const mediumRiskCount = riskScores.filter((rs) => rs.severity === "medium").length;
  const lowRiskCount = riskScores.filter((rs) => rs.severity === "low").length;

  console.log("📊 Summary:");
  console.log(`   High Risk Documents: ${highRiskCount}`);
  console.log(`   Medium Risk Documents: ${mediumRiskCount}`);
  console.log(`   Low Risk Documents: ${lowRiskCount}`);
  console.log(`   Total Documents: ${documents.length}\n`);

  console.log("✅ Document seeding completed successfully!");
}

seedDocumentsWithRisks()
  .catch((error) => {
    console.error("❌ Error seeding documents:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

