/**
 * Demo Seed Script
 * 
 * Creates comprehensive demo data for staging/demo environments.
 * 
 * Safety checks:
 * - Only runs if NODE_ENV is not "production"
 * - Checks that DATABASE_URL doesn't contain "production"
 * 
 * Usage:
 *   pnpm seed:demo
 *   DRY_RUN=true pnpm seed:demo  # Dry run mode (doesn't commit changes)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { hashPassword } from "@repo/shared-utils";
import { TENANT_ROLES } from "@repo/core-domain";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "true";

// Safety checks
function checkSafety(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("❌ Cannot run seed-demo in production environment");
  }

  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.toLowerCase().includes("production")) {
    throw new Error("❌ DATABASE_URL appears to point to production database");
  }

  console.log("✅ Safety checks passed");
  if (DRY_RUN) {
    console.log("⚠️  DRY RUN MODE - No changes will be committed");
  }
}

// Turkish names for demo data
const DEMO_TENANTS = [
  {
    name: "Örnek Muhasebe Ofisi 1",
    slug: "ornek_ofis_1",
    taxNumber: "1234567890",
    phone: "+90 212 555 0101",
    email: "info@ornekofis1.com",
    address: "İstiklal Caddesi No:123, Beyoğlu, İstanbul",
  },
  {
    name: "Örnek Muhasebe Ofisi 2",
    slug: "ornek_ofis_2",
    taxNumber: "0987654321",
    phone: "+90 312 555 0202",
    email: "info@ornekofis2.com",
    address: "Kızılay Mahallesi, Çankaya, Ankara",
  },
];

const DEMO_USERS = [
  // Office 1 users
  {
    email: "yonetici@ornekofis1.com",
    fullName: "Ahmet Yılmaz",
    role: TENANT_ROLES.TENANT_OWNER,
    password: "Demo123!",
  },
  {
    email: "muhasebeci@ornekofis1.com",
    fullName: "Ayşe Demir",
    role: TENANT_ROLES.ACCOUNTANT,
    password: "Demo123!",
  },
  {
    email: "personel@ornekofis1.com",
    fullName: "Mehmet Kaya",
    role: TENANT_ROLES.STAFF,
    password: "Demo123!",
  },
  // Office 2 users
  {
    email: "yonetici@ornekofis2.com",
    fullName: "Fatma Şahin",
    role: TENANT_ROLES.TENANT_OWNER,
    password: "Demo123!",
  },
  {
    email: "muhasebeci@ornekofis2.com",
    fullName: "Ali Öztürk",
    role: TENANT_ROLES.ACCOUNTANT,
    password: "Demo123!",
  },
];

const DEMO_COMPANIES = [
  // Office 1 companies
  { name: "ABC Teknoloji A.Ş.", taxNumber: "1111111111", legalType: "AS" },
  { name: "XYZ İnşaat Ltd.", taxNumber: "2222222222", legalType: "LTD" },
  { name: "DEF Ticaret A.Ş.", taxNumber: "3333333333", legalType: "AS" },
  { name: "GHI Gıda San. Tic. Ltd.", taxNumber: "4444444444", legalType: "LTD" },
  { name: "JKL Lojistik A.Ş.", taxNumber: "5555555555", legalType: "AS" },
  // Office 2 companies
  { name: "MNO Eğitim Hiz. A.Ş.", taxNumber: "6666666666", legalType: "AS" },
  { name: "PQR Danışmanlık Ltd.", taxNumber: "7777777777", legalType: "LTD" },
  { name: "STU Sağlık Hiz. A.Ş.", taxNumber: "8888888888", legalType: "AS" },
];

async function createTenant(tenantData: typeof DEMO_TENANTS[0]) {
  console.log(`  Creating tenant: ${tenantData.name}...`);
  
  const existing = await prisma.tenant.findUnique({
    where: { slug: tenantData.slug },
  });

  if (existing) {
    console.log(`  ⚠️  Tenant ${tenantData.slug} already exists, skipping...`);
    return existing;
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create tenant: ${tenantData.name}`);
    return { id: "dry-run-tenant-id", ...tenantData } as any;
  }

  return await prisma.tenant.create({
    data: {
      name: tenantData.name,
      slug: tenantData.slug,
      taxNumber: tenantData.taxNumber,
      phone: tenantData.phone,
      email: tenantData.email,
      address: tenantData.address,
      settings: {},
    },
  });
}

async function createUser(userData: typeof DEMO_USERS[0], tenantId: string) {
  console.log(`    Creating user: ${userData.fullName}...`);

  const existing = await prisma.user.findUnique({
    where: { email: userData.email },
  });

  if (existing) {
    // Check if membership exists
    const membership = await prisma.userTenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: existing.id,
          tenantId,
        },
      },
    });

    if (membership) {
      console.log(`    ⚠️  User ${userData.email} already has membership, skipping...`);
      return { user: existing, membership };
    }
  }

  if (DRY_RUN) {
    console.log(`    [DRY RUN] Would create user: ${userData.email}`);
    return { user: { id: "dry-run-user-id", email: userData.email }, membership: null };
  }

  const hashedPassword = await hashPassword(userData.password);

  return await prisma.$transaction(async (tx) => {
    const user = existing || await tx.user.create({
      data: {
        email: userData.email,
        hashedPassword,
        fullName: userData.fullName,
        locale: "tr-TR",
        isActive: true,
      },
    });

    const membership = await tx.userTenantMembership.create({
      data: {
        userId: user.id,
        tenantId,
        role: userData.role,
        status: "active",
      },
    });

    return { user, membership };
  });
}

async function createClientCompany(
  companyData: typeof DEMO_COMPANIES[0],
  tenantId: string
) {
  console.log(`    Creating company: ${companyData.name}...`);

  if (DRY_RUN) {
    console.log(`    [DRY RUN] Would create company: ${companyData.name}`);
    return { id: "dry-run-company-id" };
  }

  return await prisma.clientCompany.create({
    data: {
      tenantId,
      name: companyData.name,
      taxNumber: companyData.taxNumber,
      legalType: companyData.legalType,
      isActive: true,
    },
  });
}

async function createDemoData() {
  console.log("🌱 Starting demo seed...\n");

  checkSafety();

  const createdTenants: Array<{ id: string; slug: string; name: string }> = [];
  const createdUsers: Array<{ email: string; password: string; tenantSlug: string }> = [];

  for (let i = 0; i < DEMO_TENANTS.length; i++) {
    const tenantData = DEMO_TENANTS[i];
    console.log(`\n📁 Processing tenant ${i + 1}/${DEMO_TENANTS.length}: ${tenantData.name}`);

    const tenant = await createTenant(tenantData);
    createdTenants.push({ id: tenant.id, slug: tenant.slug, name: tenant.name });

    // Create users for this tenant
    const tenantUsers = DEMO_USERS.filter((_, idx) => {
      if (i === 0) return idx < 3; // First 3 users for first tenant
      return idx >= 3; // Last 2 users for second tenant
    });

    for (const userData of tenantUsers) {
      const { user } = await createUser(userData, tenant.id);
      createdUsers.push({
        email: user.email,
        password: userData.password,
        tenantSlug: tenant.slug,
      });
    }

    // Create client companies for this tenant
    const tenantCompanies = DEMO_COMPANIES.filter((_, idx) => {
      if (i === 0) return idx < 5; // First 5 companies for first tenant
      return idx >= 5; // Last 3 companies for second tenant
    });

    for (const companyData of tenantCompanies) {
      const company = await createClientCompany(companyData, tenant.id);

      // Create some invoices for this company
      if (!DRY_RUN) {
        await createSampleInvoices(tenant.id, company.id);
        await createSampleTransactions(tenant.id, company.id);
        await createSampleDocuments(tenant.id, company.id);
        await createRiskData(tenant.id, company.id);
      }
    }

    // Create tenant settings
    if (!DRY_RUN) {
      await createTenantSettings(tenant.id);
    }

    // Create notifications
    if (!DRY_RUN) {
      await createSampleNotifications(tenant.id);
    }

    // Create scheduled reports
    if (!DRY_RUN) {
      await createScheduledReports(tenant.id);
    }
  }

  // Print summary
  console.log("\n✅ Demo seed completed!\n");
  console.log("📋 Created Resources:");
  console.log(`   Tenants: ${createdTenants.length}`);
  console.log(`   Users: ${createdUsers.length}`);
  console.log(`   Client Companies: ${DEMO_COMPANIES.length}\n`);

  console.log("🔐 Login Credentials:\n");
  createdUsers.forEach((user) => {
    console.log(`   Tenant: ${user.tenantSlug}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${user.password}\n`);
  });

  if (DRY_RUN) {
    console.log("⚠️  This was a DRY RUN - no data was actually created");
  }
}

async function createSampleInvoices(tenantId: string, companyId: string) {
  const invoices = [];
  for (let i = 0; i < 5; i++) {
    invoices.push({
      tenantId,
      clientCompanyId: companyId,
      invoiceNumber: `FAT-2024-${String(i + 1).padStart(4, "0")}`,
      issueDate: new Date(2024, 0, i + 1),
      dueDate: new Date(2024, 1, i + 1),
      totalAmount: new Decimal(1000 + i * 500),
      taxAmount: new Decimal((1000 + i * 500) * 0.2),
      status: i % 3 === 0 ? "PAID" : i % 3 === 1 ? "PENDING" : "OVERDUE",
    });
  }
  await prisma.invoice.createMany({ data: invoices });
}

async function createSampleTransactions(tenantId: string, companyId: string) {
  // Get or create ledger accounts
  const accounts = await Promise.all([
    prisma.ledgerAccount.upsert({
      where: { tenantId_code: { tenantId, code: "100" } },
      update: {},
      create: {
        tenantId,
        code: "100",
        name: "Kasa",
        type: "asset",
        isActive: true,
      },
    }),
    prisma.ledgerAccount.upsert({
      where: { tenantId_code: { tenantId, code: "600" } },
      update: {},
      create: {
        tenantId,
        code: "600",
        name: "Yurtiçi Satışlar",
        type: "income",
        isActive: true,
      },
    }),
  ]);

  const transactions = [];
  for (let i = 0; i < 3; i++) {
    transactions.push({
      tenantId,
      clientCompanyId: companyId,
      date: new Date(2024, 0, i + 1),
      description: `İşlem ${i + 1}`,
      amount: new Decimal(500 + i * 200),
      type: i % 2 === 0 ? "INCOME" : "EXPENSE",
    });
  }
  const created = await prisma.transaction.createMany({ data: transactions });
  
  // Create transaction lines
  const transList = await prisma.transaction.findMany({
    where: { tenantId, clientCompanyId: companyId },
    take: 3,
  });
  
  for (const trans of transList) {
    await prisma.transactionLine.createMany({
      data: [
        {
          tenantId,
          transactionId: trans.id,
          ledgerAccountId: accounts[0].id,
          amount: trans.amount,
          type: trans.type === "INCOME" ? "CREDIT" : "DEBIT",
        },
        {
          tenantId,
          transactionId: trans.id,
          ledgerAccountId: accounts[1].id,
          amount: trans.amount,
          type: trans.type === "INCOME" ? "DEBIT" : "CREDIT",
        },
      ],
    });
  }
}

async function createSampleDocuments(tenantId: string, companyId: string) {
  const documents = [];
  for (let i = 0; i < 3; i++) {
    documents.push({
      tenantId,
      clientCompanyId: companyId,
      fileName: `belge-${i + 1}.pdf`,
      fileType: "application/pdf",
      fileSize: 1024 * 100 * (i + 1),
      documentType: i === 0 ? "INVOICE" : i === 1 ? "BANK_STATEMENT" : "RECEIPT",
      status: i === 0 ? "PROCESSED" : i === 1 ? "PROCESSING" : "UPLOADED",
    });
  }
  const created = await prisma.document.createMany({ data: documents });

  // Create AI analysis stubs for processed documents
  const docList = await prisma.document.findMany({
    where: { tenantId, clientCompanyId: companyId, status: "PROCESSED" },
    take: 1,
  });

  for (const doc of docList) {
    await prisma.documentOCRResult.create({
      data: {
        tenantId,
        documentId: doc.id,
        confidence: 0.95,
        rawText: "Örnek OCR metni",
        extractedData: { amount: 1000, date: "2024-01-01" },
      },
    });
  }
}

async function createRiskData(tenantId: string, companyId: string) {
  // Create risk score
  await prisma.clientCompanyRiskScore.create({
    data: {
      tenantId,
      clientCompanyId: companyId,
      overallScore: new Decimal(65.5),
      financialScore: new Decimal(70.0),
      complianceScore: new Decimal(60.0),
      behavioralScore: new Decimal(66.0),
      calculatedAt: new Date(),
    },
  });

  // Create risk alert
  await prisma.riskAlert.create({
    data: {
      tenantId,
      clientCompanyId: companyId,
      severity: "MEDIUM",
      status: "open",
      title: "Yüksek Risk Skoru Tespit Edildi",
      message: "Bu müşteri için orta seviye risk skoru hesaplandı.",
      metadata: { score: 65.5 },
    },
  });
}

async function createTenantSettings(tenantId: string) {
  await prisma.tenantSettings.upsert({
    where: { tenantId },
    update: {},
    create: {
      tenantId,
      locale: "tr-TR",
      timezone: "Europe/Istanbul",
      dateFormat: "DD.MM.YYYY",
      currency: "TRY",
      fiscalYearStart: "01-01",
    },
  });
}

async function createSampleNotifications(tenantId: string) {
  const users = await prisma.userTenantMembership.findMany({
    where: { tenantId },
    take: 1,
  });

  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: [
      {
        tenantId,
        userId: users[0].userId,
        type: "RISK_ALERT",
        title: "Risk Uyarısı",
        message: "Yeni bir risk uyarısı oluşturuldu.",
        is_read: false,
      },
      {
        tenantId,
        userId: users[0].userId,
        type: "SCHEDULED_REPORT",
        title: "Rapor Hazır",
        message: "Zamanlanmış raporunuz hazır.",
        is_read: true,
      },
    ],
  });
}

async function createScheduledReports(tenantId: string) {
  await prisma.scheduledReport.create({
    data: {
      tenantId,
      reportCode: "MONTHLY_SUMMARY",
      name: "Aylık Özet Raporu",
      schedule: "0 0 1 * *", // First day of month
      isActive: true,
      recipients: ["info@example.com"],
    },
  });
}

// Run seed
createDemoData()
  .catch((e) => {
    console.error("❌ Error seeding demo data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


