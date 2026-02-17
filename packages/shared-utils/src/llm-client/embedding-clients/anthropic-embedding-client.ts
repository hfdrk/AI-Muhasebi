import type { EmbeddingClient, EmbeddingClientConfig } from "./embedding-interface";

/**
 * Anthropic Embedding Client
 *
 * Anthropic does not currently offer a dedicated embedding API.
 * This client implements the EmbeddingClient interface for forward compatibility.
 */
export class AnthropicEmbeddingClient implements EmbeddingClient {
  private apiKey: string;
  private model: string;
  private dimensions: number;
  private baseUrl: string;

  constructor(config: EmbeddingClientConfig) {
    if (!config.apiKey) {
      throw new Error("Anthropic API key is required");
    }
    this.apiKey = config.apiKey;
    this.model = config.model || "claude-embed-v1";
    this.baseUrl = config.baseUrl || "https://api.anthropic.com/v1";
    this.dimensions = config.dimensions || 1024;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    throw new Error(
      "Anthropic embedding API is not yet available. Please use OpenAI or Ollama for embeddings."
    );
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    throw new Error(
      "Anthropic embedding API is not yet available. Please use OpenAI or Ollama for embeddings."
    );
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModel(): string {
    return this.model;
  }
}

