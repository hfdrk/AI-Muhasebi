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

  // Create MIKRO_ACCOUNTING provider
  const mikroAccounting = await prisma.integrationProvider.upsert({
    where: { code: "MIKRO_ACCOUNTING" },
    update: {},
    create: {
      type: "accounting",
      code: "MIKRO_ACCOUNTING",
      name: "Mikro Muhasebe",
      description: "Mikro (mikro.com.tr) muhasebe yazılımı entegrasyonu",
      isActive: true,
      configSchema: {
        apiKey: {
          type: "string",
          label: "API Anahtarı",
          description: "Mikro API anahtarı",
          required: true,
        },
        apiSecret: {
          type: "string",
          label: "API Secret",
          description: "Mikro API secret",
          required: true,
        },
        companyId: {
          type: "string",
          label: "Şirket ID",
          description: "Mikro şirket ID",
          required: true,
        },
      },
    },
  });

  console.log("Created MIKRO_ACCOUNTING provider:", mikroAccounting.id);

  // Create LOGO_ACCOUNTING provider
  const logoAccounting = await prisma.integrationProvider.upsert({
    where: { code: "LOGO_ACCOUNTING" },
    update: {},
    create: {
      type: "accounting",
      code: "LOGO_ACCOUNTING",
      name: "Logo Muhasebe",
      description: "Logo (logo.com.tr) muhasebe yazılımı entegrasyonu",
      isActive: true,
      configSchema: {
        apiKey: {
          type: "string",
          label: "API Anahtarı",
          description: "Logo API anahtarı",
          required: true,
        },
        apiSecret: {
          type: "string",
          label: "API Secret",
          description: "Logo API secret",
          required: true,
        },
        firmNumber: {
          type: "string",
          label: "Firma Numarası",
          description: "Logo firma numarası",
          required: true,
        },
      },
    },
  });

  console.log("Created LOGO_ACCOUNTING provider:", logoAccounting.id);

  // Create ETA provider
  const eta = await prisma.integrationProvider.upsert({
    where: { code: "ETA" },
    update: {},
    create: {
      type: "accounting",
      code: "ETA",
      name: "E-Fatura (ETA)",
      description: "Türkiye E-Fatura sistemi (ETA) entegrasyonu",
      isActive: true,
      configSchema: {
        username: {
          type: "string",
          label: "Kullanıcı Adı",
          description: "ETA portal kullanıcı adı",
          required: true,
        },
        password: {
          type: "string",
          label: "Şifre",
          description: "ETA portal şifre",
          required: true,
          secret: true,
        },
        vkn: {
          type: "string",
          label: "Vergi Kimlik Numarası (VKN)",
          description: "10 haneli vergi kimlik numarası",
          required: true,
        },
      },
    },
  });

  console.log("Created ETA provider:", eta.id);

  // Create IS_BANKASI provider
  const isBankasi = await prisma.integrationProvider.upsert({
    where: { code: "IS_BANKASI" },
    update: {},
    create: {
      type: "bank",
      code: "IS_BANKASI",
      name: "İş Bankası",
      description: "İş Bankası API entegrasyonu",
      isActive: true,
      configSchema: {
        clientId: {
          type: "string",
          label: "Client ID",
          description: "İş Bankası API client ID",
          required: true,
        },
        clientSecret: {
          type: "string",
          label: "Client Secret",
          description: "İş Bankası API client secret",
          required: true,
          secret: true,
        },
        accountNumber: {
          type: "string",
          label: "Hesap Numarası",
          description: "İş Bankası hesap numarası",
          required: true,
        },
      },
    },
  });

  console.log("Created IS_BANKASI provider:", isBankasi.id);

  // Create GARANTI_BBVA provider
  const garantiBBVA = await prisma.integrationProvider.upsert({
    where: { code: "GARANTI_BBVA" },
    update: {},
    create: {
      type: "bank",
      code: "GARANTI_BBVA",
      name: "Garanti BBVA",
      description: "Garanti BBVA API entegrasyonu",
      isActive: true,
      configSchema: {
        apiKey: {
          type: "string",
          label: "API Anahtarı",
          description: "Garanti BBVA API anahtarı",
          required: true,
        },
        apiSecret: {
          type: "string",
          label: "API Secret",
          description: "Garanti BBVA API secret",
          required: true,
          secret: true,
        },
        customerNumber: {
          type: "string",
          label: "Müşteri Numarası",
          description: "Garanti BBVA müşteri numarası",
          required: true,
        },
      },
    },
  });

  console.log("Created GARANTI_BBVA provider:", garantiBBVA.id);

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

