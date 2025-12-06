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

// Helper to check if port is open
function checkPortOpen(port: number): boolean {
  try {
    execSync(`lsof -ti:${port}`, { stdio: "ignore" });
    return true;
  } catch {
    try {
      execSync(`nc -z localhost ${port}`, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}

// Helper to detect PostgreSQL container credentials
function detectPostgresCredentials(): { user: string; password: string } {
  // Check if port is open first
  if (!checkPortOpen(5432)) {
    return { user: "ai_muhasebi", password: "ai_muhasebi_dev" };
  }

  try {
    // Try to find postgres container by image name
    let containerName = "";
    try {
      const containers = execSync("docker ps --format '{{.Names}}|{{.Image}}'", { encoding: "utf-8", stdio: "pipe" });
      const lines = containers.trim().split("\n");
      for (const line of lines) {
        const [name, image] = line.split("|");
        if (image && image.toLowerCase().includes("postgres")) {
          containerName = name;
          break;
        }
      }
    } catch {
      // Fallback to old method
      try {
        const runningContainers = execSync("docker ps --format '{{.Names}}' | grep -i postgres", { encoding: "utf-8", stdio: "pipe" }).trim();
        if (runningContainers) {
          containerName = runningContainers.split("\n")[0];
        }
      } catch {
        // No container found
      }
    }
    
    if (containerName) {
      // Try to get environment variables from container
      try {
        const envVars = execSync(`docker exec ${containerName} env 2>/dev/null | grep POSTGRES`, { encoding: "utf-8", stdio: "pipe" });
        const userMatch = envVars.match(/POSTGRES_USER=(\w+)/);
        const passwordMatch = envVars.match(/POSTGRES_PASSWORD=([^\s]+)/);
        
        if (userMatch && passwordMatch) {
          return {
            user: userMatch[1],
            password: passwordMatch[1],
          };
        }
      } catch {
        // Fall through to testing connections
      }
      
      // Try to test connection via docker exec
      try {
        execSync(`docker exec ${containerName} pg_isready -U ai_muhasebi 2>/dev/null`, { stdio: "ignore" });
        return { user: "ai_muhasebi", password: "ai_muhasebi_dev" };
      } catch {
        try {
          execSync(`docker exec ${containerName} pg_isready -U postgres 2>/dev/null`, { stdio: "ignore" });
          return { user: "postgres", password: "postgres" };
        } catch {
          // Fall through to defaults
        }
      }
    }
  } catch {
    // Fall through to defaults
  }
  
  // Default credentials (will be tested and fallback to others if needed)
  return {
    user: "ai_muhasebi",
    password: "ai_muhasebi_dev",
  };
}

// Helper to test database connection with given credentials
async function testConnection(user: string, password: string): Promise<boolean> {
  try {
    const testUrl = `postgresql://${user}:${password}@localhost:5432/postgres`;
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient({
      datasources: { db: { url: testUrl } },
      log: [],
    });
    
    const connectionPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Connection timeout")), 5000)
    );
    
    await Promise.race([connectionPromise, timeoutPromise]);
    await prisma.$disconnect();
    return true;
  } catch {
    return false;
  }
}

// Try multiple credential combinations
async function findWorkingCredentials(): Promise<{ user: string; password: string }> {
  const detected = detectPostgresCredentials();
  
  // Try detected credentials first
  if (await testConnection(detected.user, detected.password)) {
    return detected;
  }
  
  // Try common credential combinations
  const commonCredentials = [
    { user: "postgres", password: "postgres" },
    { user: "postgres", password: "" },
    { user: "ai_muhasebi", password: "ai_muhasebi_dev" },
    { user: "postgres", password: "ai_muhasebi_dev" },
  ];
  
  for (const creds of commonCredentials) {
    if (await testConnection(creds.user, creds.password)) {
      return creds;
    }
  }
  
  // Return detected as fallback (will fail with better error message)
  return detected;
}

// Credentials will be resolved in main()
let credentials: { user: string; password: string } = { user: "ai_muhasebi", password: "ai_muhasebi_dev" };

async function main() {
  console.log("🔧 Setting up test database...");
  
  // Find working credentials first
  try {
    credentials = await findWorkingCredentials();
    console.log(`   Using credentials: ${credentials.user}@localhost:5432`);
  } catch (error) {
    console.error("❌ Failed to detect database credentials");
    console.error("   Please ensure PostgreSQL is running and accessible");
    process.exit(1);
  }
  
  const testDbUrl = process.env.DATABASE_URL_TEST || 
    `postgresql://${credentials.user}:${credentials.password}@localhost:5432/${TEST_DB_NAME}`;
  
  // CRITICAL: Set DATABASE_URL early so any Prisma clients created will use test database
  process.env.DATABASE_URL = testDbUrl;
  
  console.log(`   Database: ${TEST_DB_NAME}`);
  console.log(`   URL: ${testDbUrl.replace(/:[^:@]+@/, ":****@")}`); // Hide password

  try {
    // Update TEST_DB_URL for use in functions
    const adminUrl = testDbUrl.replace(`/${TEST_DB_NAME}`, "/postgres");
    
    // Create database
    const adminPrisma = new PrismaClient({
      datasources: { db: { url: adminUrl } },
    });
    
    try {
      const result = await adminPrisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = ${TEST_DB_NAME})
      `;
      
      if (!result[0]?.exists) {
        await adminPrisma.$executeRawUnsafe(`CREATE DATABASE ${TEST_DB_NAME}`);
        console.log(`✅ Created test database: ${TEST_DB_NAME}`);
      } else {
        console.log(`✅ Test database already exists: ${TEST_DB_NAME}`);
      }
    } finally {
      await adminPrisma.$disconnect();
    }
    
    // DATABASE_URL is already set above, but ensure it's still set for migrations
    process.env.DATABASE_URL = testDbUrl;
    
    try {
      console.log("🔄 Syncing Prisma schema to test database...");
      execSync(
        `npx prisma db push --skip-generate --accept-data-loss`,
        {
          cwd: BACKEND_API_DIR,
          stdio: "inherit",
          env: {
            ...process.env,
            DATABASE_URL: testDbUrl,
          },
        }
      );
      console.log("✅ Schema synced successfully");
    } catch (error) {
      // Error already logged above
      throw error;
    }
    
    // Verify schema
    const prisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    });
    
    try {
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
    } finally {
      await prisma.$disconnect();
    }
    
    console.log("\n✅ Test database setup complete!");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Test database setup failed!");
    if (error.message?.includes("Authentication failed") || error.message?.includes("password authentication failed")) {
      console.error("\n   Database authentication failed!");
      console.error("   Tried credentials:", credentials.user);
      console.error("   Please check your PostgreSQL credentials or set DATABASE_URL_TEST environment variable");
      console.error("   Example: DATABASE_URL_TEST=postgresql://user:password@localhost:5432/ai_muhasebi_test");
    } else if (error.message?.includes("Can't reach database server") || error.message?.includes("ECONNREFUSED")) {
      console.error("\n   Database server is not running!");
      console.error("   Please start PostgreSQL:");
      console.error("     brew services start postgresql@14");
      console.error("     or");
      console.error("     docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=ai_muhasebi_dev postgres:14");
    } else {
      console.error("   Error:", error.message);
    }
    process.exit(1);
  }
}

main();

