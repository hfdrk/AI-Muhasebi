/**
 * Add Comprehensive Data to Existing Tenant
 * 
 * Adds invoices, transactions, client companies, and more documents
 * to the existing demo tenant
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function addComprehensiveData() {
  console.log("🌱 Adding comprehensive data to existing tenant...\n");

  // Get existing tenant
  const tenant = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
    include: {
      memberships: {
        where: { role: "TenantOwner" },
        take: 1,
        include: { user: true },
      },
    },
  });

  if (!tenant) {
    console.error("❌ No active tenant found");
    process.exit(1);
  }

  const user = tenant.memberships[0]?.user;
  if (!user) {
    console.error("❌ No user found");
    process.exit(1);
  }

  console.log(`✅ Using tenant: ${tenant.name} (${tenant.id})`);
  console.log(`✅ Using user: ${user.email}\n`);

  // Create multiple client companies
  console.log("🏢 Creating client companies...");
  const clientCompanies = await Promise.all([
    prisma.clientCompany.upsert({
      where: {
        tenantId_taxNumber: {
          tenantId: tenant.id,
          taxNumber: "1111111111",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "ABC Teknoloji A.Ş.",
        taxNumber: "1111111111",
        legalType: "AS",
        isActive: true,
      },
    }),
    prisma.clientCompany.upsert({
      where: {
        tenantId_taxNumber: {
          tenantId: tenant.id,
          taxNumber: "2222222222",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "XYZ İnşaat Ltd.",
        taxNumber: "2222222222",
        legalType: "LTD",
        isActive: true,
      },
    }),
    prisma.clientCompany.upsert({
      where: {
        tenantId_taxNumber: {
          tenantId: tenant.id,
          taxNumber: "3333333333",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Güvenilir Hizmet A.Ş.",
        taxNumber: "3333333333",
        legalType: "AS",
        isActive: true,
      },
    }),
    prisma.clientCompany.upsert({
      where: {
        tenantId_taxNumber: {
          tenantId: tenant.id,
          taxNumber: "4444444444",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Risky Şirket A.Ş.",
        taxNumber: "4444444444",
        legalType: "AS",
        isActive: true,
      },
    }),
    prisma.clientCompany.upsert({
      where: {
        tenantId_taxNumber: {
          tenantId: tenant.id,
          taxNumber: "5555555555",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Problemli Ticaret Ltd.",
        taxNumber: "5555555555",
        legalType: "LTD",
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${clientCompanies.length} client companies\n`);

  // Create invoices
  console.log("📄 Creating invoices...");
  const today = new Date();
  const invoices = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: clientCompanies[i % clientCompanies.length].id,
          externalId: `INV-2025-${String(i + 1).padStart(3, "0")}`,
          type: "SATIŞ",
          issueDate: new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000),
          dueDate: new Date(today.getTime() + (30 - i * 7) * 24 * 60 * 60 * 1000),
          totalAmount: (1000 + i * 100) * 1.18,
          currency: "TRY",
          taxAmount: (1000 + i * 100) * 0.18,
          netAmount: 1000 + i * 100,
          counterpartyName: clientCompanies[i % clientCompanies.length].name,
          counterpartyTaxNumber: clientCompanies[i % clientCompanies.length].taxNumber,
          status: "kesildi",
        },
      })
    )
  );

  console.log(`✅ Created ${invoices.length} invoices\n`);

  // Create transactions
  console.log("💰 Creating transactions...");
  const transactions = await Promise.all(
    Array.from({ length: 25 }, (_, i) =>
      prisma.transaction.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: clientCompanies[i % clientCompanies.length].id,
          date: new Date(today.getTime() - i * 2 * 24 * 60 * 60 * 1000),
          referenceNo: `REF-${i + 1}`,
          description: `İşlem Açıklaması ${i + 1}`,
          source: i % 3 === 0 ? "integration" : "manual",
        },
      })
    )
  );

  console.log(`✅ Created ${transactions.length} transactions\n`);

  // Add more documents (mix of risk levels)
  console.log("📄 Creating additional documents...");
  const additionalDocs = await Promise.all([
    // More high-risk documents
    ...Array.from({ length: 20 }, (_, i) =>
      prisma.document.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: clientCompanies[i % clientCompanies.length].id,
          type: i % 4 === 0 ? "INVOICE" : i % 4 === 1 ? "BANK_STATEMENT" : i % 4 === 2 ? "RECEIPT" : "OTHER",
          originalFileName: `doc_high_risk_${String(i + 1).padStart(3, "0")}.pdf`,
          storagePath: `documents/${tenant.id}/doc_high_risk_${String(i + 1).padStart(3, "0")}.pdf`,
          mimeType: "application/pdf",
          fileSizeBytes: BigInt((150 + i * 20) * 1024),
          uploadUserId: user.id,
          uploadSource: "manual",
          status: "PROCESSED",
          processedAt: new Date(today.getTime() - i * 6 * 60 * 60 * 1000),
        },
      })
    ),
    // Medium-risk documents
    ...Array.from({ length: 15 }, (_, i) =>
      prisma.document.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: clientCompanies[(i + 1) % clientCompanies.length].id,
          type: i % 3 === 0 ? "INVOICE" : i % 3 === 1 ? "BANK_STATEMENT" : "RECEIPT",
          originalFileName: `doc_medium_risk_${String(i + 1).padStart(3, "0")}.pdf`,
          storagePath: `documents/${tenant.id}/doc_medium_risk_${String(i + 1).padStart(3, "0")}.pdf`,
          mimeType: "application/pdf",
          fileSizeBytes: BigInt((120 + i * 15) * 1024),
          uploadUserId: user.id,
          uploadSource: "manual",
          status: "PROCESSED",
          processedAt: new Date(today.getTime() - (i + 1) * 12 * 60 * 60 * 1000),
        },
      })
    ),
    // Low-risk documents
    ...Array.from({ length: 10 }, (_, i) =>
      prisma.document.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: clientCompanies[(i + 2) % clientCompanies.length].id,
          type: i % 2 === 0 ? "INVOICE" : "RECEIPT",
          originalFileName: `doc_low_risk_${String(i + 1).padStart(3, "0")}.pdf`,
          storagePath: `documents/${tenant.id}/doc_low_risk_${String(i + 1).padStart(3, "0")}.pdf`,
          mimeType: "application/pdf",
          fileSizeBytes: BigInt((100 + i * 10) * 1024),
          uploadUserId: user.id,
          uploadSource: "manual",
          status: "PROCESSED",
          processedAt: new Date(today.getTime() - (i + 2) * 24 * 60 * 60 * 1000),
        },
      })
    ),
  ]);

  console.log(`✅ Created ${additionalDocs.length} additional documents\n`);

  // Create risk scores for all documents
  console.log("⚠️  Creating risk scores...");
  const allDocs = await prisma.document.findMany({
    where: { tenantId: tenant.id },
  });

  const riskScores = await Promise.all(
    allDocs.map(async (doc, i) => {
      // Skip if already has risk score
      const existing = await prisma.documentRiskScore.findUnique({
        where: { documentId: doc.id },
      });
      if (existing) return existing;

      let score: number;
      let severity: "low" | "medium" | "high";

      if (doc.originalFileName.includes("high_risk")) {
        score = 70 + (i % 30) * 1; // 70-100
        severity = "high";
      } else if (doc.originalFileName.includes("medium_risk")) {
        score = 40 + (i % 30) * 1; // 40-69
        severity = "medium";
      } else if (doc.originalFileName.includes("low_risk")) {
        score = 10 + (i % 30) * 1; // 10-39
        severity = "low";
      } else {
        // Default: mix based on index
        if (i % 3 === 0) {
          score = 75 + (i % 25);
          severity = "high";
        } else if (i % 3 === 1) {
          score = 50 + (i % 20);
          severity = "medium";
        } else {
          score = 20 + (i % 20);
          severity = "low";
        }
      }

      return prisma.documentRiskScore.create({
        data: {
          tenantId: tenant.id,
          documentId: doc.id,
          score: Math.min(100, score),
          severity,
          triggeredRuleCodes: severity === "high" ? ["DOC_PARSING_FAILED"] : [],
          generatedAt: doc.processedAt || new Date(),
        },
      });
    })
  );

  console.log(`✅ Created/updated ${riskScores.length} risk scores\n`);

  // Summary
  const highRisk = riskScores.filter((rs) => rs.severity === "high").length;
  const mediumRisk = riskScores.filter((rs) => rs.severity === "medium").length;
  const lowRisk = riskScores.filter((rs) => rs.severity === "low").length;

  console.log("📊 Summary:");
  console.log(`   Client Companies: ${clientCompanies.length}`);
  console.log(`   Invoices: ${invoices.length}`);
  console.log(`   Transactions: ${transactions.length}`);
  console.log(`   Total Documents: ${allDocs.length}`);
  console.log(`   High Risk: ${highRisk}`);
  console.log(`   Medium Risk: ${mediumRisk}`);
  console.log(`   Low Risk: ${lowRisk}`);
  console.log("\n✅ Comprehensive data added!");
}

addComprehensiveData()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
