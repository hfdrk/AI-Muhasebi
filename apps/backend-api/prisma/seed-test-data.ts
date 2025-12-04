import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedTestData() {
  console.log("🌱 Seeding test data for Risk Dashboard...");

  // Get the test tenant
  const tenant = await prisma.tenant.findFirst({
    where: { slug: "test-sirketi" },
  });

  if (!tenant) {
    console.error("❌ Test tenant not found. Please run seed-users.ts first.");
    process.exit(1);
  }

  console.log(`✅ Found tenant: ${tenant.name}`);

  // Create client companies
  const clients = await Promise.all([
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
        legalType: "Anonim",
        taxNumber: "1111111111",
        tradeRegistryNumber: "123456",
        sector: "Teknoloji",
        contactPersonName: "Ahmet Yılmaz",
        contactPhone: "+90 555 111 2233",
        contactEmail: "ahmet@abcteknoloji.com",
        address: "İstanbul, Türkiye",
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
        legalType: "Limited",
        taxNumber: "2222222222",
        tradeRegistryNumber: "789012",
        sector: "İnşaat",
        contactPersonName: "Mehmet Demir",
        contactPhone: "+90 555 444 5566",
        contactEmail: "mehmet@xyzinşaat.com",
        address: "Ankara, Türkiye",
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
        name: "Risky Şirket A.Ş.",
        legalType: "Anonim",
        taxNumber: "3333333333",
        tradeRegistryNumber: "345678",
        sector: "Ticaret",
        contactPersonName: "Ali Risk",
        contactPhone: "+90 555 777 8899",
        contactEmail: "ali@riskysirket.com",
        address: "İzmir, Türkiye",
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${clients.length} client companies`);

  // Create invoices - some with risk issues
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const invoices = await Promise.all([
    // Normal invoice - no risk
    prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[0].id,
        externalId: "INV-2025-001",
        type: "SATIŞ",
        issueDate: today,
        dueDate: tomorrow,
        totalAmount: 1180.0,
        currency: "TRY",
        taxAmount: 180.0,
        netAmount: 1000.0,
        counterpartyName: "ABC Teknoloji A.Ş.",
        counterpartyTaxNumber: "1111111111",
        status: "kesildi",
        lines: {
          create: [
            {
              tenantId: tenant.id,
              lineNumber: 1,
              description: "Yazılım Lisansı",
              quantity: 1,
              unitPrice: 1000.0,
              lineTotal: 1000.0,
              vatRate: 0.18,
              vatAmount: 180.0,
            },
          ],
        },
      },
    }),

    // Invoice with risk: due date before issue date
    prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[1].id,
        externalId: "INV-2025-002",
        type: "SATIŞ",
        issueDate: today,
        dueDate: yesterday, // RISK: Due date before issue date
        totalAmount: 2360.0,
        currency: "TRY",
        taxAmount: 360.0,
        netAmount: 2000.0,
        counterpartyName: "XYZ İnşaat Ltd.",
        counterpartyTaxNumber: "2222222222",
        status: "kesildi",
        lines: {
          create: [
            {
              tenantId: tenant.id,
              lineNumber: 1,
              description: "İnşaat Malzemeleri",
              quantity: 10,
              unitPrice: 200.0,
              lineTotal: 2000.0,
              vatRate: 0.18,
              vatAmount: 360.0,
            },
          ],
        },
      },
    }),

    // Invoice with risk: missing tax number
    prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[2].id,
        externalId: "INV-2025-003",
        type: "SATIŞ",
        issueDate: lastWeek,
        dueDate: today,
        totalAmount: 590.0,
        currency: "TRY",
        taxAmount: 90.0,
        netAmount: 500.0,
        counterpartyName: "Risky Şirket A.Ş.",
        counterpartyTaxNumber: null, // RISK: Missing tax number
        status: "kesildi",
        lines: {
          create: [
            {
              tenantId: tenant.id,
              lineNumber: 1,
              description: "Danışmanlık Hizmeti",
              quantity: 1,
              unitPrice: 500.0,
              lineTotal: 500.0,
              vatRate: 0.18,
              vatAmount: 90.0,
            },
          ],
        },
      },
    }),

    // Invoice with duplicate number (risk)
    prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[0].id,
        externalId: "INV-2025-001", // RISK: Duplicate invoice number
        type: "ALIŞ",
        issueDate: today,
        dueDate: tomorrow,
        totalAmount: 2360.0,
        currency: "TRY",
        taxAmount: 360.0,
        netAmount: 2000.0,
        counterpartyName: "Tedarikçi A.Ş.",
        counterpartyTaxNumber: "4444444444",
        status: "taslak",
        lines: {
          create: [
            {
              tenantId: tenant.id,
              lineNumber: 1,
              description: "Hammadde",
              quantity: 20,
              unitPrice: 100.0,
              lineTotal: 2000.0,
              vatRate: 0.18,
              vatAmount: 360.0,
            },
          ],
        },
      },
    }),

    // More normal invoices
    prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[0].id,
        externalId: "INV-2025-004",
        type: "SATIŞ",
        issueDate: lastWeek,
        dueDate: today,
        totalAmount: 3540.0,
        currency: "TRY",
        taxAmount: 540.0,
        netAmount: 3000.0,
        counterpartyName: "ABC Teknoloji A.Ş.",
        counterpartyTaxNumber: "1111111111",
        status: "kesildi",
        lines: {
          create: [
            {
              tenantId: tenant.id,
              lineNumber: 1,
              description: "Destek Hizmeti",
              quantity: 3,
              unitPrice: 1000.0,
              lineTotal: 3000.0,
              vatRate: 0.18,
              vatAmount: 540.0,
            },
          ],
        },
      },
    }),

    prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[1].id,
        externalId: "INV-2025-005",
        type: "SATIŞ",
        issueDate: lastWeek,
        dueDate: tomorrow,
        totalAmount: 11800.0,
        currency: "TRY",
        taxAmount: 1800.0,
        netAmount: 10000.0,
        counterpartyName: "XYZ İnşaat Ltd.",
        counterpartyTaxNumber: "2222222222",
        status: "kesildi",
        lines: {
          create: [
            {
              tenantId: tenant.id,
              lineNumber: 1,
              description: "Proje Yönetimi",
              quantity: 1,
              unitPrice: 10000.0,
              lineTotal: 10000.0,
              vatRate: 0.18,
              vatAmount: 1800.0,
            },
          ],
        },
      },
    }),
  ]);

  console.log(`✅ Created ${invoices.length} invoices (some with risk issues)`);

  console.log("");
  console.log("🎉 Test data seeded successfully!");
  console.log("");
  console.log("Created:");
  console.log(`  • ${clients.length} client companies`);
  console.log(`  • ${invoices.length} invoices`);
  console.log("");
  console.log("⚠️  Some invoices have risk issues to trigger alerts:");
  console.log("  • INV-2025-002: Due date before issue date");
  console.log("  • INV-2025-003: Missing tax number");
  console.log("  • INV-2025-001 (duplicate): Duplicate invoice number");
  console.log("");
  console.log("💡 Refresh the Risk Dashboard to see the data!");
}

seedTestData()
  .catch((e) => {
    console.error("Error seeding test data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

