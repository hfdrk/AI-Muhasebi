// This file MUST be imported before any routes or services that use config
// Set environment variables for tests
// CRITICAL: Vitest sets NODE_ENV to "test" which is invalid for our config schema
// We MUST override it to "development" before any config is loaded
// Force override - delete first to ensure it's reset, then set
delete process.env.NODE_ENV;
process.env.NODE_ENV = "development";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only-min-32-chars";
}

// Set EMAIL_TRANSPORT to stub for tests (unless explicitly set)
if (!process.env.EMAIL_TRANSPORT) {
  process.env.EMAIL_TRANSPORT = "stub";
}

// CRITICAL: Set DATABASE_URL to test database URL BEFORE any Prisma clients are created
// This ensures the main prisma client in lib/prisma.ts uses the test database
// The actual URL will be resolved properly in global-setup.ts, but we need a default here
if (process.env.VITEST || !process.env.DATABASE_URL || (!process.env.DATABASE_URL.includes("_test") && !process.env.DATABASE_URL.includes("ai_muhasebi"))) {
  // Use test database URL - will be updated by setupTestDatabase() in global-setup.ts
  // Default credentials match Docker container (postgres:ai_muhasebi_dev)
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 
    process.env.TEST_DATABASE_URL || 
    "postgresql://postgres:ai_muhasebi_dev@localhost:5432/ai_muhasebi_test";
}

