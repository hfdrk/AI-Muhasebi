/**
 * Seed Customers Script
 * 
 * Adds demo customer (client company) data to existing tenants.
 * 
 * Usage:
 *   pnpm seed:customers
 *   TENANT_SLUG=demo-ofis pnpm seed:customers  # Add to specific tenant
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@repo/shared-utils";

const prisma = new PrismaClient();

// Comprehensive list of Turkish companies for demo
const DEMO_CUSTOMERS = [
  {
    name: "Akdeniz Teknoloji A.Ş.",
    taxNumber: "1001001001",
    legalType: "Anonim",
    tradeRegistryNumber: "123456",
    sector: "Bilişim ve Teknoloji",
    contactPersonName: "Ahmet Yılmaz",
    contactPhone: "+90 212 555 0101",
    contactEmail: "ahmet@akdeniztek.com",
    address: "Maslak Mahallesi, Büyükdere Cad. No:123, Sarıyer, İstanbul",
  },
  {
    name: "Ege İnşaat ve Ticaret Ltd.",
    taxNumber: "2002002002",
    legalType: "Limited",
    tradeRegistryNumber: "234567",
    sector: "İnşaat",
    contactPersonName: "Mehmet Demir",
    contactPhone: "+90 232 555 0202",
    contactEmail: "mehmet@egeinsaat.com",
    address: "Konak Mahallesi, Atatürk Cad. No:456, Konak, İzmir",
  },
  {
    name: "Marmara Gıda Sanayi A.Ş.",
    taxNumber: "3003003003",
    legalType: "Anonim",
    tradeRegistryNumber: "345678",
    sector: "Gıda ve İçecek",
    contactPersonName: "Ayşe Kaya",
    contactPhone: "+90 216 555 0303",
    contactEmail: "ayse@marmaragida.com",
    address: "Kadıköy Mahallesi, Bağdat Cad. No:789, Kadıköy, İstanbul",
  },
  {
    name: "Karadeniz Lojistik Hizmetleri Ltd.",
    taxNumber: "4004004004",
    legalType: "Limited",
    tradeRegistryNumber: "456789",
    sector: "Lojistik ve Taşımacılık",
    contactPersonName: "Fatma Şahin",
    contactPhone: "+90 312 555 0404",
    contactEmail: "fatma@karadenizlojistik.com",
    address: "Çankaya Mahallesi, Tunalı Hilmi Cad. No:321, Çankaya, Ankara",
  },
  {
    name: "İç Anadolu Enerji A.Ş.",
    taxNumber: "5005005005",
    legalType: "Anonim",
    tradeRegistryNumber: "567890",
    sector: "Enerji",
    contactPersonName: "Ali Öztürk",
    contactPhone: "+90 312 555 0505",
    contactEmail: "ali@icanadoluenerji.com",
    address: "Yenimahalle, İvedik OSB, Ankara",
  },
  {
    name: "Doğu Anadolu Tarım Ürünleri Ltd.",
    taxNumber: "6006006006",
    legalType: "Limited",
    tradeRegistryNumber: "678901",
    sector: "Tarım",
    contactPersonName: "Zeynep Arslan",
    contactPhone: "+90 422 555 0606",
    contactEmail: "zeynep@doguanadolutarim.com",
    address: "Yenişehir Mahallesi, İnönü Cad. No:654, Malatya",
  },
  {
    name: "Güneydoğu Tekstil Sanayi A.Ş.",
    taxNumber: "7007007007",
    legalType: "Anonim",
    tradeRegistryNumber: "789012",
    sector: "Tekstil",
    contactPersonName: "Mustafa Çelik",
    contactPhone: "+90 342 555 0707",
    contactEmail: "mustafa@guneydogutekstil.com",
    address: "Şehitkamil, Organize Sanayi Bölgesi, Gaziantep",
  },
  {
    name: "Akdeniz Turizm ve Otelcilik Ltd.",
    taxNumber: "8008008008",
    legalType: "Limited",
    tradeRegistryNumber: "890123",
    sector: "Turizm",
    contactPersonName: "Elif Yıldız",
    contactPhone: "+90 242 555 0808",
    contactEmail: "elif@akdenizturizm.com",
    address: "Konyaaltı Sahil Yolu, Antalya",
  },
  {
    name: "Ege Eğitim Hizmetleri A.Ş.",
    taxNumber: "9009009009",
    legalType: "Anonim",
    tradeRegistryNumber: "901234",
    sector: "Eğitim",
    contactPersonName: "Can Aydın",
    contactPhone: "+90 232 555 0909",
    contactEmail: "can@egeegitim.com",
    address: "Bornova, Ege Üniversitesi Kampüsü, İzmir",
  },
  {
    name: "Marmara Danışmanlık Hizmetleri Ltd.",
    taxNumber: "1010101010",
    legalType: "Limited",
    tradeRegistryNumber: "012345",
    sector: "Danışmanlık",
    contactPersonName: "Selin Özkan",
    contactPhone: "+90 212 555 1010",
    contactEmail: "selin@marmaradansmanlik.com",
    address: "Levent Mahallesi, Büyükdere Cad. No:100, Beşiktaş, İstanbul",
  },
  {
    name: "Karadeniz Otomotiv A.Ş.",
    taxNumber: "1111111111",
    legalType: "Anonim",
    tradeRegistryNumber: "123450",
    sector: "Otomotiv",
    contactPersonName: "Burak Kılıç",
    contactPhone: "+90 362 555 1111",
    contactEmail: "burak@karadenizotomotiv.com",
    address: "Atakum, Organize Sanayi Bölgesi, Samsun",
  },
  {
    name: "İç Anadolu Sağlık Hizmetleri Ltd.",
    taxNumber: "1212121212",
    legalType: "Limited",
    tradeRegistryNumber: "234561",
    sector: "Sağlık",
    contactPersonName: "Derya Yılmaz",
    contactPhone: "+90 312 555 1212",
    contactEmail: "derya@icanadolusaglik.com",
    address: "Keçiören, Etlik Mahallesi, Ankara",
  },
];

async function seedCustomers() {
  console.log("🌱 Starting customer seed...\n");

  // Safety check
  if (process.env.NODE_ENV === "production") {
    throw new Error("❌ Cannot run seed-customers in production environment");
  }

  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.toLowerCase().includes("production")) {
    throw new Error("❌ DATABASE_URL appears to point to production database");
  }

  console.log("✅ Safety checks passed\n");

  // Get tenant(s) to add customers to
  const tenantSlug = process.env.TENANT_SLUG;
  let tenants;

  if (tenantSlug) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) {
      throw new Error(`❌ Tenant with slug "${tenantSlug}" not found`);
    }
    tenants = [tenant];
    console.log(`📁 Adding customers to tenant: ${tenant.name} (${tenant.slug})\n`);
  } else {
    tenants = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
    });
    if (tenants.length === 0) {
      throw new Error("❌ No active tenants found. Please create a tenant first.");
    }
    console.log(`📁 Found ${tenants.length} active tenant(s). Adding customers to all.\n`);
  }

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const tenant of tenants) {
    console.log(`\n🏢 Processing tenant: ${tenant.name}`);
    console.log("─".repeat(50));

    for (const customerData of DEMO_CUSTOMERS) {
      try {
        // Check if customer already exists
        const existing = await prisma.clientCompany.findUnique({
          where: {
            tenantId_taxNumber: {
              tenantId: tenant.id,
              taxNumber: customerData.taxNumber,
            },
          },
        });

        if (existing) {
          console.log(`   ⏭️  Skipped (exists): ${customerData.name}`);
          totalSkipped++;
          continue;
        }

        // Create customer
        const customer = await prisma.clientCompany.create({
          data: {
            tenantId: tenant.id,
            name: customerData.name,
            taxNumber: customerData.taxNumber,
            legalType: customerData.legalType,
            tradeRegistryNumber: customerData.tradeRegistryNumber,
            sector: customerData.sector,
            contactPersonName: customerData.contactPersonName,
            contactPhone: customerData.contactPhone,
            contactEmail: customerData.contactEmail,
            address: customerData.address,
            isActive: true,
            startDate: new Date(2024, 0, 1), // Start date: Jan 1, 2024
          },
        });

        console.log(`   ✅ Created: ${customer.name} (${customer.taxNumber})`);
        totalCreated++;
      } catch (error: any) {
        console.error(`   ❌ Error creating ${customerData.name}:`, error.message);
      }
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("✅ Customer seed completed!\n");
  console.log(`📊 Summary:`);
  console.log(`   Tenants processed: ${tenants.length}`);
  console.log(`   Customers created: ${totalCreated}`);
  console.log(`   Customers skipped: ${totalSkipped}`);
  console.log(`   Total customers per tenant: ${DEMO_CUSTOMERS.length}\n`);
}

// Run seed
seedCustomers()
  .catch((e) => {
    console.error("❌ Error seeding customers:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

