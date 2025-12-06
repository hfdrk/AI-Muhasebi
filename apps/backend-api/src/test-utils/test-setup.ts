// Import env setup FIRST - this must run before any other imports
import "./env-setup.js";

import { beforeEach, afterEach } from "vitest";
import { resetTestDatabase } from "./test-db.js";
import { prisma } from "../lib/prisma.js";

// Reset database before each test file
beforeEach(async () => {
  await resetTestDatabase();
});

// Cleanup after each test
afterEach(async () => {
  // Optional: Add any per-test cleanup here
});

// Make Prisma available globally for tests (main instance)
export const testPrisma = prisma;

