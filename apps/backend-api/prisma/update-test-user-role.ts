import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { TENANT_ROLES } from "@repo/core-domain";

const prisma = new PrismaClient();

async function updateTestUserRole() {
  console.log("Updating Test User role to TenantOwner...");

  // Find the test user
  const user = await prisma.user.findUnique({
    where: { email: "test@example.com" },
    include: {
      memberships: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (!user) {
    console.error("❌ Test user (test@example.com) not found!");
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.fullName} (${user.email})`);

  if (user.memberships.length === 0) {
    console.error("❌ Test user has no tenant memberships!");
    process.exit(1);
  }

  // Update all memberships to TenantOwner
  for (const membership of user.memberships) {
    if (membership.role === TENANT_ROLES.TENANT_OWNER) {
      console.log(
        `ℹ️  User is already TenantOwner for tenant: ${membership.tenant.name}`
      );
    } else {
      await prisma.userTenantMembership.update({
        where: { id: membership.id },
        data: { role: TENANT_ROLES.TENANT_OWNER },
      });
      console.log(
        `✅ Updated role to TenantOwner for tenant: ${membership.tenant.name}`
      );
    }
  }

  console.log("\n✅ Test User role update completed!");
}

updateTestUserRole()
  .catch((e) => {
    console.error("Error updating user role:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

