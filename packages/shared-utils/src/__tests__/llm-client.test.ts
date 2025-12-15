import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hasRealAIProvider } from "../llm-client/factory";

describe("hasRealAIProvider", () => {
  let originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Store original env values
    originalEnv = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_ORG: process.env.OPENAI_ORG,
      OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
    };
  });

  afterEach(() => {
    // Restore original env values
    Object.keys(originalEnv).forEach((key) => {
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    });
  });

  it("should return false when OPENAI_API_KEY is not set", () => {
    // Ensure all AI provider env vars are not set
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_ORG;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;

    const result = hasRealAIProvider();

    expect(result).toBe(false);
  });

  it("should return true when OPENAI_API_KEY is set", () => {
    // Clear other env vars
    delete process.env.OPENAI_ORG;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
    // Set OPENAI_API_KEY to a test value
    process.env.OPENAI_API_KEY = "test-key-12345";

    const result = hasRealAIProvider();

    expect(result).toBe(true);
  });

  it("should return false when OPENAI_API_KEY is empty string", () => {
    // Clear other env vars
    delete process.env.OPENAI_ORG;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
    // Set OPENAI_API_KEY to empty string (should be treated as not set)
    process.env.OPENAI_API_KEY = "";

    const result = hasRealAIProvider();

    // Boolean("") is false, so this should return false
    expect(result).toBe(false);
  });

  it("hasRealAIProvider is a function", () => {
    expect(typeof hasRealAIProvider).toBe("function");
    expect(typeof hasRealAIProvider()).toBe("boolean");
  });

  it("should return true when OPENAI_ORG is set", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
    process.env.OPENAI_ORG = "org-123";

    const result = hasRealAIProvider();

    expect(result).toBe(true);
  });

  it("should return true when OPENAI_BASE_URL is set", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_ORG;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
    process.env.OPENAI_BASE_URL = "https://api.openai.com";

    const result = hasRealAIProvider();

    expect(result).toBe(true);
  });

  it("should return true when ANTHROPIC_API_KEY is set", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_ORG;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.ANTHROPIC_BASE_URL;
    process.env.ANTHROPIC_API_KEY = "test-key";

    const result = hasRealAIProvider();

    expect(result).toBe(true);
  });

  it("should return true when ANTHROPIC_BASE_URL is set", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_ORG;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_BASE_URL = "https://api.anthropic.com";

    const result = hasRealAIProvider();

    expect(result).toBe(true);
  });
});



