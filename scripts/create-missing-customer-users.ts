/**
 * Create Missing Customer Users
 * 
 * Creates ReadOnly users for all client companies that don't have a corresponding user
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function createMissingCustomerUsers() {
  console.log("🌱 Creating missing customer users...\n");

  // Get the demo tenant
  const tenant = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!tenant) {
    console.error("❌ No active tenant found");
    process.exit(1);
  }

  console.log(`✅ Using tenant: ${tenant.name} (${tenant.id})\n`);

  // Get all active client companies
  const clientCompanies = await prisma.clientCompany.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  console.log(`📋 Found ${clientCompanies.length} active client companies\n`);

  // For each client company, check if they have a ReadOnly user
  let createdCount = 0;
  let existingCount = 0;

  for (const company of clientCompanies) {
    // Try to find existing user by email match
    // First check if company has contactEmail
    let userEmail: string;
    
    if (company.contactEmail) {
      userEmail = company.contactEmail;
    } else {
      // Generate email from company name
      const emailPrefix = company.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 20);
      userEmail = `${emailPrefix}@client.local`;
    }

    // Check if user already exists
    let user = await prisma.user.findFirst({
      where: { email: userEmail },
      include: {
        memberships: {
          where: {
            tenantId: tenant.id,
            role: "ReadOnly",
          },
        },
      },
    });

    if (user && user.memberships.length > 0) {
      console.log(`✅ User already exists: ${userEmail} (${company.name})`);
      existingCount++;
      continue;
    }

    // Create user if doesn't exist
    if (!user) {
      const hashedPassword = await bcrypt.hash("demo123", 10);
      
      user = await prisma.user.create({
        data: {
          email: userEmail,
          hashedPassword,
          fullName: `${company.name} Kullanıcısı`,
          locale: "tr-TR",
          isActive: true,
        },
      });
      console.log(`✅ Created user: ${userEmail}`);
    }

    // Create membership if doesn't exist
    const existingMembership = await prisma.userTenantMembership.findFirst({
      where: {
        userId: user.id,
        tenantId: tenant.id,
        role: "ReadOnly",
      },
    });

    if (!existingMembership) {
      await prisma.userTenantMembership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: "ReadOnly",
          status: "active",
        },
      });
      console.log(`✅ Created ReadOnly membership for: ${userEmail} (${company.name})`);
      createdCount++;
    } else {
      console.log(`✅ Membership already exists: ${userEmail} (${company.name})`);
      existingCount++;
    }

    // Update company contactEmail if it was empty
    if (!company.contactEmail) {
      await prisma.clientCompany.update({
        where: { id: company.id },
        data: { contactEmail: userEmail },
      });
      console.log(`✅ Updated company contactEmail: ${company.name} → ${userEmail}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total Companies: ${clientCompanies.length}`);
  console.log(`   Created Users: ${createdCount}`);
  console.log(`   Existing Users: ${existingCount}`);
  console.log(`\n✅ Done!`);
}

createMissingCustomerUsers()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
