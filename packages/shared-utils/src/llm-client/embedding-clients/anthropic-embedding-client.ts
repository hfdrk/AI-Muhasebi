import type { EmbeddingClient, EmbeddingClientConfig } from "./embedding-interface";

/**
 * Anthropic Embedding Client
 * 
 * Note: Anthropic doesn't currently have a dedicated embedding API.
 * This is a placeholder for future support when Anthropic releases embedding models.
 * For now, this will throw an error indicating it's not yet available.
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
    this.model = config.model || "claude-embed-v1"; // Placeholder model name
    this.baseUrl = config.baseUrl || "https://api.anthropic.com/v1";
    this.dimensions = config.dimensions || 1024; // Placeholder dimensions
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

