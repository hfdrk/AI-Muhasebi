#!/usr/bin/env tsx

/**
 * Test Database Setup Script
 * 
 * This script sets up the test database before running tests:
 * 1. Creates the test database if it doesn't exist
 * 2. Runs Prisma migrations to ensure schema is up to date
 * 3. Verifies the schema is correctly applied
 * 
 * Usage:
 *   tsx scripts/test-db-setup.ts
 * 
 * Environment Variables:
 *   DATABASE_URL_TEST - Test database connection string (optional, has default)
 */

import { execSync } from "child_process";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

// Determine backend-api directory
// Script is at apps/backend-api/scripts/test-db-setup.ts
// When run from root: process.cwd() is root, need apps/backend-api
// When run from apps/backend-api: process.cwd() is apps/backend-api, use it
function getBackendApiDir(): string {
  const cwd = process.cwd();
  
  // Check if prisma directory exists in current directory
  try {
    const fs = require("fs");
    if (fs.existsSync(join(cwd, "prisma/schema.prisma"))) {
      return cwd; // We're already in backend-api
    }
  } catch {
    // Fall through
  }
  
  // Check if we're in apps/backend-api by path
  if (cwd.includes("apps/backend-api") || cwd.includes("apps\\backend-api")) {
    // Find the apps/backend-api part
    const parts = cwd.split(/[/\\]/);
    const backendApiIndex = parts.findIndex((p, i) => 
      p === "apps" && parts[i + 1] === "backend-api"
    );
    if (backendApiIndex >= 0) {
      return join(...parts.slice(0, backendApiIndex + 2));
    }
  }
  
  // Otherwise, assume we're in root and need to go to apps/backend-api
  return join(cwd, "apps/backend-api");
}

const BACKEND_API_DIR = getBackendApiDir();

const TEST_DB_NAME = "ai_muhasebi_test";

// Helper to detect PostgreSQL container credentials
function detectPostgresCredentials(): { user: string; password: string } {
  try {
    const runningContainers = execSync("docker ps --format '{{.Names}}' | grep -i postgres", { encoding: "utf-8", stdio: "pipe" }).trim();
    if (runningContainers) {
      const containerName = runningContainers.split("\n")[0];
      try {
        const envVars = execSync(`docker exec ${containerName} env | grep POSTGRES`, { encoding: "utf-8", stdio: "pipe" });
        const userMatch = envVars.match(/POSTGRES_USER=(\w+)/);
        const passwordMatch = envVars.match(/POSTGRES_PASSWORD=([^\s]+)/);
        
        if (userMatch && passwordMatch) {
          return {
            user: userMatch[1],
            password: passwordMatch[1],
          };
        }
      } catch {
        // Fall through to defaults
      }
    }
  } catch {
    // Fall through to defaults
  }
  
  // Default credentials
  return {
    user: "ai_muhasebi",
    password: "ai_muhasebi_dev",
  };
}

const credentials = detectPostgresCredentials();
const TEST_DB_URL = process.env.DATABASE_URL_TEST || 
  `postgresql://${credentials.user}:${credentials.password}@localhost:5432/${TEST_DB_NAME}`;

async function createTestDatabaseIfNotExists(): Promise<void> {
  const adminUrl = TEST_DB_URL.replace(`/${TEST_DB_NAME}`, "/postgres");
  const adminPrisma = new PrismaClient({
    datasources: {
      db: {
        url: adminUrl,
      },
    },
  });

  try {
    // Check if database exists
    const result = await adminPrisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = ${TEST_DB_NAME})
    `;

    if (!result[0]?.exists) {
      // Create database
      await adminPrisma.$executeRawUnsafe(`CREATE DATABASE ${TEST_DB_NAME}`);
      console.log(`✅ Created test database: ${TEST_DB_NAME}`);
    } else {
      console.log(`✅ Test database already exists: ${TEST_DB_NAME}`);
    }
  } catch (error: any) {
    console.error("❌ Failed to create test database");
    if (error.message?.includes("Can't reach database server") || error.message?.includes("ECONNREFUSED")) {
      console.error("\n   Database server is not running!");
      console.error("   Please start PostgreSQL:");
      console.error("     brew services start postgresql@14");
      console.error("     or");
      console.error("     docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=ai_muhasebi_dev postgres:14");
    } else {
      console.error("   Error:", error.message);
    }
    throw error;
  } finally {
    await adminPrisma.$disconnect();
  }
}

async function runMigrations(): Promise<void> {
  // Use the backend-api directory where this script is located
  const prismaSchemaPath = join(BACKEND_API_DIR, "prisma/schema.prisma");
  
  // Set DATABASE_URL to test database for migration
  const originalDbUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = TEST_DB_URL;

  try {
    console.log("🔄 Syncing Prisma schema to test database...");
    
    // For test databases, use db push instead of migrate deploy
    // This ensures the schema matches exactly without migration dependencies
    // db push creates all tables from the schema.prisma file directly
    execSync(
      `npx prisma db push --skip-generate --accept-data-loss`,
      {
        cwd: BACKEND_API_DIR,
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL: TEST_DB_URL,
        },
      }
    );

    console.log("✅ Schema synced successfully");
  } catch (error) {
    console.error("❌ Failed to sync schema:", error);
    throw error;
  } finally {
    // Restore original DATABASE_URL
    if (originalDbUrl) {
      process.env.DATABASE_URL = originalDbUrl;
    }
  }
}

async function verifySchema(): Promise<void> {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: TEST_DB_URL,
      },
    },
  });

  try {
    // Check for key tables to verify schema is applied
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;

    const requiredTables = ["users", "tenants", "user_tenant_memberships"];
    const tableNames = tables.map((t) => t.tablename);

    for (const requiredTable of requiredTables) {
      if (!tableNames.includes(requiredTable)) {
        throw new Error(`Required table '${requiredTable}' not found in test database`);
      }
    }

    console.log(`✅ Schema verified: ${tables.length} tables found`);
  } catch (error) {
    console.error("❌ Schema verification failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("🔧 Setting up test database...");
  console.log(`   Database: ${TEST_DB_NAME}`);
  console.log(`   URL: ${TEST_DB_URL.replace(/:[^:@]+@/, ":****@")}`); // Hide password

  try {
    await createTestDatabaseIfNotExists();
    await runMigrations();
    await verifySchema();
    
    console.log("\n✅ Test database setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test database setup failed!");
    console.error(error);
    process.exit(1);
  }
}

main();

