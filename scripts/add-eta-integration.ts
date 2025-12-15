/**
 * Add ETA Integration to Demo Tenant
 * 
 * Creates an ETA integration for the demo tenant so E-Fatura submissions can work
 * 
 * Usage:
 *   pnpm tsx scripts/add-eta-integration.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addETAIntegration() {
  console.log("🌱 Adding ETA integration to Demo Ofis tenant...\n");

  // Find the demo tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "demo-ofis" },
  });

  if (!tenant) {
    console.log("❌ Demo tenant not found. Please run 'pnpm seed:demo-tenant' first.");
    process.exit(1);
  }

  console.log(`✅ Found tenant: ${tenant.name} (${tenant.id})\n`);

  // Check if ETA provider exists
  let etaProvider = await prisma.integrationProvider.findUnique({
    where: { code: "ETA" },
  });

  if (!etaProvider) {
    console.log("📦 Creating ETA provider...");
    etaProvider = await prisma.integrationProvider.create({
      data: {
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
    console.log(`   ✅ Created ETA provider: ${etaProvider.id}\n`);
  } else {
    console.log(`✅ ETA provider already exists: ${etaProvider.id}\n`);
  }

  // Check if integration already exists
  const existingIntegration = await prisma.tenantIntegration.findFirst({
    where: {
      tenantId: tenant.id,
      providerId: etaProvider.id,
      status: "active",
    },
  });

  if (existingIntegration) {
    console.log(`⚠️  Active ETA integration already exists for this tenant.`);
    console.log(`   Integration ID: ${existingIntegration.id}`);
    console.log(`   Status: ${existingIntegration.status}`);
    return;
  }

  // Create ETA integration for demo tenant
  console.log("🔗 Creating ETA integration...");
  const integration = await prisma.tenantIntegration.create({
    data: {
      tenantId: tenant.id,
      providerId: etaProvider.id,
      status: "active",
      displayName: "E-Fatura (ETA) - Demo",
      config: {
        username: "demo_user",
        password: "demo_password",
        vkn: tenant.taxNumber || "9999999999",
      },
      lastSyncAt: new Date(),
      lastSyncStatus: "success",
    },
  });

  console.log(`   ✅ Created ETA integration: ${integration.id}`);
  console.log(`   Status: ${integration.status}`);
  console.log(`   Display Name: ${integration.displayName}`);
  console.log(`\n✅ ETA integration is now active for ${tenant.name}!`);
  console.log(`\n📝 Note: This is a demo integration with mock credentials.`);
  console.log(`   For production use, configure real ETA credentials in the integrations settings.`);
}

addETAIntegration()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


