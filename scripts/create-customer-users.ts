/**
 * Create Customer Users Script
 * 
 * Creates ReadOnly (Customer) users for all existing client companies in a tenant.
 * Links each customer user to their company by matching email addresses.
 * 
 * Usage:
 *   pnpm tsx scripts/create-customer-users.ts
 *   TENANT_SLUG=ornek_ofis_1 pnpm tsx scripts/create-customer-users.ts  # Add to specific tenant
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@repo/shared-utils";
import { TENANT_ROLES } from "@repo/core-domain";

const prisma = new PrismaClient();

async function createCustomerUsers() {
  console.log("🔐 Creating Customer users for all client companies...\n");

  // Safety check
  if (process.env.NODE_ENV === "production") {
    throw new Error("❌ Cannot create test users in production environment");
  }

  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.toLowerCase().includes("production")) {
    throw new Error("❌ DATABASE_URL appears to point to production database");
  }

  // Get tenant
  const tenantSlug = process.env.TENANT_SLUG;
  let tenant;

  if (tenantSlug) {
    tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) {
      throw new Error(`❌ Tenant with slug "${tenantSlug}" not found`);
    }
  } else {
    // Get first active tenant
    tenant = await prisma.tenant.findFirst({
      where: { status: "ACTIVE" },
    });
    if (!tenant) {
      throw new Error("❌ No active tenants found. Please create a tenant first.");
    }
  }

  console.log(`📁 Using tenant: ${tenant.name} (${tenant.slug})\n`);

  // Get all active client companies
  const clientCompanies = await prisma.clientCompany.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      contactEmail: true,
      contactPersonName: true,
    },
  });

  if (clientCompanies.length === 0) {
    console.log("⚠️  No active client companies found. Please create client companies first.");
    return;
  }

  console.log(`📋 Found ${clientCompanies.length} active client company(ies)\n`);

  const password = "customer123";
  const hashedPassword = await hashPassword(password);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const company of clientCompanies) {
    // Skip if no contact email
    if (!company.contactEmail) {
      console.log(`   ⏭️  Skipped ${company.name}: No contact email`);
      skipped++;
      continue;
    }

    try {
      // Check if user already exists with this email
      const existingUser = await prisma.user.findUnique({
        where: { email: company.contactEmail },
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
          console.log(`   ✅ Already exists: ${company.name} (${company.contactEmail})`);
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
          console.log(`   ✅ Added ReadOnly role: ${company.name} (${company.contactEmail})`);
          created++;
          continue;
        }
      }

      // Create new user and membership
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: company.contactEmail,
            hashedPassword,
            fullName: company.contactPersonName || company.name,
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

      console.log(`   ✅ Created: ${company.name} (${company.contactEmail})`);
      created++;
    } catch (error: any) {
      console.error(`   ❌ Error creating user for ${company.name}:`, error.message);
      errors++;
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("✅ Customer users creation completed!\n");
  console.log(`📊 Summary:`);
  console.log(`   Companies processed: ${clientCompanies.length}`);
  console.log(`   Users created: ${created}`);
  console.log(`   Users skipped (already exist): ${skipped}`);
  console.log(`   Errors: ${errors}\n`);
  console.log(`🔑 Default password for all customer users: customer123\n`);
  console.log(`📋 Customer users can now be seen in the User Management page.`);
}

createCustomerUsers()
  .catch((e) => {
    console.error("❌ Error creating customer users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
