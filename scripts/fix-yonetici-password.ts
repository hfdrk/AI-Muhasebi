/**
 * Fix Yonetici User Password - Ensures yonetici@ornekofis1.com has correct password
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "@repo/shared-utils";

const prisma = new PrismaClient();

async function fixYoneticiPassword() {
  console.log("🔧 Fixing yonetici@ornekofis1.com password...\n");

  const user = await prisma.user.findUnique({
    where: { email: "yonetici@ornekofis1.com" },
    include: {
      memberships: {
        include: { tenant: true },
      },
    },
  });

  if (!user) {
    console.error("❌ User not found");
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email}`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Is Active: ${user.isActive}`);
  console.log(`   Memberships: ${user.memberships.length}`);

  if (user.memberships.length === 0) {
    console.log("\n⚠️  User has no memberships! Creating membership...");
    
    // Find or create tenant
    let tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: "ornek_ofis_1" },
          { slug: "ornekofis1" },
          { name: { contains: "Örnek Muhasebe Ofisi 1" } },
        ],
      },
    });

    if (!tenant) {
      console.log("Creating tenant...");
      tenant = await prisma.tenant.create({
        data: {
          name: "Örnek Muhasebe Ofisi 1",
          slug: "ornek_ofis_1",
          taxNumber: "1234567890",
          status: "ACTIVE",
        },
      });
    }

    await prisma.userTenantMembership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: "TenantOwner",
        status: "active",
      },
    });

    console.log("✅ Membership created");
  }

  // Test current password
  const testPassword = "Demo123!";
  const isValid = await verifyPassword(testPassword, user.hashedPassword);

  if (isValid) {
    console.log("\n✅ Password is already correct!");
  } else {
    console.log("\n⚠️  Password is incorrect, updating...");
    
    // Hash password with correct method
    const hashedPassword = await hashPassword(testPassword);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        hashedPassword,
        isActive: true, // Ensure user is active
      },
    });

    // Verify it worked
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    
    const verifyNew = await verifyPassword(testPassword, updatedUser!.hashedPassword);
    if (verifyNew) {
      console.log("✅ Password updated successfully!");
    } else {
      console.error("❌ Password update failed verification!");
      process.exit(1);
    }
  }

  console.log("\n💡 Login credentials:");
  console.log("   Email: yonetici@ornekofis1.com");
  console.log("   Password: Demo123!");
  console.log("\n✅ User ready for login!");
}

fixYoneticiPassword()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


