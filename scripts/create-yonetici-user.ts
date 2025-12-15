/**
 * Create Yonetici User - Creates user with yonetici@ornekofis1.com
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function createYoneticiUser() {
  console.log("🔧 Creating yonetici@ornekofis1.com user...\n");

  // Get or create tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-ofis" },
    update: {},
    create: {
      name: "Demo Ofis",
      slug: "demo-ofis",
      status: "ACTIVE",
    },
  });

  console.log(`✅ Tenant: ${tenant.name}\n`);

  // Hash password with bcrypt
  const hashedPassword = await bcrypt.hash("demo123", 12);
  
  // Create or update user
  const user = await prisma.user.upsert({
    where: { email: "yonetici@ornekofis1.com" },
    update: {
      hashedPassword,
      isActive: true,
    },
    create: {
      email: "yonetici@ornekofis1.com",
      hashedPassword,
      fullName: "Yönetici Kullanıcı",
      isActive: true,
    },
  });

  console.log(`✅ User: ${user.email}`);

  // Create membership
  await prisma.userTenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
    update: {
      role: "TenantOwner",
    },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: "TenantOwner",
    },
  });

  console.log(`✅ Membership created\n`);

  console.log("💡 Login credentials:");
  console.log("   Email: yonetici@ornekofis1.com");
  console.log("   Password: demo123");
  console.log("\n✅ User ready for login!");
}

createYoneticiUser()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

