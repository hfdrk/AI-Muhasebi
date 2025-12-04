// Import env setup FIRST - this must run before any other imports
import "./env-setup.js";

import { beforeEach, afterEach } from "vitest";
import { resetTestDatabase, getTestPrisma } from "./test-db.js";

// Reset database before each test file
beforeEach(async () => {
  await resetTestDatabase();
});

// Cleanup after each test
afterEach(async () => {
  // Optional: Add any per-test cleanup here
});

// Make test Prisma available globally for tests
export const testPrisma = getTestPrisma();

