/**
 * Setup Customer Users for Demo Companies
 * 
 * Adds contact emails to demo companies and creates customer users for them.
 * This ensures all demo companies have associated customer users.
 * 
 * Usage:
 *   pnpm tsx scripts/setup-customer-users-for-demo.ts
 *   TENANT_SLUG=ornek_ofis_1 pnpm tsx scripts/setup-customer-users-for-demo.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@repo/shared-utils";
import { TENANT_ROLES } from "@repo/core-domain";

const prisma = new PrismaClient();

// Map company names to contact emails
const COMPANY_EMAILS: Record<string, string> = {
  "ABC Teknoloji A.Ş.": "ahmet@abcteknoloji.com",
  "XYZ İnşaat Ltd.": "mehmet@xyzinşaat.com",
  "DEF Ticaret A.Ş.": "ali@defticaret.com",
  "GHI Gıda San. Tic. Ltd.": "ayse@ghigida.com",
  "JKL Lojistik A.Ş.": "fatma@jkllojistik.com",
  "MNO Eğitim Hiz. A.Ş.": "zeynep@mnoegitim.com",
  "PQR Danışmanlık Ltd.": "can@pqrdansmanlik.com",
  "STU Sağlık Hiz. A.Ş.": "burak@stusaglik.com",
};

async function setupCustomerUsers() {
  console.log("🔐 Setting up customer users for demo companies...\n");

  // Safety check
  if (process.env.NODE_ENV === "production") {
    throw new Error("❌ Cannot run in production environment");
  }

  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.toLowerCase().includes("production")) {
    throw new Error("❌ DATABASE_URL appears to point to production database");
  }

  // Get tenant
  const tenantSlug = process.env.TENANT_SLUG || "ornek_ofis_1";
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant) {
    throw new Error(`❌ Tenant with slug "${tenantSlug}" not found`);
  }

  console.log(`📁 Using tenant: ${tenant.name} (${tenant.slug})\n`);

  // Get all companies in this tenant
  const companies = await prisma.clientCompany.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
    },
  });

  if (companies.length === 0) {
    console.log("⚠️  No active companies found.");
    return;
  }

  console.log(`📋 Found ${companies.length} active company(ies)\n`);

  const password = "customer123";
  const hashedPassword = await hashPassword(password);

  let updated = 0;
  let created = 0;
  let skipped = 0;

  for (const company of companies) {
    const contactEmail = COMPANY_EMAILS[company.name];
    
    if (!contactEmail) {
      console.log(`   ⏭️  Skipped ${company.name}: No email mapping defined`);
      skipped++;
      continue;
    }

    try {
      // Update company with contact email if not set
      if (!company.contactEmail || company.contactEmail !== contactEmail) {
        await prisma.clientCompany.update({
          where: { id: company.id },
          data: {
            contactEmail,
            contactPersonName: company.contactPersonName || contactEmail.split("@")[0],
          },
        });
        console.log(`   ✅ Updated ${company.name} with email: ${contactEmail}`);
        updated++;
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: contactEmail },
        include: {
          memberships: {
            where: {
              tenantId: tenant.id,
            },
          },
        },
      });

      if (existingUser) {
        // Check if already has ReadOnly membership
        const hasReadOnlyMembership = existingUser.memberships.some(
          (m) => m.role === TENANT_ROLES.READ_ONLY
        );

        if (hasReadOnlyMembership) {
          console.log(`   ✅ User already exists: ${contactEmail}`);
          skipped++;
          continue;
        } else {
          // User exists but doesn't have ReadOnly membership - add it
          await prisma.userTenantMembership.create({
            data: {
              userId: existingUser.id,
              tenantId: tenant.id,
              role: TENANT_ROLES.READ_ONLY,
              status: "active",
            },
          });
          console.log(`   ✅ Added ReadOnly role: ${contactEmail}`);
          created++;
          continue;
        }
      }

      // Create new user and membership
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: contactEmail,
            hashedPassword,
            fullName: company.contactPersonName || contactEmail.split("@")[0],
            locale: "tr-TR",
            isActive: true,
          },
        });

        await tx.userTenantMembership.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            role: TENANT_ROLES.READ_ONLY,
            status: "active",
          },
        });
      });

      console.log(`   ✅ Created user: ${contactEmail} for ${company.name}`);
      created++;
    } catch (error: any) {
      console.error(`   ❌ Error processing ${company.name}:`, error.message);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("✅ Setup completed!\n");
  console.log(`📊 Summary:`);
  console.log(`   Companies processed: ${companies.length}`);
  console.log(`   Companies updated: ${updated}`);
  console.log(`   Users created: ${created}`);
  console.log(`   Users skipped: ${skipped}\n`);
  console.log(`🔑 Default password for all customer users: customer123\n`);
  console.log(`📋 Customer users are now visible in the User Management page.`);
}

setupCustomerUsers()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


