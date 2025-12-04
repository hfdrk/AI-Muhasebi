import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding integration providers...");

  // Create MOCK_ACCOUNTING provider
  const mockAccounting = await prisma.integrationProvider.upsert({
    where: { code: "MOCK_ACCOUNTING" },
    update: {},
    create: {
      type: "accounting",
      code: "MOCK_ACCOUNTING",
      name: "Mock Muhasebe Sistemi",
      description: "Test ve geliştirme için mock muhasebe sistemi entegrasyonu",
      isActive: true,
      configSchema: {
        apiKey: {
          type: "string",
          label: "API Anahtarı",
          description: "Mock API anahtarı (herhangi bir değer olabilir)",
          required: true,
        },
      },
    },
  });

  console.log("Created MOCK_ACCOUNTING provider:", mockAccounting.id);

  // Create MOCK_BANK provider
  const mockBank = await prisma.integrationProvider.upsert({
    where: { code: "MOCK_BANK" },
    update: {},
    create: {
      type: "bank",
      code: "MOCK_BANK",
      name: "Mock Banka API",
      description: "Test ve geliştirme için mock banka API entegrasyonu",
      isActive: true,
      configSchema: {
        apiKey: {
          type: "string",
          label: "API Anahtarı",
          description: "Mock API anahtarı (herhangi bir değer olabilir)",
          required: true,
        },
      },
    },
  });

  console.log("Created MOCK_BANK provider:", mockBank.id);

  console.log("Integration providers seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding integration providers:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

