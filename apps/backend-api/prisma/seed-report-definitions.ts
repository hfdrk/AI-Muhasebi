import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedReportDefinitions() {
  console.log("🌱 Seeding report definitions...");

  const reportDefinitions = [
    {
      code: "COMPANY_FINANCIAL_SUMMARY",
      name: "Müşteri Finansal Özeti",
      description: "Seçili müşteri için belirli tarih aralığında satış, alış ve fatura özetleri.",
      isActive: true,
    },
    {
      code: "COMPANY_RISK_SUMMARY",
      name: "Müşteri Risk Özeti",
      description: "Seçili müşteri için risk skoru, seviyeleri ve uyarı özetleri.",
      isActive: true,
    },
    {
      code: "TENANT_PORTFOLIO",
      name: "Portföy Özeti",
      description: "Tüm müşteri portföyü için risk ve aktivite özeti.",
      isActive: true,
    },
    {
      code: "DOCUMENT_ACTIVITY",
      name: "Belge ve Fatura Aktivitesi",
      description: "Belge yüklemeleri, AI analizleri ve fatura durumları.",
      isActive: true,
    },
  ];

  let created = 0;
  let updated = 0;

  for (const def of reportDefinitions) {
    // Check if report definition exists
    const existing = await prisma.reportDefinition.findUnique({
      where: { code: def.code },
    });

    if (existing) {
      // Update if exists
      await prisma.reportDefinition.update({
        where: { id: existing.id },
        data: {
          name: def.name,
          description: def.description,
          isActive: def.isActive,
        },
      });
      updated++;
      console.log(`  ✓ Updated: ${def.code} - ${def.name}`);
    } else {
      // Create if not exists
      await prisma.reportDefinition.create({
        data: def,
      });
      created++;
      console.log(`  ✓ Created: ${def.code} - ${def.name}`);
    }
  }

  console.log(`\n✅ Seeded ${reportDefinitions.length} report definitions (${created} created, ${updated} updated).`);
}

seedReportDefinitions()
  .catch((e) => {
    console.error("❌ Error seeding report definitions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });





