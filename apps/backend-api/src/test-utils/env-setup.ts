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

