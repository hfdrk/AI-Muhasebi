// Browser-safe entry point for shared-utils
// This file exports everything except server-only llm-client functions
// CRITICAL: This file is used for client-side builds via webpack alias

// CRITICAL: Export llm-client function stubs FIRST to ensure they're available
// and not overridden by any export * statements below
export function createLLMClient(): never {
  throw new Error("createLLMClient is server-only and cannot be used in the browser");
}

export function hasRealAIProvider(): boolean {
  return false;
}

// Export all non-llm-client modules using export *
// These come after the function declarations to ensure they don't override them
export * from "./logging";
export * from "./validation";
export * from "./dates";
export * from "./errors";
export * from "./password";
export * from "./jwt";
export * from "./storage";

// Re-export llm-client types (safe - just types, no runtime code)
export type { LLMClient, LLMClientConfig } from "./llm-client/interface";
export type { OpenAIClient } from "./llm-client/openai-client";
export type { AnthropicClient } from "./llm-client/anthropic-client";
export type { MockLLMClient } from "./llm-client/mock-client";

// NOTE: hasRealAIProvider is already exported above as a function declaration
// No need to re-export as it's already hoisted and available




