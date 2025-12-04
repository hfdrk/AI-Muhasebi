import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { execSync, spawn } from "child_process";
import { join } from "path";
import { promisify } from "util";

const TEST_DB_NAME = "ai_muhasebi_test";
const TEST_DB_URL = process.env.DATABASE_URL_TEST || 
  `postgresql://ai_muhasebi:ai_muhasebi_dev@localhost:5432/${TEST_DB_NAME}`;

let testPrisma: PrismaClient | null = null;

/**
 * Get a Prisma client connected to the test database
 */
export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DB_URL,
        },
      },
    });
  }
  return testPrisma;
}

/**
 * Create test database if it doesn't exist
 */
export async function createTestDatabase(): Promise<void> {
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
    }
  } finally {
    await adminPrisma.$disconnect();
  }
}

/**
 * Run migrations on test database
 * For test databases, we use db push instead of migrate deploy
 * This avoids migration state issues and ensures schema matches exactly
 */
export async function migrateTestDatabase(): Promise<void> {
  const { execSync } = await import("child_process");

  // Set DATABASE_URL to test database for migration
  const originalDbUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = TEST_DB_URL;

  try {
    const prisma = getTestPrisma();
    
    // For test databases, clear any failed migrations first
    // This prevents P3009 errors when using db push
    try {
      await prisma.$executeRawUnsafe(`
        DELETE FROM "_prisma_migrations" 
        WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL
      `);
    } catch {
      // Migration table might not exist yet, that's okay
    }
    
    // Check if database already has schema by checking for a common table
    try {
      await prisma.$queryRaw`SELECT 1 FROM "users" LIMIT 1`;
      console.log("✅ Test database schema already exists, skipping schema sync");
      return;
    } catch {
      // Table doesn't exist, need to sync schema
    }

    // For test databases, use db push instead of migrate deploy
    // This ensures schema matches exactly without migration dependencies
    console.log("🔄 Syncing Prisma schema to test database...");
    
    // Determine backend-api directory
    const cwd = process.cwd();
    let backendApiDir: string;
    
    // Check if we're in apps/backend-api
    if (cwd.includes("apps/backend-api") || cwd.includes("apps\\backend-api")) {
      const parts = cwd.split(/[/\\]/);
      const backendApiIndex = parts.findIndex((p, i) => 
        p === "apps" && parts[i + 1] === "backend-api"
      );
      if (backendApiIndex >= 0) {
        backendApiDir = join(...parts.slice(0, backendApiIndex + 2));
      } else {
        backendApiDir = cwd;
      }
    } else {
      // Assume we're in root
      backendApiDir = join(cwd, "apps/backend-api");
    }
    
    try {
      execSync(
        "npx prisma db push --skip-generate --accept-data-loss",
        {
          cwd: backendApiDir,
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
    }
  } catch (error: unknown) {
    // Log error and fail - schema sync is critical
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Could not sync schema:", errorMessage);
    throw error;
  } finally {
    // Restore original DATABASE_URL
    if (originalDbUrl) {
      process.env.DATABASE_URL = originalDbUrl;
    }
  }
}

/**
 * Reset test database (drop all data, keep schema)
 */
export async function resetTestDatabase(): Promise<void> {
  const prisma = getTestPrisma();

  // Get all table names
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  // Disable foreign key checks temporarily
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica'`);

  // Truncate all tables
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table.tablename}" CASCADE`);
    } catch (error) {
      // Ignore errors for tables that don't exist or can't be truncated
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Could not truncate ${table.tablename}:`, errorMessage);
    }
  }

  // Re-enable foreign key checks
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin'`);

  console.log("✅ Test database reset");
}

/**
 * Setup test database (create, migrate, reset)
 */
export async function setupTestDatabase(): Promise<void> {
  await createTestDatabase();
  await migrateTestDatabase();
  await resetTestDatabase();
}

/**
 * Teardown test database (disconnect Prisma)
 */
export async function teardownTestDatabase(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}

/**
 * Get test database URL
 */
export function getTestDatabaseUrl(): string {
  return TEST_DB_URL;
}

