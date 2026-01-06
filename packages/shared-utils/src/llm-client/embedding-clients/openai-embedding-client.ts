import type { EmbeddingClient, EmbeddingClientConfig } from "./embedding-interface";

/**
 * Simple rate limiter using token bucket algorithm
 */
class RateLimiter {
  private tokens: number;
  public readonly maxTokens: number;
  public readonly refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  get currentTokens(): number {
    return this.tokens;
  }

  async acquire(tokens: number = 1): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    
    // Refill tokens based on elapsed time
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;

    // Wait if not enough tokens
    if (this.tokens < tokens) {
      const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
      await new Promise((resolve) => setTimeout(resolve, Math.ceil(waitTime)));
      // Refill again after waiting
      const afterWait = Date.now();
      const waitElapsed = (afterWait - this.lastRefill) / 1000;
      this.tokens = Math.min(this.maxTokens, this.tokens + waitElapsed * this.refillRate);
      this.lastRefill = afterWait;
    }

    this.tokens -= tokens;
  }
}

/**
 * OpenAI Embedding Client
 * 
 * Uses OpenAI API for text embeddings
 * Models: text-embedding-3-small (1536 dims), text-embedding-3-large (3072 dims)
 */
export class OpenAIEmbeddingClient implements EmbeddingClient {
  private apiKey: string;
  private model: string;
  private dimensions: number;
  private baseUrl: string;
  private rateLimiter: RateLimiter;

  constructor(config: EmbeddingClientConfig) {
    if (!config.apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.apiKey = config.apiKey;
    this.model = config.model || "text-embedding-3-small";
    this.baseUrl = config.baseUrl || "https://api.openai.com/v1";
    
    // Set dimensions based on model
    if (config.dimensions) {
      this.dimensions = config.dimensions;
    } else if (this.model.includes("large")) {
      this.dimensions = 3072;
    } else {
      this.dimensions = 1536; // Default for text-embedding-3-small
    }

    // Initialize rate limiter
    // OpenAI tier 1 limits: 500 RPM (requests per minute) = ~8.3 RPS
    // Using conservative 7 RPS to leave buffer
    const maxRPM = typeof process !== "undefined" && process.env.OPENAI_EMBEDDING_RPM
      ? parseInt(process.env.OPENAI_EMBEDDING_RPM, 10)
      : 500;
    const requestsPerSecond = maxRPM / 60;
    this.rateLimiter = new RateLimiter(requestsPerSecond, requestsPerSecond);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // Rate limit: one token per request
      await this.rateLimiter.acquire(1);

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
          dimensions: this.dimensions,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: { message: "Unknown error" } }))) as {
          error?: { message?: string };
        };
        const errorMessage = errorData.error?.message || response.statusText;
        throw new Error(`OpenAI Embedding API error: ${errorMessage}`);
      }

      const data = (await response.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };

      if (!data.data || data.data.length === 0) {
        throw new Error("No embeddings returned from OpenAI");
      }

      return data.data.map((item) => {
        if (!item.embedding) {
          throw new Error("Invalid embedding format from OpenAI");
        }
        return item.embedding;
      });
    } catch (error: any) {
      console.error("[OpenAI Embedding Client] Error generating embeddings:", {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Get current rate limiter status (for debugging)
   */
  getRateLimitStatus(): { tokens: number; maxTokens: number; refillRate: number } {
    return {
      tokens: this.rateLimiter.currentTokens,
      maxTokens: this.rateLimiter.maxTokens,
      refillRate: this.rateLimiter.refillRate,
    };
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModel(): string {
    return this.model;
  }
}

