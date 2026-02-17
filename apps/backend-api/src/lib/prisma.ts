import { PrismaClient } from "@prisma/client";
import { logger } from "@repo/shared-utils";

// Check if we're in test mode BEFORE resolving database URL
// In test mode, DATABASE_URL should be set by env-setup.ts or test-db.ts
const isTestMode = process.env.VITEST || 
                   process.env.NODE_ENV === "test" ||
                   (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("_test"));

// Only resolve main database URL if not in test mode
if (!isTestMode && (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("${"))) {
  try {
    const { getDatabaseUrlSync } = require("./db-url-resolver");
    getDatabaseUrlSync();
  } catch (error: any) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL environment variable is not set and automatic resolution failed. " +
        "Please set DATABASE_URL in your .env file or environment. " +
        `Resolution error: ${error.message}`
      );
    }
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl: string | undefined;
};

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set. Cannot create Prisma client.");
  }
  const dbUrl = process.env.DATABASE_URL;
  logger.info(`Creating Prisma client with database: ${dbUrl.replace(/:[^:@]+@/, ":****@")}`);
  
  try {
    // Connection pool configuration for production
    const connectionLimit = process.env.DATABASE_POOL_SIZE 
      ? parseInt(process.env.DATABASE_POOL_SIZE, 10) 
      : process.env.NODE_ENV === "production" ? 10 : 5;
    
    const client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      datasources: {
        db: {
          url: dbUrl + (dbUrl.includes("?") ? "&" : "?") + 
            `connection_limit=${connectionLimit}&pool_timeout=20`,
        },
      },
    });
    
    // Verify the client has the expected methods
    if (!client || typeof (client as any).$queryRaw !== "function") {
      throw new Error("Created PrismaClient does not have $queryRaw method");
    }
    
    return client;
  } catch (error: any) {
    logger.error("Failed to create Prisma client:", { error: error.message });
    throw error; // Don't swallow the error - we need to know if client creation fails
  }
}

/**
 * Get or create Prisma client instance
 * Lazy initialization: client is created on first access
 * URL-aware: if DATABASE_URL changes, client is recreated
 */
function getPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set. Cannot initialize Prisma client.");
  }
  const dbUrl = process.env.DATABASE_URL;
  
  // Check if URL has changed - if so, recreate client
  if (globalForPrisma.prisma && globalForPrisma.prismaUrl !== dbUrl) {
    // URL changed, disconnect old client and create new one
    if (globalForPrisma.prisma) {
      globalForPrisma.prisma.$disconnect().catch(() => {
        // Ignore disconnect errors
      });
    }
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaUrl = undefined;
  }
  
  // Create client if it doesn't exist
  if (!globalForPrisma.prisma) {
    try {
      globalForPrisma.prisma = createPrismaClient();
      globalForPrisma.prismaUrl = dbUrl;
      
      // Verify the client was created correctly
      if (!globalForPrisma.prisma || typeof (globalForPrisma.prisma as any).$queryRaw !== "function") {
        throw new Error(
          `Created PrismaClient is invalid. ` +
          `Has $queryRaw: ${typeof (globalForPrisma.prisma as any)?.$queryRaw}`
        );
      }
    } catch (error: any) {
      logger.error("Error creating Prisma client:", { error });
      throw new Error(
        `Failed to create Prisma client: ${error.message}. ` +
        `DATABASE_URL: ${dbUrl.replace(/:[^:@]+@/, ":****@")}`
      );
    }
  }
  
  return globalForPrisma.prisma;
}

// Export lazy Prisma client - created on first access
// Use a Proxy to ensure we always get the current client
// The Proxy forwards all property access to getPrismaClient(), which checks DATABASE_URL
// and recreates the client if needed
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    if (!client) {
      throw new Error("getPrismaClient() returned undefined");
    }
    
    // Use direct property access - Prisma methods are already bound to the client instance
    const value = (client as any)[prop];
    
    // If the property is undefined, it might be a model that doesn't exist
    // This can happen if Prisma client wasn't regenerated after schema changes
    if (value === undefined && typeof prop === 'string' && prop[0] === prop[0].toLowerCase()) {
      // It's likely a model name (camelCase), log a warning
      logger.warn(`Prisma model '${prop}' is undefined. Make sure Prisma client is regenerated.`);
    }
    
    return value;
  },
  has(_target, prop) {
    return prop in getPrismaClient();
  },
  ownKeys(_target) {
    return Reflect.ownKeys(getPrismaClient());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getPrismaClient(), prop);
  },
  set(_target, prop, value) {
    return Reflect.set(getPrismaClient(), prop, value, getPrismaClient());
  },
}) as PrismaClient;

if (process.env.NODE_ENV !== "production") {
  // Store in global for reuse (will be created lazily)
  // Don't create here - let it be created on first access
}

