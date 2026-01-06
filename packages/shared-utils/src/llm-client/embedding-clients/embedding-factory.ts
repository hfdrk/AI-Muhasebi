import type { EmbeddingClient, EmbeddingClientConfig } from "./embedding-interface";
import { OpenAIEmbeddingClient } from "./openai-embedding-client";
import { AnthropicEmbeddingClient } from "./anthropic-embedding-client";
import { OllamaEmbeddingClient } from "./ollama-embedding-client";

export type EmbeddingProvider = "openai" | "anthropic" | "ollama";

/**
 * Create an embedding client based on environment variables
 * 
 * Priority:
 * 1. OpenAI if OPENAI_API_KEY is set and EMBEDDING_PROVIDER=openai
 * 2. Ollama if OLLAMA_BASE_URL is set and EMBEDDING_PROVIDER=ollama
 * 3. Anthropic if ANTHROPIC_API_KEY is set and EMBEDDING_PROVIDER=anthropic
 * 
 * @returns EmbeddingClient instance
 */
export function createEmbeddingClient(): EmbeddingClient {
  const provider = (process.env.EMBEDDING_PROVIDER || "openai") as EmbeddingProvider;
  const model = process.env.EMBEDDING_MODEL;
  const dimensions = process.env.EMBEDDING_DIMENSIONS ? parseInt(process.env.EMBEDDING_DIMENSIONS, 10) : undefined;

  switch (provider) {
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai");
      }
      return new OpenAIEmbeddingClient({
        apiKey,
        model: model || "text-embedding-3-small",
        dimensions,
      });
    }

    case "ollama": {
      const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
      return new OllamaEmbeddingClient({
        baseUrl,
        model: model || "nomic-embed-text",
        dimensions,
      });
    }

    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is required when EMBEDDING_PROVIDER=anthropic");
      }
      return new AnthropicEmbeddingClient({
        apiKey,
        model: model || "claude-embed-v1",
        dimensions,
      });
    }

    default:
      throw new Error(`Unsupported embedding provider: ${provider}. Supported: openai, ollama, anthropic`);
  }
}

/**
 * Check if a real embedding provider is configured
 * 
 * @returns true if OpenAI, Anthropic, or Ollama is configured
 */
export function hasRealEmbeddingProvider(): boolean {
  if (typeof process === "undefined" || !process.env) {
    return false;
  }

  try {
    const provider = (process.env.EMBEDDING_PROVIDER || "openai") as EmbeddingProvider;
    
    switch (provider) {
      case "openai":
        return !!(process.env.OPENAI_API_KEY);
      case "anthropic":
        return !!(process.env.ANTHROPIC_API_KEY);
      case "ollama":
        // Ollama is considered available if base URL is set (defaults to localhost)
        return true;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

