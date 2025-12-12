import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { integrationMappingService } from "../src/services/integration-mapping-service";

const prisma = new PrismaClient();

async function seedFieldMappings() {
  console.log("🌱 Seeding field mappings...");

  // Get user - try yonetici@ornekofis1.com first, fallback to test@example.com
  let user = await prisma.user.findFirst({
    where: { email: "yonetici@ornekofis1.com" },
  });

  if (!user) {
    console.log("⚠️  yonetici@ornekofis1.com not found, trying test@example.com...");
    user = await prisma.user.findFirst({
      where: { email: "test@example.com" },
    });
  }

  if (!user) {
    console.error("❌ User not found. Please run seed-users.ts first.");
    process.exit(1);
  }

  // Get tenant - if yonetici@ornekofis1.com, get from membership, otherwise use test-sirketi
  let tenant;
  if (user.email === "yonetici@ornekofis1.com") {
    const membership = await prisma.userTenantMembership.findFirst({
      where: { userId: user.id },
      include: { tenant: true },
    });
    if (membership) {
      tenant = membership.tenant;
      console.log(`✅ Using tenant from user membership: ${tenant.name}`);
    } else {
      console.error("❌ User membership not found for yonetici@ornekofis1.com");
      process.exit(1);
    }
  } else {
    tenant = await prisma.tenant.findFirst({
      where: { slug: "test-sirketi" },
    });
    if (!tenant) {
      console.error("❌ Test tenant not found. Please run seed-users.ts first.");
      process.exit(1);
    }
  }

  if (!tenant) {
    console.error("❌ Tenant not found. Please run seed-users.ts first.");
    process.exit(1);
  }

  console.log(`✅ Found tenant: ${tenant.name}`);

  // Get existing integrations for this tenant
  const integrations = await prisma.tenantIntegration.findMany({
    where: { tenantId: tenant.id },
    include: { provider: true },
    take: 5,
  });

  if (integrations.length === 0) {
    console.error("❌ No integrations found. Please create integrations first.");
    process.exit(1);
  }

  console.log(`✅ Found ${integrations.length} integrations`);

  // Sample field mappings for different integration types
  // Note: sourceField values must match the available fields in the modal dropdowns (camelCase)
  const sampleMappings = {
    accounting: {
      invoiceMappings: [
        { sourceField: "invoiceNumber", targetField: "invoiceNumber" },
        { sourceField: "issueDate", targetField: "issueDate" },
        { sourceField: "dueDate", targetField: "dueDate" },
        { sourceField: "totalAmount", targetField: "totalAmount" },
        { sourceField: "taxAmount", targetField: "taxAmount" },
        { sourceField: "netAmount", targetField: "netAmount" },
        { sourceField: "counterpartyName", targetField: "counterpartyName" },
        { sourceField: "counterpartyTaxNumber", targetField: "counterpartyTaxNumber" },
        { sourceField: "status", targetField: "status" },
        { sourceField: "type", targetField: "type" },
      ],
      transactionMappings: [],
      clientCompanyMappings: [
        { sourceField: "name", targetField: "name" },
        { sourceField: "taxNumber", targetField: "taxNumber" },
        { sourceField: "address", targetField: "address" },
        { sourceField: "phone", targetField: "contactPhone" },
        { sourceField: "email", targetField: "contactEmail" },
      ],
    },
    bank: {
      invoiceMappings: [],
      transactionMappings: [
        { sourceField: "bookingDate", targetField: "bookingDate" },
        { sourceField: "valueDate", targetField: "valueDate" },
        { sourceField: "description", targetField: "description" },
        { sourceField: "amount", targetField: "amount" },
        { sourceField: "currency", targetField: "currency" },
        { sourceField: "balanceAfter", targetField: "balanceAfter" },
        { sourceField: "accountIdentifier", targetField: "accountIdentifier" },
      ],
      clientCompanyMappings: [],
    },
  };

  let createdCount = 0;
  let updatedCount = 0;

  for (const integration of integrations) {
    try {
      const providerType = integration.provider.type;
      const mappings = sampleMappings[providerType] || sampleMappings.accounting;

      // Check if mappings already exist
      const existingMappings = await integrationMappingService.getMappings(
        tenant.id,
        integration.id
      );

      // Always update mappings to ensure they use correct field names
      await integrationMappingService.updateMappings(tenant.id, integration.id, mappings);
      createdCount++;
      console.log(
        `  ✅ Updated mappings for: ${integration.displayName} (${integration.provider.name})`
      );
    } catch (error: any) {
      console.error(
        `  ❌ Error creating mappings for ${integration.displayName}:`,
        error.message
      );
    }
  }

  console.log(`\n✅ Field mapping seeding completed!`);
  console.log(`   Created: ${createdCount} mappings`);
  console.log(`   Already existed: ${updatedCount} mappings`);
}

seedFieldMappings()
  .catch((e) => {
    console.error("❌ Error seeding field mappings:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


