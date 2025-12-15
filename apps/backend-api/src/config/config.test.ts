/**
 * Config Module Tests
 * 
 * Tests for environment configuration validation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getConfig, validateEnv, clearConfigCache } from "@repo/config";

describe("Config Module", () => {
  beforeEach(() => {
    // Clear config cache before each test
    clearConfigCache();
    // Reset environment
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    delete process.env.LOG_LEVEL;
    delete process.env.WORKER_CONCURRENCY;
  });

  it("should throw error when DATABASE_URL is missing", () => {
    process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";
    
    expect(() => {
      validateEnv();
    }).toThrow(/DATABASE_URL.*required/i);
  });

  it("should throw error when JWT_SECRET is too short", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.JWT_SECRET = "short";
    
    expect(() => {
      validateEnv();
    }).toThrow("JWT_SECRET must be at least 32 characters");
  });

  it("should return valid config with required env vars", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";
    
    const config = getConfig();
    
    expect(config.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/db");
    expect(config.JWT_SECRET).toBe("test-jwt-secret-minimum-32-characters-long");
    expect(config.NODE_ENV).toBe("development");
  });

  it("should use default LOG_LEVEL when not provided", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";
    
    const config = getConfig();
    
    expect(config.LOG_LEVEL).toBe("info");
  });

  it("should validate LOG_LEVEL enum", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";
    process.env.LOG_LEVEL = "invalid";
    
    expect(() => {
      getConfig();
    }).toThrow();
  });

  it("should parse WORKER_CONCURRENCY as number", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";
    process.env.WORKER_CONCURRENCY = "10";
    
    const config = getConfig();
    
    expect(config.WORKER_CONCURRENCY).toBe(10);
    expect(typeof config.WORKER_CONCURRENCY).toBe("number");
  });

  it("should use default WORKER_CONCURRENCY when not provided", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";
    
    const config = getConfig();
    
    expect(config.WORKER_CONCURRENCY).toBe(5);
  });

  it("should validate WORKER_CONCURRENCY range", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";
    process.env.WORKER_CONCURRENCY = "200"; // Exceeds max of 100
    
    expect(() => {
      getConfig();
    }).toThrow();
  });

  it("should use default NEXT_PUBLIC_API_BASE_URL when not provided", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";
    
    const config = getConfig();
    
    expect(config.NEXT_PUBLIC_API_BASE_URL).toBe("http://localhost:3800");
  });

  it("should validate EMAIL_TRANSPORT enum", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";
    process.env.EMAIL_TRANSPORT = "invalid";
    
    expect(() => {
      getConfig();
    }).toThrow();
    
    // Clean up
    delete process.env.EMAIL_TRANSPORT;
  });

  it("should use default EMAIL_TRANSPORT when not provided", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";
    delete process.env.EMAIL_TRANSPORT;
    
    const config = getConfig();
    
    expect(config.EMAIL_TRANSPORT).toBe("stub");
  });
});





