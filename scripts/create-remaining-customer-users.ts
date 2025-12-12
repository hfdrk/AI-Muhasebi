/**
 * Create Remaining Customer Users
 * 
 * Creates ReadOnly users for client companies that don't have one yet
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function createRemainingCustomerUsers() {
  console.log("🌱 Creating remaining customer users...\n");

  // Get the demo tenant
  const tenant = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!tenant) {
    console.error("❌ No active tenant found");
    process.exit(1);
  }

  console.log(`✅ Using tenant: ${tenant.name}\n`);

  // Get all active client companies
  const companies = await prisma.clientCompany.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  // Get all existing ReadOnly users
  const readonlyUsers = await prisma.userTenantMembership.findMany({
    where: {
      tenantId: tenant.id,
      role: "ReadOnly",
    },
    include: {
      user: true,
    },
  });

  const existingEmails = new Set(readonlyUsers.map((m) => m.user.email));

  // Find companies without users
  const companiesWithoutUsers = companies.filter((c) => {
    if (!c.contactEmail) return true;
    return !existingEmails.has(c.contactEmail);
  });

  console.log(`📋 Found ${companies.length} companies, ${companiesWithoutUsers.length} need users\n`);

  // Create users for companies without one
  for (const company of companiesWithoutUsers) {
    // Generate email from company name
    const emailPrefix = company.name
      .toLowerCase()
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/ı/g, "i")
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 30);
    const userEmail = `${emailPrefix}@client.local`;

    // Check if email already exists
    let existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (existingUser) {
      // User exists but not linked, create membership
      const hasMembership = await prisma.userTenantMembership.findFirst({
        where: {
          userId: existingUser.id,
          tenantId: tenant.id,
          role: "ReadOnly",
        },
      });

      if (!hasMembership) {
        await prisma.userTenantMembership.create({
          data: {
            userId: existingUser.id,
            tenantId: tenant.id,
            role: "ReadOnly",
            status: "active",
          },
        });
        console.log(`✅ Created membership for existing user: ${userEmail} (${company.name})`);
      }
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash("demo123", 10);

      const user = await prisma.user.create({
        data: {
          email: userEmail,
          hashedPassword,
          fullName: `${company.name} Kullanıcısı`,
          locale: "tr-TR",
          isActive: true,
          memberships: {
            create: {
              tenantId: tenant.id,
              role: "ReadOnly",
              status: "active",
            },
          },
        },
      });

      console.log(`✅ Created user: ${userEmail} (${company.name})`);
    }

    // Update company contactEmail
    await prisma.clientCompany.update({
      where: { id: company.id },
      data: { contactEmail: userEmail },
    });

    console.log(`✅ Updated company contactEmail: ${company.name} → ${userEmail}`);
  }

  console.log(`\n✅ Done! All companies now have ReadOnly users.`);
}

createRemainingCustomerUsers()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
