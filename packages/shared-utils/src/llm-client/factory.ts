import type { LLMClient } from "./interface";
import { OpenAIClient } from "./openai-client";
import { AnthropicClient } from "./anthropic-client";
import { MockLLMClient } from "./mock-client";

/**
 * Create an LLM client based on environment variables
 * 
 * Priority:
 * 1. OpenAI if OPENAI_API_KEY is set
 * 2. Anthropic if ANTHROPIC_API_KEY is set
 * 3. Mock client if neither is set
 * 
 * @returns LLMClient instance
 */
export function createLLMClient(): LLMClient {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (openaiKey) {
    return new OpenAIClient({
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      maxTokens: process.env.OPENAI_MAX_TOKENS ? parseInt(process.env.OPENAI_MAX_TOKENS, 10) : 2000,
      temperature: process.env.OPENAI_TEMPERATURE ? parseFloat(process.env.OPENAI_TEMPERATURE) : 0.7,
    });
  }

  if (anthropicKey) {
    return new AnthropicClient({
      apiKey: anthropicKey,
      model: process.env.ANTHROPIC_MODEL || "claude-3-sonnet-20240229",
      maxTokens: process.env.ANTHROPIC_MAX_TOKENS ? parseInt(process.env.ANTHROPIC_MAX_TOKENS, 10) : 2000,
      temperature: process.env.ANTHROPIC_TEMPERATURE ? parseFloat(process.env.ANTHROPIC_TEMPERATURE) : 0.7,
    });
  }

  // Fallback to mock client
  return new MockLLMClient();
}

/**
 * Check if a real AI provider is configured
 * 
 * @returns true if OpenAI or Anthropic API key is set
 * Note: In browser environments, this will always return false as
 * environment variables are not available client-side.
 */
export function hasRealAIProvider(): boolean {
  // Check if we're in a Node.js environment (process.env is only available server-side)
  if (typeof process === "undefined" || !process.env) {
    return false;
  }
  // Safely access process.env
  try {
    return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
  } catch {
    return false;
  }
}
