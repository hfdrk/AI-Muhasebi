/**
 * Verify Documents in Database
 * 
 * Quick script to check if documents and risk scores exist
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyDocuments() {
  console.log("🔍 Verifying documents in database...\n");

  // Get first tenant
  const tenant = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!tenant) {
    console.error("❌ No tenant found");
    process.exit(1);
  }

  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})\n`);

  // Count documents
  const documentCount = await prisma.document.count({
    where: {
      tenantId: tenant.id,
      isDeleted: false,
    },
  });

  console.log(`📄 Total Documents: ${documentCount}`);

  // Count risk scores
  const riskScoreCount = await prisma.documentRiskScore.count({
    where: {
      tenantId: tenant.id,
    },
  });

  console.log(`⚠️  Total Risk Scores: ${riskScoreCount}\n`);

  // Count by severity
  const highRisk = await prisma.documentRiskScore.count({
    where: {
      tenantId: tenant.id,
      severity: "high",
    },
  });

  const mediumRisk = await prisma.documentRiskScore.count({
    where: {
      tenantId: tenant.id,
      severity: "medium",
    },
  });

  const lowRisk = await prisma.documentRiskScore.count({
    where: {
      tenantId: tenant.id,
      severity: "low",
    },
  });

  console.log("📊 Risk Distribution:");
  console.log(`   High Risk: ${highRisk}`);
  console.log(`   Medium Risk: ${mediumRisk}`);
  console.log(`   Low Risk: ${lowRisk}\n`);

  // Sample documents with risk scores
  const sampleDocs = await prisma.document.findMany({
    where: {
      tenantId: tenant.id,
      isDeleted: false,
    },
    take: 5,
    include: {
      riskScore: true,
      clientCompany: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log("📋 Sample Documents:");
  sampleDocs.forEach((doc, i) => {
    console.log(`\n   ${i + 1}. ${doc.originalFileName}`);
    console.log(`      Type: ${doc.type}`);
    console.log(`      Status: ${doc.status}`);
    console.log(`      Client: ${doc.clientCompany.name}`);
    if (doc.riskScore) {
      console.log(`      Risk: ${doc.riskScore.severity} (${doc.riskScore.score})`);
    } else {
      console.log(`      Risk: No risk score`);
    }
  });

  console.log("\n✅ Verification complete!");
}

verifyDocuments()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

