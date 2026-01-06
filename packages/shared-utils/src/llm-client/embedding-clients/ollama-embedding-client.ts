import type { EmbeddingClient, EmbeddingClientConfig } from "./embedding-interface";

/**
 * Ollama Embedding Client
 * 
 * Uses local Ollama instance for text embeddings
 * Models: nomic-embed-text, llama2, etc.
 */
export class OllamaEmbeddingClient implements EmbeddingClient {
  private model: string;
  private dimensions: number;
  private baseUrl: string;
  private maxConcurrent: number;

  constructor(config: EmbeddingClientConfig) {
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.model = config.model || "nomic-embed-text";
    this.dimensions = config.dimensions || 768; // Default for nomic-embed-text
    // Get max concurrent requests from env or default to 5
    this.maxConcurrent = typeof process !== "undefined" && process.env.OLLAMA_CONCURRENT_REQUESTS
      ? parseInt(process.env.OLLAMA_CONCURRENT_REQUESTS, 10)
      : 5;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // Process embeddings in parallel batches with concurrency limit
      const embeddings: number[][] = [];
      
      // Process in batches to respect concurrency limit
      for (let i = 0; i < texts.length; i += this.maxConcurrent) {
        const batch = texts.slice(i, i + this.maxConcurrent);
        
        const batchPromises = batch.map(async (text) => {
          const response = await fetch(`${this.baseUrl}/api/embeddings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: this.model,
              prompt: text,
            }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
            throw new Error(`Ollama API error: ${error.error?.message || response.statusText}`);
          }

          const data = (await response.json()) as { embedding?: number[] };
          
          if (!data.embedding || data.embedding.length === 0) {
            throw new Error(`No embedding returned from Ollama for text: ${text.substring(0, 50)}...`);
          }

          return data.embedding;
        });

        const batchResults = await Promise.all(batchPromises);
        embeddings.push(...batchResults);
      }

      return embeddings;
    } catch (error: any) {
      // Use console.error as fallback since logger might not be available in shared-utils
      // In production, this should be caught and logged by the calling service
      const errorMessage = error.message || "Unknown error";
      throw new Error(`Failed to generate embeddings with Ollama: ${errorMessage}`);
    }
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModel(): string {
    return this.model;
  }
}

