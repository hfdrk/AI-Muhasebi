/**
 * Centralized test utilities module
 * 
 * This module re-exports all test utilities from individual modules
 * to provide a single import point for all test files.
 */

// Import env setup FIRST - must run before any routes/services that use config
import "./env-setup.js";

// Database utilities
export {
  getTestPrisma,
  createTestDatabase,
  migrateTestDatabase,
  resetTestDatabase,
  setupTestDatabase,
  teardownTestDatabase,
  getTestDatabaseUrl,
} from "./test-db.js";

// Authentication utilities
export {
  createTestUser,
  getAuthToken,
  createTestUserWithToken,
  type CreateTestUserOptions,
  type TestUserResult,
} from "./test-auth.js";

// Test data factories
export {
  createTestClientCompany,
  createTestInvoice,
  createTestInvoiceLine,
  createTestTransaction,
  createTestDocument,
  createTestRiskRule,
  type CreateClientCompanyData,
  type CreateInvoiceData,
  type CreateInvoiceLineData,
  type CreateTransactionData,
  type CreateDocumentData,
  type CreateRiskRuleData,
} from "./test-factories.js";

// Test server utilities
export { createTestApp } from "./test-server.js";

/**
 * Helper function to create a test tenant
 * This is a convenience wrapper around createTestUser which creates a tenant
 */
export async function createTestTenant(name?: string, slug?: string) {
  const { createTestUser } = await import("./test-auth.js");
  const result = await createTestUser({
    tenantName: name || `Test Tenant ${Date.now()}`,
    tenantSlug: slug || `test-tenant-${Date.now()}`,
  });
  return result.tenant;
}

/**
 * Helper function to authenticate a test user and get token
 * This is a convenience wrapper around createTestUserWithToken
 */
export async function authenticateTestUser(
  email: string,
  password: string,
  baseUrl: string = "http://localhost:3800"
) {
  const { getAuthToken } = await import("./test-auth.js");
  return await getAuthToken(email, password, baseUrl);
}

