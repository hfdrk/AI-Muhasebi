/**
 * Demo Tenant Seed Script
 * 
 * Creates a single demo tenant with comprehensive sample data for demo purposes.
 * 
 * Safety checks:
 * - Only runs if NODE_ENV is not "production"
 * - Checks that DATABASE_URL doesn't contain "production"
 * 
 * Usage:
 *   pnpm seed:demo-tenant
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { hashPassword } from "@repo/shared-utils";
import { TENANT_ROLES } from "@repo/core-domain";

const prisma = new PrismaClient();

// Safety checks
function checkSafety(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("❌ Cannot run seed-demo-tenant in production environment");
  }

  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.toLowerCase().includes("production")) {
    throw new Error("❌ DATABASE_URL appears to point to production database");
  }

  console.log("✅ Safety checks passed");
}

async function createDemoTenant() {
  console.log("🌱 Starting demo tenant seed...\n");

  checkSafety();

  // Check if demo tenant already exists
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: "demo-ofis" },
  });

  if (existingTenant) {
    console.log("⚠️  Demo tenant already exists. Skipping creation.");
    console.log(`   Tenant ID: ${existingTenant.id}`);
    return;
  }

  // Create demo tenant
  console.log("📁 Creating demo tenant...");
  const tenant = await prisma.tenant.create({
    data: {
      name: "Demo Muhasebe Ofisi",
      slug: "demo-ofis",
      taxNumber: "9999999999",
      phone: "+90 212 555 9999",
      email: "demo@demo.local",
      address: "Demo Adres, İstanbul",
      settings: {},
    },
  });
  console.log(`   ✅ Created tenant: ${tenant.name} (${tenant.slug})`);

  // Create demo user
  console.log("\n👤 Creating demo user...");
  const hashedPassword = await hashPassword("demo123");
  const user = await prisma.user.create({
    data: {
      email: "demo@demo.local",
      hashedPassword,
      fullName: "Demo Kullanıcı",
      locale: "tr-TR",
      isActive: true,
    },
  });

  const membership = await prisma.userTenantMembership.create({
    data: {
      userId: user.id,
      tenantId: tenant.id,
      role: TENANT_ROLES.TENANT_OWNER,
      status: "active",
    },
  });
  console.log(`   ✅ Created user: ${user.email} (${user.fullName})`);
  console.log(`   ✅ Created membership with role: ${membership.role}`);

  // Create 2-3 client companies
  console.log("\n🏢 Creating client companies...");
  const companies = [
    { name: "Demo Teknoloji A.Ş.", taxNumber: "1111111111", legalType: "AS" },
    { name: "Demo İnşaat Ltd.", taxNumber: "2222222222", legalType: "LTD" },
    { name: "Demo Ticaret A.Ş.", taxNumber: "3333333333", legalType: "AS" },
  ];

  const createdCompanies = [];
  for (const companyData of companies) {
    const company = await prisma.clientCompany.create({
      data: {
        tenantId: tenant.id,
        name: companyData.name,
        taxNumber: companyData.taxNumber,
        legalType: companyData.legalType,
        isActive: true,
      },
    });
    createdCompanies.push(company);
    console.log(`   ✅ Created company: ${company.name}`);
  }

  // Create multiple invoices with different statuses
  console.log("\n📄 Creating invoices...");
  const invoiceStatuses = ["taslak", "kesildi", "iptal"];
  let invoiceCount = 0;
  for (const company of createdCompanies) {
    for (let i = 0; i < 3; i++) {
      const status = invoiceStatuses[i % invoiceStatuses.length];
      await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: company.id,
          invoiceNumber: `FAT-2024-${String(invoiceCount + 1).padStart(4, "0")}`,
          type: i % 2 === 0 ? "SATIŞ" : "ALIŞ",
          issueDate: new Date(2024, 0, invoiceCount + 1),
          dueDate: new Date(2024, 1, invoiceCount + 1),
          totalAmount: new Decimal(1000 + invoiceCount * 500),
          taxAmount: new Decimal((1000 + invoiceCount * 500) * 0.2),
          status,
        },
      });
      invoiceCount++;
    }
  }
  console.log(`   ✅ Created ${invoiceCount} invoices`);

  // Create documents with UPLOADED status
  console.log("\n📎 Creating documents...");
  let documentCount = 0;
  for (const company of createdCompanies) {
    for (let i = 0; i < 2; i++) {
      await prisma.document.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: company.id,
          fileName: `belge-${documentCount + 1}.pdf`,
          originalFileName: `belge-${documentCount + 1}.pdf`,
          fileType: "application/pdf",
          fileSize: 1024 * 100 * (documentCount + 1),
          documentType: i === 0 ? "INVOICE" : "BANK_STATEMENT",
          status: "UPLOADED",
          isDeleted: false,
        },
      });
      documentCount++;
    }
  }
  console.log(`   ✅ Created ${documentCount} documents with UPLOADED status`);

  // Create AI analysis stubs for some documents
  console.log("\n🤖 Creating AI analysis stubs...");
  const documents = await prisma.document.findMany({
    where: { tenantId: tenant.id },
    take: 2,
  });
  for (const doc of documents) {
    await prisma.documentOCRResult.create({
      data: {
        tenantId: tenant.id,
        documentId: doc.id,
        confidence: 0.95,
        rawText: "Örnek OCR metni - Demo belge analizi",
        extractedData: { amount: 1000, date: "2024-01-01" },
        engine: "stub",
      },
    });
  }
  console.log(`   ✅ Created AI analysis for ${documents.length} documents`);

  // Create risk scores and alerts (one "Yüksek" or "Kritik")
  console.log("\n⚠️  Creating risk data...");
  for (const company of createdCompanies) {
    // Create risk score
    await prisma.clientCompanyRiskScore.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: company.id,
        overallScore: new Decimal(company === createdCompanies[0] ? 85.5 : 65.5),
        financialScore: new Decimal(70.0),
        complianceScore: new Decimal(60.0),
        behavioralScore: new Decimal(66.0),
        severity: company === createdCompanies[0] ? "high" : "medium",
        calculatedAt: new Date(),
        generatedAt: new Date(),
      },
    });

    // Create risk alert (first company gets high severity)
    await prisma.riskAlert.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: company.id,
        severity: company === createdCompanies[0] ? "high" : "medium",
        status: "open",
        title: company === createdCompanies[0] 
          ? "Yüksek Risk Skoru Tespit Edildi" 
          : "Orta Seviye Risk Tespit Edildi",
        message: company === createdCompanies[0]
          ? "Bu müşteri için yüksek seviye risk skoru hesaplandı."
          : "Bu müşteri için orta seviye risk skoru hesaplandı.",
        metadata: { score: company === createdCompanies[0] ? 85.5 : 65.5 },
      },
    });
  }
  console.log(`   ✅ Created risk scores and alerts for ${createdCompanies.length} companies`);

  // Create notifications
  console.log("\n🔔 Creating notifications...");
  await prisma.notification.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: user.id,
        type: "RISK_ALERT",
        title: "Yeni Risk Uyarısı",
        message: "Yüksek seviye risk uyarısı oluşturuldu.",
        is_read: false,
        meta: { alertId: "demo-alert-1" },
      },
      {
        tenantId: tenant.id,
        userId: user.id,
        type: "SCHEDULED_REPORT",
        title: "Rapor Hazır",
        message: "Zamanlanmış raporunuz hazır.",
        is_read: false,
        meta: { reportId: "demo-report-1" },
      },
      {
        tenantId: tenant.id,
        userId: user.id,
        type: "INTEGRATION_SYNC",
        title: "Entegrasyon Senkronizasyonu",
        message: "Entegrasyon senkronizasyonu tamamlandı.",
        is_read: true,
        meta: { integrationId: "demo-integration-1" },
      },
    ],
  });
  console.log("   ✅ Created 3 notifications");

  // Create scheduled reports + execution logs
  console.log("\n📊 Creating scheduled reports...");
  const scheduledReport = await prisma.scheduledReport.create({
    data: {
      tenantId: tenant.id,
      reportCode: "MONTHLY_SUMMARY",
      name: "Aylık Özet Raporu",
      schedule: "0 0 1 * *", // First day of month
      isActive: true,
      recipients: ["demo@demo.local"],
    },
  });

  const scheduledReport2 = await prisma.scheduledReport.create({
    data: {
      tenantId: tenant.id,
      reportCode: "RISK_SUMMARY",
      name: "Risk Özet Raporu",
      schedule: "0 0 * * 1", // Every Monday
      isActive: true,
      recipients: ["demo@demo.local"],
    },
  });

  // Create execution logs
  await prisma.reportExecutionLog.create({
    data: {
      tenantId: tenant.id,
      scheduledReportId: scheduledReport.id,
      status: "completed",
      startedAt: new Date(Date.now() - 86400000), // 1 day ago
      completedAt: new Date(Date.now() - 86400000 + 5000),
      result: { success: true, recordCount: 10 },
    },
  });

  await prisma.reportExecutionLog.create({
    data: {
      tenantId: tenant.id,
      scheduledReportId: scheduledReport2.id,
      status: "failed",
      startedAt: new Date(Date.now() - 172800000), // 2 days ago
      completedAt: new Date(Date.now() - 172800000 + 2000),
      error: "Test error message",
    },
  });

  console.log(`   ✅ Created 2 scheduled reports with execution logs`);

  // Create tenant settings
  console.log("\n⚙️  Creating tenant settings...");
  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      locale: "tr-TR",
      timezone: "Europe/Istanbul",
      dateFormat: "DD.MM.YYYY",
      currency: "TRY",
      fiscalYearStart: "01-01",
    },
  });
  console.log("   ✅ Created tenant settings");

  // Print summary
  console.log("\n✅ Demo tenant seed completed!\n");
  console.log("📋 Created Resources:");
  console.log(`   Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`   User: ${user.email}`);
  console.log(`   Client Companies: ${createdCompanies.length}`);
  console.log(`   Invoices: ${invoiceCount}`);
  console.log(`   Documents: ${documentCount}`);
  console.log(`   Risk Scores/Alerts: ${createdCompanies.length}`);
  console.log(`   Notifications: 3`);
  console.log(`   Scheduled Reports: 2\n`);

  console.log("🔐 Login Credentials:");
  console.log(`   Email: ${user.email}`);
  console.log(`   Password: demo123\n`);
}

// Run seed
createDemoTenant()
  .catch((e) => {
    console.error("❌ Error seeding demo tenant:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });





