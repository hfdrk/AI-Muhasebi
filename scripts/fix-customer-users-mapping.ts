/**
 * Fix Customer Users Mapping
 * 
 * Maps existing ReadOnly users to their client companies and removes duplicates
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixCustomerUsersMapping() {
  console.log("🔧 Fixing customer users mapping...\n");

  // Get the demo tenant
  const tenant = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!tenant) {
    console.error("❌ No active tenant found");
    process.exit(1);
  }

  console.log(`✅ Using tenant: ${tenant.name}\n`);

  // Get all ReadOnly users
  const readonlyUsers = await prisma.userTenantMembership.findMany({
    where: {
      tenantId: tenant.id,
      role: "ReadOnly",
    },
    include: {
      user: true,
    },
  });

  console.log(`📋 Found ${readonlyUsers.length} ReadOnly users\n`);

  // Map existing users to companies based on name matching
  const userCompanyMap: Record<string, string> = {
    "info@abcteknoloji.com": "ABC Teknoloji A.Ş.",
    "iletisim@xyzinşaat.com": "XYZ İnşaat Ltd.",
    "info@defticaret.com": "Güvenilir Hizmet A.Ş.",
  };

  // Get all client companies
  const companies = await prisma.clientCompany.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
    },
  });

  // Update companies to use existing user emails
  for (const [email, companyName] of Object.entries(userCompanyMap)) {
    const company = companies.find((c) => c.name === companyName);
    if (company && company.contactEmail !== email) {
      await prisma.clientCompany.update({
        where: { id: company.id },
        data: { contactEmail: email },
      });
      console.log(`✅ Updated ${companyName} → ${email}`);
    }
  }

  // Delete duplicate users created with @client.local emails
  const duplicateEmails = [
    "abcteknolojia@client.local",
    "demomteria@client.local",
    "gvenilirhizmeta@client.local",
    "problemliticaretltd@client.local",
    "riskyirketa@client.local",
    "xyzinaatltd@client.local",
  ];

  for (const email of duplicateEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: true,
      },
    });

    if (user) {
      // Delete memberships first
      await prisma.userTenantMembership.deleteMany({
        where: { userId: user.id },
      });
      
      // Then delete user
      await prisma.user.delete({
        where: { id: user.id },
      });
      console.log(`🗑️  Deleted duplicate user: ${email}`);
    }
  }

  // Create users for companies that still don't have one
  const companiesWithoutUsers = companies.filter((c) => {
    if (!c.contactEmail) return true;
    const hasUser = readonlyUsers.some((m) => m.user.email === c.contactEmail);
    return !hasUser;
  });

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

    const hashedPassword = await require("bcrypt").hash("demo123", 10);

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

    await prisma.clientCompany.update({
      where: { id: company.id },
      data: { contactEmail: userEmail },
    });

    console.log(`✅ Created user for ${company.name}: ${userEmail}`);
  }

  console.log(`\n✅ Done!`);
}

fixCustomerUsersMapping()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
