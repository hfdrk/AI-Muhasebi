import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { execSync, spawn } from "child_process";
import { join } from "path";
import { promisify } from "util";
// Import prisma at the top level so it's available synchronously
// This ensures getTestPrisma() can return it without async operations
import { prisma as mainPrisma } from "../lib/prisma.js";

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

// Get credentials - will be resolved on first use
let credentials: { user: string; password: string } | null = null;
let TEST_DB_URL: string | null = null;
let credentialsResolved = false;

async function resolveTestDatabaseUrl(): Promise<string> {
  if (TEST_DB_URL && credentialsResolved) {
    return TEST_DB_URL;
  }
  
  if (process.env.DATABASE_URL_TEST) {
    TEST_DB_URL = process.env.DATABASE_URL_TEST;
    credentialsResolved = true;
    return TEST_DB_URL;
  }
  
  // Find working credentials
  if (!credentials) {
    credentials = await findWorkingCredentials();
  }
  
  TEST_DB_URL = `postgresql://${credentials.user}:${credentials.password}@localhost:5432/${TEST_DB_NAME}`;
  credentialsResolved = true;
  return TEST_DB_URL;
}

// Synchronous version that uses cached URL or defaults
function getTestDatabaseUrlSync(): string {
  if (TEST_DB_URL) {
    return TEST_DB_URL;
  }
  
  if (process.env.DATABASE_URL_TEST) {
    TEST_DB_URL = process.env.DATABASE_URL_TEST;
    credentialsResolved = true;
    return TEST_DB_URL;
  }
  
  // Use default credentials (will be updated when async setup runs)
  const defaultCreds = detectPostgresCredentials();
  TEST_DB_URL = `postgresql://${defaultCreds.user}:${defaultCreds.password}@localhost:5432/${TEST_DB_NAME}`;
  return TEST_DB_URL;
}

/**
 * Get the Prisma client instance
 * Returns the main prisma instance from lib/prisma.ts
 * This ensures tests and app code use the same database connection
 * The prisma client uses getPrismaClient() which checks DATABASE_URL
 * and recreates the client if the URL changes
 * 
 * NOTE: This function is synchronous for use in test factories.
 * It returns the top-level imported prisma instance, which is a Proxy
 * that always calls getPrismaClient() to get the current client.
 */
export function getTestPrisma(): PrismaClient {
  return mainPrisma;
}

/**
 * Create test database if it doesn't exist
 */
export async function createTestDatabase(): Promise<void> {
  const dbUrl = await resolveTestDatabaseUrl();
  const adminUrl = dbUrl.replace(`/${TEST_DB_NAME}`, "/postgres");
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

  // Get test database URL
  const dbUrl = await resolveTestDatabaseUrl();
  
  // Set DATABASE_URL to test database for migration
  const originalDbUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = dbUrl;

  try {
    // Use main prisma instance - it will use the DATABASE_URL we just set
    // Import dynamically to avoid circular dependencies
    const { prisma } = await import("../lib/prisma.js");
    
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
            DATABASE_URL: dbUrl,
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
  // Ensure credentials are resolved and DATABASE_URL is set
  const dbUrl = await resolveTestDatabaseUrl();
  process.env.DATABASE_URL = dbUrl;
  
  // Force Prisma client to use the new DATABASE_URL by clearing the global cache
  // This ensures the client is recreated with the correct URL
  const globalForPrisma = globalThis as unknown as {
    prisma: any;
    prismaUrl: string | undefined;
  };
  
  // Clear cached client if URL changed
  if (globalForPrisma.prisma && globalForPrisma.prismaUrl !== dbUrl) {
    if (globalForPrisma.prisma) {
      await globalForPrisma.prisma.$disconnect().catch(() => {});
    }
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaUrl = undefined;
  }
  
  // Use main prisma instance - it will use the DATABASE_URL we just set
  // Import dynamically to avoid circular dependencies
  // After clearing the global cache above, getPrismaClient() will create a new client
  // when accessed through the Proxy
  const prismaModule = await import("../lib/prisma.js");
  const prisma = prismaModule.prisma;
  
  // The Proxy will call getPrismaClient() when we access prisma.$queryRaw
  // getPrismaClient() will create a new client if globalForPrisma.prisma is undefined
  // So we don't need to validate here - just use it and let the Proxy handle it

  // Get all table names
  let tables: Array<{ tablename: string }>;
  try {
    const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    
    // Ensure result is an array
    if (!Array.isArray(result)) {
      console.warn("⚠️ $queryRaw did not return an array, got:", typeof result, result);
      tables = [];
    } else {
      tables = result;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to query tables:", errorMessage);
    // If we can't query tables, try to continue with an empty list
    // This allows tests to proceed even if the query fails
    tables = [];
  }

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

  // Re-seed report definitions (they get truncated above)
  await seedReportDefinitions();

  console.log("✅ Test database reset");
}

/**
 * Seed report definitions for tests
 */
async function seedReportDefinitions(): Promise<void> {
  const prismaModule = await import("../lib/prisma.js");
  const prisma = prismaModule.prisma;
  
  const reportDefinitions = [
    {
      code: "COMPANY_FINANCIAL_SUMMARY",
      name: "Müşteri Finansal Özeti",
      description: "Seçili müşteri için belirli tarih aralığında satış, alış ve fatura özetleri.",
      isActive: true,
    },
    {
      code: "COMPANY_RISK_SUMMARY",
      name: "Müşteri Risk Özeti",
      description: "Seçili müşteri için risk skoru, seviyeleri ve uyarı özetleri.",
      isActive: true,
    },
    {
      code: "TENANT_PORTFOLIO",
      name: "Portföy Özeti",
      description: "Tüm müşteri portföyü için risk ve aktivite özeti.",
      isActive: true,
    },
    {
      code: "DOCUMENT_ACTIVITY",
      name: "Belge ve Fatura Aktivitesi",
      description: "Belge yüklemeleri, AI analizleri ve fatura durumları.",
      isActive: true,
    },
  ];

  for (const def of reportDefinitions) {
    try {
      await prisma.reportDefinition.upsert({
        where: { code: def.code },
        update: {
          name: def.name,
          description: def.description,
          isActive: def.isActive,
        },
        create: def,
      });
    } catch (error) {
      // Ignore errors during seeding (table might not exist yet)
      console.warn(`Warning: Could not seed report definition ${def.code}:`, error);
    }
  }
}

/**
 * Setup test database (create, migrate, reset)
 */
export async function setupTestDatabase(): Promise<void> {
  // Resolve credentials first so sync functions can use cached URL
  const dbUrl = await resolveTestDatabaseUrl();
  
  // CRITICAL: Set DATABASE_URL to test database URL so main prisma client uses test DB
  // This must happen before any routes/services that import prisma are loaded
  process.env.DATABASE_URL = dbUrl;
  
  // Update cached URL for sync function
  TEST_DB_URL = dbUrl;
  
  await createTestDatabase();
  await migrateTestDatabase();
  await resetTestDatabase();
}

/**
 * Teardown test database (disconnect Prisma)
 */
export async function teardownTestDatabase(): Promise<void> {
  // Disconnect the main prisma client
  // Import dynamically to avoid circular dependencies
  const { prisma } = await import("../lib/prisma.js");
  await prisma.$disconnect().catch(() => {
    // Ignore disconnect errors
  });
}

/**
 * Get test database URL (synchronous version for backward compatibility)
 * Note: For async credential resolution, use the internal async function
 */
export const getTestDatabaseUrl = (): string => {
  return getTestDatabaseUrlSync();
};

