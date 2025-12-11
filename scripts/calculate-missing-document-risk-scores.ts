#!/usr/bin/env tsx
/**
 * Script to calculate risk scores for documents that don't have them
 * 
 * Usage:
 *   cd apps/backend-api && pnpm tsx ../../scripts/calculate-missing-document-risk-scores.ts <clientCompanyId> [tenantId]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function calculateMissingRiskScores(clientCompanyId: string, tenantId?: string) {
  console.log(`\n🔧 Calculating missing document risk scores for company: ${clientCompanyId}\n`);

  // Get company info
  const company = await prisma.clientCompany.findFirst({
    where: {
      id: clientCompanyId,
      ...(tenantId ? { tenantId } : {}),
    },
    select: {
      id: true,
      name: true,
      tenantId: true,
    },
  });

  if (!company) {
    console.error(`❌ Company not found: ${clientCompanyId}`);
    process.exit(1);
  }

  console.log(`📊 Company: ${company.name} (${company.id})`);
  console.log(`🏢 Tenant: ${company.tenantId}\n`);

  // Get all documents without risk scores
  const documentsWithoutScores = await prisma.document.findMany({
    where: {
      tenantId: company.tenantId,
      clientCompanyId: company.id,
      isDeleted: false,
      riskScore: null, // Documents without risk scores
    },
    select: {
      id: true,
      originalFileName: true,
      type: true,
    },
  });

  console.log(`📄 Documents without risk scores: ${documentsWithoutScores.length}\n`);

  if (documentsWithoutScores.length === 0) {
    console.log(`✅ All documents already have risk scores!`);
    await prisma.$disconnect();
    return;
  }

  // Check if documents have risk features (required for risk calculation)
  let documentsWithFeatures = 0;
  let documentsWithoutFeatures = 0;

  for (const doc of documentsWithoutScores) {
    const features = await prisma.documentRiskFeatures.findUnique({
      where: { documentId: doc.id },
    });
    if (features) {
      documentsWithFeatures++;
    } else {
      documentsWithoutFeatures++;
    }
  }

  console.log(`📊 Risk Features Status:`);
  console.log(`   With features: ${documentsWithFeatures}`);
  console.log(`   Without features: ${documentsWithoutFeatures}\n`);

  if (documentsWithoutFeatures > 0) {
    console.log(`⚠️  ${documentsWithoutFeatures} documents don't have risk features.`);
    console.log(`   Creating minimal risk features for these documents...\n`);
  }

  // Import services
  const { riskRuleEngine } = await import("../apps/backend-api/src/services/risk-rule-engine");

  let successCount = 0;
  let errorCount = 0;
  let featuresCreatedCount = 0;

  console.log(`🚀 Starting risk score calculation...\n`);

  for (const doc of documentsWithoutScores) {
    try {
      // Check if document has risk features
      let features = await prisma.documentRiskFeatures.findUnique({
        where: { documentId: doc.id },
      });

      // If no features, create minimal/default features
      if (!features) {
        console.log(`📝 Creating minimal risk features for: ${doc.originalFileName}...`);
        
        // Create minimal risk features with empty/default values
        features = await prisma.documentRiskFeatures.create({
          data: {
            tenantId: company.tenantId,
            documentId: doc.id,
            features: {}, // Empty features - will result in low/no risk
            riskFlags: [], // No risk flags
            riskScore: null,
            generatedAt: new Date(),
          },
        });
        featuresCreatedCount++;
        console.log(`   ✅ Created minimal risk features`);
      }

      console.log(`📝 Calculating risk for: ${doc.originalFileName}...`);
      
      // Calculate risk score
      const riskScore = await riskRuleEngine.evaluateDocument(company.tenantId, doc.id);
      
      console.log(`   ✅ Score: ${riskScore.score}, Severity: ${riskScore.severity}`);
      successCount++;
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n📋 Summary:`);
  console.log(`   ✅ Successfully calculated: ${successCount}`);
  console.log(`   📝 Features created: ${featuresCreatedCount}`);
  console.log(`   ❌ Errors: ${errorCount}\n`);

  await prisma.$disconnect();
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: cd apps/backend-api && pnpm tsx ../../scripts/calculate-missing-document-risk-scores.ts <clientCompanyId> [tenantId]");
  process.exit(1);
}

const clientCompanyId = args[0];
const tenantId = args[1];

calculateMissingRiskScores(clientCompanyId, tenantId).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

