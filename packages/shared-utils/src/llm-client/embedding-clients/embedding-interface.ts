/**
 * Embedding Client Interface
 * 
 * Abstraction for different embedding providers (OpenAI, Anthropic, Ollama)
 */
export interface EmbeddingClient {
  /**
   * Generate embedding for a single text
   * @param text - Text to embed
   * @returns Embedding vector (array of numbers)
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts (batch)
   * @param texts - Array of texts to embed
   * @returns Array of embedding vectors
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Get the dimension of embeddings this client produces
   * @returns Dimension count (e.g., 1536 for OpenAI text-embedding-3-small)
   */
  getDimensions(): number;

  /**
   * Get the model name being used
   * @returns Model identifier string
   */
  getModel(): string;
}

/**
 * Embedding Client Configuration
 */
export interface EmbeddingClientConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  dimensions?: number;
}

