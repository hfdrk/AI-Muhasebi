/**
 * Database URL resolver for main application database
 * This ensures DATABASE_URL is set correctly before Prisma client initialization
 */

import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { logger } from "@repo/shared-utils";

const MAIN_DB_NAME = "ai_muhasebi";

function checkPortOpen(port: number): boolean {
  try {
    execSync(`lsof -i :${port} 2>/dev/null`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function detectPostgresCredentials(): { user: string; password: string } | null {
  // Check if port is open first
  if (!checkPortOpen(5432)) {
    return null;
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
        // Fall through
      }
    }
  } catch {
    // Fall through
  }

  // No credentials detected - caller must handle null
  return null;
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

// Try to find working credentials from Docker container detection
async function findWorkingCredentials(): Promise<{ user: string; password: string }> {
  const detected = detectPostgresCredentials();

  if (detected) {
    // Try detected credentials from Docker container
    if (await testConnection(detected.user, detected.password)) {
      return detected;
    }
  }

  // No hardcoded fallback credentials - DATABASE_URL must be set via environment
  throw new Error(
    "Could not detect database credentials automatically. " +
    "Please set the DATABASE_URL environment variable in your .env file."
  );
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
          logger.info(`Created main database: ${MAIN_DB_NAME}`);
        }
      } finally {
        await adminPrisma.$disconnect();
      }
    } catch (error: any) {
      // If we can't create the database, continue anyway - it might already exist
      // or the user might need to create it manually
      logger.warn(`Warning: Could not verify/create database ${MAIN_DB_NAME}:`, { error: error.message });
    }
    
    resolvedUrl = `postgresql://${credentials.user}:${credentials.password}@localhost:5432/${MAIN_DB_NAME}`;
    
    // Set it in environment for Prisma (this will be used for new connections)
    process.env.DATABASE_URL = resolvedUrl;
    
    // Try to run migrations to ensure schema is up to date
    try {
      // Get backend-api directory - use CommonJS approach since we're compiling to CommonJS
      let backendApiDir: string;
      // Use __dirname for CommonJS (available after compilation)
      if (typeof __dirname !== "undefined") {
        // We're in dist/lib, so go up to dist, then to apps/backend-api
        backendApiDir = path.resolve(__dirname, "../../");
      } else {
        // Fallback to process.cwd()
        backendApiDir = path.resolve(process.cwd(), "apps/backend-api");
        // If that doesn't work, try relative to current working directory
        const fs = await import("fs");
        if (!fs.existsSync(path.join(backendApiDir, "prisma"))) {
          backendApiDir = process.cwd().includes("backend-api") 
            ? process.cwd() 
            : path.resolve(process.cwd(), "apps/backend-api");
        }
      }
      
      logger.info("Syncing database schema...");
      execSync("npx prisma db push --skip-generate --accept-data-loss", {
        cwd: backendApiDir,
        stdio: "pipe", // Use pipe to avoid cluttering output
        env: {
          ...process.env,
          DATABASE_URL: resolvedUrl,
        },
      });
      logger.info("Database schema synced");
    } catch (migrationError: any) {
      // Migration errors are non-fatal - database might already be up to date
      logger.warn("Could not sync database schema (this is usually OK if schema is already up to date)");
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
  if (resolvedUrl) {
    return resolvedUrl;
  }

  // If DATABASE_URL is explicitly set (and not an unresolved template), use it
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("${")) {
    resolvedUrl = process.env.DATABASE_URL;
    return resolvedUrl;
  }

  // Try to detect credentials from a running Docker container
  const detected = detectPostgresCredentials();
  if (detected) {
    resolvedUrl = `postgresql://${detected.user}:${detected.password}@localhost:5432/${MAIN_DB_NAME}`;
    process.env.DATABASE_URL = resolvedUrl;
    logger.info(`Using detected database credentials: ${detected.user}@localhost:5432/${MAIN_DB_NAME}`);
    return resolvedUrl;
  }

  // No DATABASE_URL set and no credentials detected - fail with clear error
  throw new Error(
    "DATABASE_URL environment variable is not set and no database credentials could be detected. " +
    "Please set DATABASE_URL in your .env file or ensure a PostgreSQL Docker container is running."
  );
}

