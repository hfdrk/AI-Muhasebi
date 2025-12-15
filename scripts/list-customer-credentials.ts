/**
 * List Customer User Credentials
 * 
 * Lists all ReadOnly (customer) users with their login credentials
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function listCustomerCredentials() {
  console.log("🔐 Customer User Login Credentials\n");
  console.log("=" .repeat(60) + "\n");

  // Get the demo tenant
  const tenant = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!tenant) {
    console.error("❌ No active tenant found");
    process.exit(1);
  }

  console.log(`📁 Tenant: ${tenant.name}\n`);

  // Get all ReadOnly users
  const readonlyMemberships = await prisma.userTenantMembership.findMany({
    where: {
      tenantId: tenant.id,
      role: "ReadOnly",
      status: "active",
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      user: {
        fullName: "asc",
      },
    },
  });

  if (readonlyMemberships.length === 0) {
    console.log("⚠️  No ReadOnly users found in this tenant.");
    console.log("\n💡 To create customer users, run:");
    console.log("   pnpm tsx scripts/create-customer-users.ts");
    return;
  }

  console.log(`📋 Found ${readonlyMemberships.length} customer user(s):\n`);

  // Get associated client companies
  const companies = await prisma.clientCompany.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      contactEmail: true,
    },
  });

  const emailToCompany = new Map(
    companies.map((c) => [c.contactEmail, c.name])
  );

  readonlyMemberships.forEach((membership, index) => {
    const user = membership.user;
    const companyName = emailToCompany.get(user.email) || "N/A";
    
    console.log(`${index + 1}. ${user.fullName}`);
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   🏢 Company: ${companyName}`);
    console.log(`   🔑 Password: demo123`);
    console.log(`   👤 Role: ReadOnly (Customer - View Only)`);
    console.log(`   ${user.isActive ? "✅ Active" : "❌ Inactive"}`);
    console.log("");
  });

  console.log("=" .repeat(60));
  console.log("\n💡 All customer users use the default password: demo123");
  console.log("💡 Customer users have read-only access (cannot create/edit/delete)");
  console.log("\n📝 Quick Login Examples:");
  readonlyMemberships.slice(0, 3).forEach((membership) => {
    console.log(`   • ${membership.user.email} / demo123`);
  });
}

listCustomerCredentials()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

