/**
 * Fix User Password - Updates user password with correct bcrypt hash
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function fixPassword() {
  console.log("🔧 Fixing user password...\n");

  const user = await prisma.user.findUnique({
    where: { email: "demo@demo.local" },
  });

  if (!user) {
    console.error("❌ User not found");
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email}`);

  // Hash password with bcrypt (matching auth service)
  const hashedPassword = await bcrypt.hash("demo123", 10);
  
  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword },
  });

  console.log("✅ Password updated with bcrypt hash");
  console.log("\n💡 Login credentials:");
  console.log("   Email: demo@demo.local");
  console.log("   Password: demo123");
}

fixPassword()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
