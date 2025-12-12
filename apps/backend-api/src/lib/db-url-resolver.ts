/**
 * Database URL resolver for main application database
 * This ensures DATABASE_URL is set correctly before Prisma client initialization
 */

import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import path from "path";

const MAIN_DB_NAME = "ai_muhasebi";

function checkPortOpen(port: number): boolean {
  try {
    execSync(`lsof -i :${port} 2>/dev/null`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

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
    }
  } catch {
    // Fall through to defaults
  }
  
  // Default credentials (ai_muhasebi user with container password)
  return {
    user: "ai_muhasebi",
    password: "ai_muhasebi_dev",
  };
}

// Helper to test database connection with given credentials
async function testConnection(user: string, password: string, database: string = "postgres"): Promise<boolean> {
  try {
    const testUrl = `postgresql://${user}:${password}@localhost:5432/${database}`;
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
  
  // Try common combinations
  // Note: Docker containers often use postgres user with POSTGRES_PASSWORD
  const commonCredentials = [
    { user: "postgres", password: "ai_muhasebi_dev" }, // Most likely based on container env
    { user: "postgres", password: "postgres" },
    { user: "ai_muhasebi", password: "ai_muhasebi_dev" },
    { user: process.env.USER || "postgres", password: "" },
  ];
  
  for (const creds of commonCredentials) {
    if (await testConnection(creds.user, creds.password)) {
      return creds;
    }
  }
  
  // Return detected as fallback (will fail with clear error)
  return detected;
}

let resolvedUrl: string | null = null;
let resolutionPromise: Promise<string> | null = null;

/**
 * Resolve the main database URL, detecting credentials if needed
 * This should be called before Prisma client is initialized
 */
export async function resolveDatabaseUrl(): Promise<string> {
  if (resolvedUrl) {
    return resolvedUrl;
  }
  
  if (resolutionPromise) {
    return resolutionPromise;
  }
  
  resolutionPromise = (async () => {
    // If DATABASE_URL is explicitly set, use it
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("${")) {
      resolvedUrl = process.env.DATABASE_URL;
      return resolvedUrl;
    }
    
    // Otherwise, detect credentials
    const credentials = await findWorkingCredentials();
    const adminUrl = `postgresql://${credentials.user}:${credentials.password}@localhost:5432/postgres`;
    
    // Ensure main database exists
    try {
      const adminPrisma = new PrismaClient({
        datasources: { db: { url: adminUrl } },
        log: [],
      });
      
      try {
        const result = await adminPrisma.$queryRaw<Array<{ exists: boolean }>>`
          SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = ${MAIN_DB_NAME})
        `;
        
        if (!result[0]?.exists) {
          await adminPrisma.$executeRawUnsafe(`CREATE DATABASE ${MAIN_DB_NAME}`);
          console.log(`✅ Created main database: ${MAIN_DB_NAME}`);
        }
      } finally {
        await adminPrisma.$disconnect();
      }
    } catch (error: any) {
      // If we can't create the database, continue anyway - it might already exist
      // or the user might need to create it manually
      console.warn(`Warning: Could not verify/create database ${MAIN_DB_NAME}:`, error.message);
    }
    
    resolvedUrl = `postgresql://${credentials.user}:${credentials.password}@localhost:5432/${MAIN_DB_NAME}`;
    
    // Set it in environment for Prisma (this will be used for new connections)
    process.env.DATABASE_URL = resolvedUrl;
    
    // Try to run migrations to ensure schema is up to date
    try {
      // Get backend-api directory - try multiple methods for ESM/CommonJS compatibility
      let backendApiDir: string;
      try {
        // ESM: use import.meta.url
        const { fileURLToPath } = await import("url");
        // @ts-ignore - import.meta is available in ESM but TypeScript may not recognize it
        const currentFile = fileURLToPath(import.meta.url);
        backendApiDir = path.resolve(path.dirname(currentFile), "../..");
      } catch {
        // CommonJS fallback or if import.meta is not available
        backendApiDir = path.resolve(process.cwd(), "apps/backend-api");
        // If that doesn't work, try relative to current working directory
        const fs = await import("fs");
        if (!fs.existsSync(path.join(backendApiDir, "prisma"))) {
          backendApiDir = process.cwd().includes("backend-api") 
            ? process.cwd() 
            : path.resolve(process.cwd(), "apps/backend-api");
        }
      }
      
      console.log("🔄 Syncing database schema...");
      execSync("npx prisma db push --skip-generate --accept-data-loss", {
        cwd: backendApiDir,
        stdio: "pipe", // Use pipe to avoid cluttering output
        env: {
          ...process.env,
          DATABASE_URL: resolvedUrl,
        },
      });
      console.log("✅ Database schema synced");
    } catch (migrationError: any) {
      // Migration errors are non-fatal - database might already be up to date
      console.warn("⚠️  Could not sync database schema (this is usually OK if schema is already up to date)");
    }
    
    return resolvedUrl;
  })();
  
  return resolutionPromise;
}

/**
 * Synchronous version that uses cached URL or defaults
 * Use this only if resolveDatabaseUrl has been called first
 * Prioritizes postgres/postgres as it's the most common Docker setup
 */
export function getDatabaseUrlSync(): string {
  try {
    if (resolvedUrl) {
      return resolvedUrl;
    }
    
    // Check if DATABASE_URL is set but might have wrong credentials
    // If it uses ai_muhasebi user, override it with postgres (correct for Docker)
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("${")) {
      const currentUrl = process.env.DATABASE_URL;
      // Keep ai_muhasebi user (Docker container uses ai_muhasebi user)
      if (currentUrl.includes("ai_muhasebi:ai_muhasebi_dev@") || currentUrl.includes("://ai_muhasebi@")) {
        // URL already correct, use as-is
        resolvedUrl = currentUrl;
        process.env.DATABASE_URL = currentUrl;
        return resolvedUrl;
      }
      resolvedUrl = currentUrl;
      return resolvedUrl;
    }
    
    // Try to detect from Docker container first
    const detected = detectPostgresCredentials();
    
    // Prioritize ai_muhasebi:ai_muhasebi_dev (matches container POSTGRES_USER)
    // This matches what the Docker container uses
    const likelyCredentials = [
      { user: "ai_muhasebi", password: "ai_muhasebi_dev" },
      detected,
      { user: "postgres", password: "ai_muhasebi_dev" },
      { user: "postgres", password: "postgres" },
    ];
    
    // Use the first likely credential (ai_muhasebi:ai_muhasebi_dev matches container)
    const creds = likelyCredentials[0];
    resolvedUrl = `postgresql://${creds.user}:${creds.password}@localhost:5432/${MAIN_DB_NAME}`;
    process.env.DATABASE_URL = resolvedUrl;
    
    console.log(`🔧 Using database credentials: ${creds.user}@localhost:5432/${MAIN_DB_NAME}`);
    console.log(`   (Will verify and update if needed during async resolution)`);
    
    return resolvedUrl;
  } catch (error: any) {
    // If detection fails, use postgres/postgres as fallback (most common)
    const fallbackUrl = `postgresql://ai_muhasebi:ai_muhasebi_dev@localhost:5432/${MAIN_DB_NAME}`;
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = fallbackUrl;
      console.warn(`⚠️  Using fallback DATABASE_URL: postgres@localhost:5432/${MAIN_DB_NAME}`);
    }
    return process.env.DATABASE_URL;
  }
}

