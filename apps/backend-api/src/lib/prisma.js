"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
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
    }
    catch (error) {
        // If URL resolution fails, use fallback (postgres:ai_muhasebi_dev matches container)
        if (!process.env.DATABASE_URL) {
            process.env.DATABASE_URL = `postgresql://postgres:ai_muhasebi_dev@localhost:5432/ai_muhasebi`;
            console.warn("Using fallback DATABASE_URL: postgres@localhost:5432/ai_muhasebi");
        }
    }
}
const globalForPrisma = globalThis;
function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:ai_muhasebi_dev@localhost:5432/ai_muhasebi";
    console.log(`📦 Creating Prisma client with database: ${dbUrl.replace(/:[^:@]+@/, ":****@")}`);
    try {
        const client = new client_1.PrismaClient({
            log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
        });
        // Verify the client has the expected methods
        if (!client || typeof client.$queryRaw !== "function") {
            throw new Error("Created PrismaClient does not have $queryRaw method");
        }
        return client;
    }
    catch (error) {
        console.error("Failed to create Prisma client:", error.message);
        throw error; // Don't swallow the error - we need to know if client creation fails
    }
}
/**
 * Get or create Prisma client instance
 * Lazy initialization: client is created on first access
 * URL-aware: if DATABASE_URL changes, client is recreated
 */
function getPrismaClient() {
    const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:ai_muhasebi_dev@localhost:5432/ai_muhasebi";
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
            if (!globalForPrisma.prisma || typeof globalForPrisma.prisma.$queryRaw !== "function") {
                throw new Error(`Created PrismaClient is invalid. ` +
                    `Has $queryRaw: ${typeof globalForPrisma.prisma?.$queryRaw}`);
            }
        }
        catch (error) {
            console.error("Error creating Prisma client:", error);
            throw new Error(`Failed to create Prisma client: ${error.message}. ` +
                `DATABASE_URL: ${dbUrl.replace(/:[^:@]+@/, ":****@")}`);
        }
    }
    return globalForPrisma.prisma;
}
// Export lazy Prisma client - created on first access
// Use a Proxy to ensure we always get the current client
// The Proxy forwards all property access to getPrismaClient(), which checks DATABASE_URL
// and recreates the client if needed
exports.prisma = new Proxy({}, {
    get(_target, prop) {
        const client = getPrismaClient();
        if (!client) {
            throw new Error("getPrismaClient() returned undefined");
        }
        // Use direct property access - Prisma methods are already bound to the client instance
        return client[prop];
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
});
if (process.env.NODE_ENV !== "production") {
    // Store in global for reuse (will be created lazily)
    // Don't create here - let it be created on first access
}
//# sourceMappingURL=prisma.js.map