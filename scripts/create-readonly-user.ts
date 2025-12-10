/**
 * Create ReadOnly User Script
 * 
 * Creates a ReadOnly (view-only) user for customer testing.
 * Adds the user to an existing tenant.
 * 
 * Usage:
 *   pnpm tsx scripts/create-readonly-user.ts
 *   TENANT_SLUG=ornek_ofis_1 pnpm tsx scripts/create-readonly-user.ts  # Add to specific tenant
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@repo/shared-utils";
import { TENANT_ROLES } from "@repo/core-domain";

const prisma = new PrismaClient();

async function createReadOnlyUser() {
  console.log("🔐 Creating ReadOnly user for customer testing...\n");

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

  // Check if ReadOnly user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      email: "customer@demo.local",
      memberships: {
        some: {
          tenantId: tenant.id,
          role: TENANT_ROLES.READ_ONLY,
        },
      },
    },
    include: {
      memberships: {
        where: {
          tenantId: tenant.id,
        },
      },
    },
  });

  if (existingUser) {
    console.log("✅ ReadOnly user already exists!");
    console.log("");
    console.log("Login credentials:");
    console.log("  Email: customer@demo.local");
    console.log("  Password: customer123");
    console.log("");
    console.log("Tenant:", tenant.name);
    console.log("Role: ReadOnly (View-only access)");
    return;
  }

  // Create password
  const password = "customer123";
  const hashedPassword = await hashPassword(password);

  // Create user and membership
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        email: "customer@demo.local",
        hashedPassword,
        fullName: "Demo Customer",
        locale: "tr-TR",
        isActive: true,
      },
    });

    // Create membership with ReadOnly role
    await tx.userTenantMembership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: TENANT_ROLES.READ_ONLY,
        status: "active",
      },
    });

    return { user };
  });

  console.log("✅ ReadOnly user created successfully!");
  console.log("");
  console.log("Login credentials:");
  console.log("  Email: customer@demo.local");
  console.log("  Password: customer123");
  console.log("");
  console.log("Tenant:", tenant.name);
  console.log("Role: ReadOnly (View-only access)");
  console.log("");
  console.log("📋 Permissions:");
  console.log("  ✅ View documents");
  console.log("  ✅ View invoices");
  console.log("  ✅ View clients");
  console.log("  ✅ View risk information");
  console.log("  ✅ View reports");
  console.log("  ✅ View users");
  console.log("  ✅ View integrations");
  console.log("");
  console.log("  ❌ Cannot create, edit, or delete anything");
}

createReadOnlyUser()
  .catch((e) => {
    console.error("❌ Error creating ReadOnly user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
