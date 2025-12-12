/**
 * Script to create a platform admin user
 * Usage: pnpm tsx scripts/create-platform-admin.ts <email>
 */

import { getTestPrisma } from "../src/test-utils/test-db";
import { hashPassword } from "@repo/shared-utils";
import { PLATFORM_ROLES } from "@repo/core-domain";

async function createPlatformAdmin(email: string) {
  const prisma = getTestPrisma();
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  
  if (existingUser) {
    // Update existing user
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { platformRole: PLATFORM_ROLES.PLATFORM_ADMIN },
    });
    console.log(`✅ Updated user ${normalizedEmail} to platform admin`);
  } else {
    // Create new user
    const hashedPassword = await hashPassword("Admin123!@#");
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        hashedPassword,
        fullName: "Platform Admin",
        locale: "tr-TR",
        isActive: true,
        platformRole: PLATFORM_ROLES.PLATFORM_ADMIN,
      },
    });
    console.log(`✅ Created platform admin user: ${normalizedEmail}`);
    console.log(`   Default password: Admin123!@#`);
    console.log(`   Please change the password after first login!`);
  }
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: pnpm tsx scripts/create-platform-admin.ts <email>");
  process.exit(1);
}

createPlatformAdmin(email)
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });




