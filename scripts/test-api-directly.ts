/**
 * Test API Directly
 * 
 * Simulates what the frontend does to fetch high-risk documents
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testAPIDirectly() {
  console.log("🧪 Testing API Query Directly...\n");

  const tenant = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!tenant) {
    console.error("❌ No tenant found");
    process.exit(1);
  }

  console.log(`✅ Using tenant: ${tenant.name}\n`);

  // Test 1: Count high-risk documents (what dashboard uses)
  const dashboardCount = await prisma.documentRiskScore.count({
    where: {
      tenantId: tenant.id,
      severity: "high",
    },
  });
  console.log(`📊 Dashboard Count Method: ${dashboardCount} high-risk documents\n`);

  // Test 2: Query documents with risk severity filter (what documents page uses)
  const documentsWithFilter = await prisma.document.findMany({
    where: {
      tenantId: tenant.id,
      isDeleted: false,
      riskScore: {
        severity: "high",
      },
    },
    take: 10,
    include: {
      riskScore: {
        select: {
          score: true,
          severity: true,
        },
      },
    },
  });

  console.log(`📄 Documents Query with Filter: Found ${documentsWithFilter.length} documents`);
  documentsWithFilter.forEach((doc, i) => {
    console.log(`   ${i + 1}. ${doc.originalFileName} - Risk: ${doc.riskScore?.severity} (${doc.riskScore?.score})`);
  });

  // Test 3: Count all documents
  const totalDocs = await prisma.document.count({
    where: {
      tenantId: tenant.id,
      isDeleted: false,
    },
  });
  console.log(`\n📦 Total Documents: ${totalDocs}`);

  // Test 4: Count documents with risk scores
  const docsWithRiskScores = await prisma.document.count({
    where: {
      tenantId: tenant.id,
      isDeleted: false,
      riskScore: {
        isNot: null,
      },
    },
  });
  console.log(`📦 Documents with Risk Scores: ${docsWithRiskScores}`);

  // Test 5: Count high-risk documents using document query
  const highRiskDocsCount = await prisma.document.count({
    where: {
      tenantId: tenant.id,
      isDeleted: false,
      riskScore: {
        severity: "high",
      },
    },
  });
  console.log(`📦 High-Risk Documents (via Document query): ${highRiskDocsCount}\n`);

  // Test 6: Check if there's a mismatch
  if (dashboardCount !== highRiskDocsCount) {
    console.log(`⚠️  MISMATCH DETECTED!`);
    console.log(`   Dashboard count (DocumentRiskScore): ${dashboardCount}`);
    console.log(`   Documents query count: ${highRiskDocsCount}`);
    console.log(`\n   This suggests some risk scores exist without corresponding documents,`);
    console.log(`   or some documents are deleted but risk scores remain.\n`);
  } else {
    console.log(`✅ Counts match! Both methods return ${dashboardCount} high-risk documents.\n`);
  }

  // Test 7: Check for orphaned risk scores
  const allRiskScores = await prisma.documentRiskScore.findMany({
    where: {
      tenantId: tenant.id,
      severity: "high",
    },
    take: 5,
    include: {
      document: {
        select: {
          id: true,
          isDeleted: true,
        },
      },
    },
  });

  console.log(`🔍 Checking Risk Score Relations:`);
  const orphaned = allRiskScores.filter(rs => !rs.document || rs.document.isDeleted);
  if (orphaned.length > 0) {
    console.log(`   ⚠️  Found ${orphaned.length} orphaned risk scores (document missing or deleted)`);
  } else {
    console.log(`   ✅ All risk scores have valid document relations`);
  }

  console.log("\n✅ Test complete!");
}

testAPIDirectly()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


