/**
 * Test High-Risk Documents Query
 * 
 * Tests the exact Prisma query used by the document service
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testHighRiskQuery() {
  console.log("🧪 Testing high-risk documents query...\n");

  const tenant = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!tenant) {
    console.error("❌ No tenant found");
    process.exit(1);
  }

  console.log(`✅ Using tenant: ${tenant.name} (${tenant.id})\n`);

  // Test the exact where clause used in document-service.ts
  const where: any = {
    tenantId: tenant.id,
    isDeleted: false,
    riskScore: {
      severity: "high",
    },
  };

  console.log("📋 Where clause:", JSON.stringify(where, null, 2));
  console.log("");

  // Test 1: Count query
  console.log("1️⃣ Testing count query...");
  const count = await prisma.document.count({ where });
  console.log(`   ✅ Count: ${count}\n`);

  // Test 2: FindMany query (first page)
  console.log("2️⃣ Testing findMany query (first 5)...");
  const documents = await prisma.document.findMany({
    where,
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      riskScore: {
        select: {
          score: true,
          severity: true,
        },
      },
    },
  });

  console.log(`   ✅ Found ${documents.length} documents\n`);
  
  if (documents.length > 0) {
    console.log("   Sample documents:");
    documents.forEach((doc, i) => {
      console.log(`   ${i + 1}. ${doc.originalFileName}`);
      console.log(`      Risk: ${doc.riskScore?.severity} (${doc.riskScore?.score})`);
      console.log(`      Deleted: ${doc.isDeleted}`);
    });
  } else {
    console.log("   ⚠️  No documents found with this query!");
    
    // Debug: Check if documents exist without the riskScore filter
    const allDocs = await prisma.document.count({
      where: {
        tenantId: tenant.id,
        isDeleted: false,
      },
    });
    console.log(`\n   📊 Total non-deleted documents: ${allDocs}`);
    
    // Check documents with risk scores
    const docsWithRiskScores = await prisma.document.count({
      where: {
        tenantId: tenant.id,
        isDeleted: false,
        riskScore: {
          isNot: null,
        },
      },
    });
    console.log(`   📊 Documents with risk scores: ${docsWithRiskScores}`);
    
    // Check high-risk scores directly
    const highRiskScores = await prisma.documentRiskScore.count({
      where: {
        tenantId: tenant.id,
        severity: "high",
      },
    });
    console.log(`   📊 High-risk scores in database: ${highRiskScores}`);
    
    // Check if there's a relation issue
    const sampleHighRiskScore = await prisma.documentRiskScore.findFirst({
      where: {
        tenantId: tenant.id,
        severity: "high",
      },
      include: {
        document: {
          select: {
            id: true,
            isDeleted: true,
            tenantId: true,
          },
        },
      },
    });
    
    if (sampleHighRiskScore) {
      console.log(`\n   🔍 Sample high-risk score:`);
      console.log(`      Document ID: ${sampleHighRiskScore.documentId}`);
      console.log(`      Document exists: ${sampleHighRiskScore.document ? 'Yes' : 'No'}`);
      console.log(`      Document deleted: ${sampleHighRiskScore.document?.isDeleted}`);
      console.log(`      Document tenant: ${sampleHighRiskScore.document?.tenantId}`);
      console.log(`      Score tenant: ${sampleHighRiskScore.tenantId}`);
      console.log(`      Tenants match: ${sampleHighRiskScore.document?.tenantId === sampleHighRiskScore.tenantId}`);
    }
  }

  console.log("\n✅ Test complete!");
}

testHighRiskQuery()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
