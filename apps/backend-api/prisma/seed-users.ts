import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@repo/shared-utils";
import { TENANT_ROLES } from "@repo/core-domain";

const prisma = new PrismaClient();

async function seedUsers() {
  console.log("Seeding test users...");

  // Create test user password
  const testPassword = "Test123!@#";
  const hashedPassword = await hashPassword(testPassword);

  // Check if test user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: "test@example.com" },
    include: {
      memberships: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (existingUser) {
    console.log("Test user already exists, updating role to TenantOwner...");
    
    // Update all memberships to TenantOwner
    for (const membership of existingUser.memberships) {
      if (membership.role !== TENANT_ROLES.TENANT_OWNER) {
        await prisma.userTenantMembership.update({
          where: { id: membership.id },
          data: { role: TENANT_ROLES.TENANT_OWNER },
        });
        console.log(`✅ Updated role to TenantOwner for tenant: ${membership.tenant.name}`);
      } else {
        console.log(`ℹ️  User is already TenantOwner for tenant: ${membership.tenant.name}`);
      }
    }
    
    console.log("✅ Test user role update completed!");
    return;
  }

  // Create test user, tenant, and membership
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        email: "test@example.com",
        hashedPassword,
        fullName: "Test User",
        locale: "tr-TR",
        isActive: true,
      },
    });

    // Create tenant
    const tenant = await tx.tenant.create({
      data: {
        name: "Test Şirketi",
        slug: "test-sirketi",
        taxNumber: "1234567890",
        phone: "+90 555 123 4567",
        email: "info@test-sirketi.com",
        address: "Test Adresi, İstanbul",
        settings: {},
      },
    });

    // Create membership as TenantOwner
    await tx.userTenantMembership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: TENANT_ROLES.TENANT_OWNER,
        status: "active",
      },
    });

    return { user, tenant };
  });

  console.log("✅ Test user created successfully!");
  console.log("");
  console.log("Login credentials:");
  console.log("  Email: test@example.com");
  console.log("  Password: Test123!@#");
  console.log("");
  console.log("Tenant:", result.tenant.name);
}

seedUsers()
  .catch((e) => {
    console.error("Error seeding users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

