#!/usr/bin/env tsx
/**
 * Script to check if document risk scores are calculated for a client company
 * 
 * Usage:
 *   tsx scripts/check-document-risk-scores.ts <clientCompanyId> [tenantId]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDocumentRiskScores(clientCompanyId: string, tenantId?: string) {
  console.log(`\n🔍 Checking document risk scores for company: ${clientCompanyId}\n`);

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

  // Get company risk score
  const companyRiskScore = await prisma.clientCompanyRiskScore.findFirst({
    where: {
      clientCompanyId: company.id,
      tenantId: company.tenantId,
    },
    orderBy: { generatedAt: "desc" },
  });

  if (companyRiskScore) {
    console.log(`✅ Company Risk Score: ${companyRiskScore.score} (${companyRiskScore.severity})`);
    console.log(`   Generated: ${companyRiskScore.generatedAt.toISOString()}\n`);
  } else {
    console.log(`⚠️  No company risk score found\n`);
  }

  // Get all documents
  const allDocuments = await prisma.document.findMany({
    where: {
      tenantId: company.tenantId,
      clientCompanyId: company.id,
      isDeleted: false,
    },
    select: {
      id: true,
      originalFileName: true,
      type: true,
      createdAt: true,
    },
  });

  console.log(`📄 Total Documents: ${allDocuments.length}\n`);

  if (allDocuments.length === 0) {
    console.log(`ℹ️  No documents found for this company`);
    await prisma.$disconnect();
    return;
  }

  // Get document risk scores
  const documentScores = await prisma.documentRiskScore.findMany({
    where: {
      tenantId: company.tenantId,
      document: {
        clientCompanyId: company.id,
        isDeleted: false,
      },
    },
    select: {
      id: true,
      documentId: true,
      score: true,
      severity: true,
      generatedAt: true,
    },
  });

  console.log(`📊 Documents with Risk Scores: ${documentScores.length} / ${allDocuments.length}\n`);

  // Count by severity
  let lowCount = 0;
  let mediumCount = 0;
  let highCount = 0;

  documentScores.forEach((score) => {
    const scoreValue = Number(score.score);
    if (scoreValue <= 30) {
      lowCount++;
    } else if (scoreValue <= 65) {
      mediumCount++;
    } else {
      highCount++;
    }
  });

  console.log(`📈 Risk Breakdown:`);
  console.log(`   Low (≤30):    ${lowCount}`);
  console.log(`   Medium (31-65): ${mediumCount}`);
  console.log(`   High (>65):   ${highCount}\n`);

  // Show documents without risk scores
  const documentsWithoutScores = allDocuments.filter(
    (doc) => !documentScores.find((score) => score.documentId === doc.id)
  );

  if (documentsWithoutScores.length > 0) {
    console.log(`⚠️  Documents WITHOUT risk scores (${documentsWithoutScores.length}):`);
    documentsWithoutScores.slice(0, 10).forEach((doc) => {
      console.log(`   - ${doc.originalFileName} (${doc.type}) - Created: ${doc.createdAt.toISOString().split('T')[0]}`);
    });
    if (documentsWithoutScores.length > 10) {
      console.log(`   ... and ${documentsWithoutScores.length - 10} more`);
    }
    console.log();
  }

  // Show sample documents with risk scores
  if (documentScores.length > 0) {
    console.log(`✅ Sample documents WITH risk scores:`);
    documentScores.slice(0, 5).forEach((score) => {
      const doc = allDocuments.find((d) => d.id === score.documentId);
      console.log(
        `   - ${doc?.originalFileName || score.documentId}: Score=${score.score}, Severity=${score.severity}, Generated=${score.generatedAt.toISOString().split('T')[0]}`
      );
    });
    if (documentScores.length > 5) {
      console.log(`   ... and ${documentScores.length - 5} more`);
    }
    console.log();
  }

  // Summary
  console.log(`\n📋 Summary:`);
  console.log(`   Total Documents: ${allDocuments.length}`);
  console.log(`   With Risk Scores: ${documentScores.length} (${((documentScores.length / allDocuments.length) * 100).toFixed(1)}%)`);
  console.log(`   Without Risk Scores: ${documentsWithoutScores.length} (${((documentsWithoutScores.length / allDocuments.length) * 100).toFixed(1)}%)`);
  
  if (companyRiskScore && documentsWithoutScores.length > 0) {
    console.log(`\n⚠️  WARNING: Company has risk score but ${documentsWithoutScores.length} documents don't have individual risk scores!`);
    console.log(`   This explains why the breakdown shows 0 for all categories.`);
    console.log(`   You need to trigger risk score calculation for these documents.`);
  }

  await prisma.$disconnect();
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: tsx scripts/check-document-risk-scores.ts <clientCompanyId> [tenantId]");
  process.exit(1);
}

const clientCompanyId = args[0];
const tenantId = args[1];

checkDocumentRiskScores(clientCompanyId, tenantId).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

