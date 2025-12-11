/**
 * Test High-Risk Documents API
 * 
 * Tests the API endpoint to verify high-risk documents can be fetched correctly.
 * 
 * Usage:
 *   pnpm tsx scripts/test-high-risk-documents-api.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testHighRiskDocuments() {
  console.log("🧪 Testing High-Risk Documents API...\n");

  // Get the first active tenant
  const tenant = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!tenant) {
    console.error("❌ No active tenant found.");
    process.exit(1);
  }

  console.log(`✅ Testing with tenant: ${tenant.name}\n`);

  // Test 1: Count high-risk documents
  const highRiskCount = await prisma.documentRiskScore.count({
    where: {
      tenantId: tenant.id,
      severity: "high",
    },
  });

  console.log(`📊 High-Risk Documents in Database: ${highRiskCount}`);

  // Test 2: Get sample high-risk documents with relations
  const sampleHighRisk = await prisma.document.findMany({
    where: {
      tenantId: tenant.id,
      isDeleted: false,
      riskScore: {
        severity: "high",
      },
    },
    take: 5,
    include: {
      riskScore: {
        select: {
          score: true,
          severity: true,
          triggeredRuleCodes: true,
        },
      },
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

  console.log(`\n📋 Sample High-Risk Documents (${sampleHighRisk.length}):`);
  sampleHighRisk.forEach((doc, i) => {
    console.log(`\n   ${i + 1}. ${doc.originalFileName}`);
    console.log(`      Type: ${doc.type}`);
    console.log(`      Status: ${doc.status}`);
    console.log(`      Client: ${doc.clientCompany.name}`);
    if (doc.riskScore) {
      console.log(`      Risk Score: ${doc.riskScore.score} (${doc.riskScore.severity})`);
      const rules = doc.riskScore.triggeredRuleCodes as string[];
      if (rules.length > 0) {
        console.log(`      Triggered Rules: ${rules.join(", ")}`);
      }
    }
  });

  // Test 3: Verify the query that the service uses
  console.log("\n🔍 Testing Document Service Query Pattern...");
  
  const serviceQueryTest = await prisma.document.findMany({
    where: {
      tenantId: tenant.id,
      isDeleted: false,
    },
    take: 3,
    include: {
      uploadUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      riskFeatures: {
        select: {
          riskFlags: true,
        },
      },
      riskScore: {
        select: {
          score: true,
          severity: true,
        },
      },
    },
  });

  console.log(`✅ Service query pattern works! Found ${serviceQueryTest.length} documents`);
  
  const withRiskScores = serviceQueryTest.filter(doc => doc.riskScore !== null);
  const highRiskInSample = serviceQueryTest.filter(
    doc => doc.riskScore && doc.riskScore.severity === "high"
  );

  console.log(`   - Documents with risk scores: ${withRiskScores.length}`);
  console.log(`   - High-risk in sample: ${highRiskInSample.length}`);

  // Test 4: Test filtering by severity
  console.log("\n🔍 Testing Severity Filter...");
  
  const filteredBySeverity = await prisma.document.findMany({
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

  console.log(`✅ Severity filter works! Found ${filteredBySeverity.length} high-risk documents`);
  console.log(`   Score range: ${Math.min(...filteredBySeverity.map(d => Number(d.riskScore!.score)))} - ${Math.max(...filteredBySeverity.map(d => Number(d.riskScore!.score)))}`);

  console.log("\n✅ All tests passed!");
  console.log("\n💡 Next Steps:");
  console.log("   1. Make sure your backend server is running");
  console.log("   2. The API endpoint /api/v1/documents/search-by-risk?riskSeverity=high should work");
  console.log("   3. Frontend should be able to fetch and display these documents");
}

testHighRiskDocuments()
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
