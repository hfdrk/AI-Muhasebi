/**
 * Quick Seed - Creates tenant, user, and high-risk documents
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Use bcrypt to match auth service
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function quickSeed() {
  console.log("🌱 Quick seeding database...\n");

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-ofis" },
    update: {},
    create: {
      name: "Demo Ofis",
      slug: "demo-ofis",
      status: "ACTIVE",
    },
  });

  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})\n`);

  // Create user
  const hashedPassword = await hashPassword("demo123");
  const user = await prisma.user.upsert({
    where: { email: "demo@demo.local" },
    update: {},
    create: {
      email: "demo@demo.local",
      hashedPassword,
      fullName: "Demo Kullanıcı",
      isActive: true,
    },
  });

  console.log(`✅ User: ${user.email}\n`);

  // Create membership
  await prisma.userTenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: "TenantOwner",
    },
  });

  console.log(`✅ Membership created\n`);

  // Create client company
  const client = await prisma.clientCompany.upsert({
    where: {
      tenantId_taxNumber: {
        tenantId: tenant.id,
        taxNumber: "1234567890",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Demo Müşteri A.Ş.",
      taxNumber: "1234567890",
      legalType: "LIMITED_COMPANY",
      isActive: true,
    },
  });

  console.log(`✅ Client: ${client.name}\n`);

  // Create high-risk documents
  console.log("📄 Creating high-risk documents...\n");
  const today = new Date();
  
  const documents = await Promise.all(
    Array.from({ length: 30 }, (_, i) =>
      prisma.document.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: client.id,
          type: i % 4 === 0 ? "INVOICE" : i % 4 === 1 ? "BANK_STATEMENT" : i % 4 === 2 ? "RECEIPT" : "OTHER",
          originalFileName: `HIGH_RISK_DOC_${String(i + 1).padStart(3, "0")}.pdf`,
          storagePath: `documents/${tenant.id}/high_risk_${String(i + 1).padStart(3, "0")}.pdf`,
          mimeType: "application/pdf",
          fileSizeBytes: BigInt((200 + i * 30) * 1024),
          uploadUserId: user.id,
          uploadSource: "manual",
          status: "PROCESSED",
          processedAt: new Date(today.getTime() - i * 12 * 60 * 60 * 1000),
        },
      })
    )
  );

  console.log(`✅ Created ${documents.length} documents\n`);

  // Create risk scores
  console.log("⚠️  Creating high-risk scores...\n");
  const riskScores = await Promise.all(
    documents.map((doc, i) =>
      prisma.documentRiskScore.create({
        data: {
          tenantId: tenant.id,
          documentId: doc.id,
          score: 70 + (i * 1.5), // 70 to 100+
          severity: "high",
          triggeredRuleCodes: [
            i % 3 === 0 ? "DOC_PARSING_FAILED" : null,
            i % 3 === 1 ? "INV_MISSING_TAX_NUMBER" : null,
            i % 3 === 2 ? "INV_AMOUNT_MISMATCH" : null,
          ].filter(Boolean) as string[],
          generatedAt: new Date(today.getTime() - i * 12 * 60 * 60 * 1000),
        },
      })
    )
  );

  console.log(`✅ Created ${riskScores.length} high-risk scores\n`);

  console.log("📊 Summary:");
  console.log(`   Tenant: ${tenant.name}`);
  console.log(`   User: ${user.email} (password: demo123)`);
  console.log(`   High-Risk Documents: ${riskScores.length}`);
  console.log("\n✅ Quick seed completed!");
  console.log("\n💡 Login credentials:");
  console.log(`   Email: ${user.email}`);
  console.log(`   Password: demo123`);
}

quickSeed()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

