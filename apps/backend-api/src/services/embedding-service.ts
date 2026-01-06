import { createEmbeddingClient, hasRealEmbeddingProvider, type EmbeddingClient } from "@repo/shared-utils";
import { prisma } from "../lib/prisma";
import { logger } from "@repo/shared-utils";
import { getConfig } from "@repo/config";

/**
 * Chunk text into smaller pieces for embedding generation
 * Uses simple character-based chunking with overlap to preserve context
 */
function chunkText(text: string, chunkSize: number, overlap: number = 200): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    
    // Try to break at sentence boundary if possible
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + chunkSize * 0.5) {
        // Only use break point if it's not too early (at least 50% of chunk size)
        end = breakPoint + 1;
      }
    }

    chunks.push(text.substring(start, end));
    
    // Move start forward with overlap
    start = end - overlap;
    if (start < 0) start = 0;
    
    // Prevent infinite loop
    if (start >= text.length) break;
  }

  return chunks;
}

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors (validation, auth, etc.)
      if (error.message?.includes("dimension mismatch") || 
          error.message?.includes("API key") ||
          error.message?.includes("authentication")) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate exponential backoff delay: baseDelay * 2^attempt
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      logger.warn(`Embedding generation attempt ${attempt + 1} failed, retrying in ${delayMs}ms`, undefined, {
        error: error.message,
        attempt: attempt + 1,
        maxRetries,
      });
      
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError!;
}

/**
 * Embedding Service
 * 
 * Handles document embedding generation and storage
 */
export class EmbeddingService {
  private _embeddingClient: EmbeddingClient | null = null;

  private get embeddingClient(): EmbeddingClient {
    if (!this._embeddingClient) {
      if (!hasRealEmbeddingProvider()) {
        throw new Error(
          "No embedding provider configured. Set EMBEDDING_PROVIDER and required API keys."
        );
      }
      this._embeddingClient = createEmbeddingClient();
      logger.info("Embedding client initialized", undefined, {
        model: this._embeddingClient.getModel(),
        dimensions: this._embeddingClient.getDimensions(),
      });
    }
    return this._embeddingClient;
  }

  /**
   * Generate embedding for a text with retry logic
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const config = getConfig();
    const maxRetries = config.EMBEDDING_MAX_RETRIES;
    
    return retryWithBackoff(
      async () => {
        try {
          return await this.embeddingClient.generateEmbedding(text);
        } catch (error: any) {
          logger.error("Failed to generate embedding", undefined, {
            error: error.message,
            textLength: text.length,
          });
          throw error;
        }
      },
      maxRetries
    );
  }

  /**
   * Generate embeddings for multiple texts (batch) with retry logic
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const startTime = Date.now();
    const config = getConfig();
    const maxRetries = config.EMBEDDING_MAX_RETRIES;
    const model = this.embeddingClient.getModel();
    const expectedDimensions = this.embeddingClient.getDimensions();
    
    try {
      const embeddings = await retryWithBackoff(
        async () => {
          try {
            return await this.embeddingClient.generateEmbeddings(texts);
          } catch (error: any) {
            logger.error("Failed to generate embeddings", undefined, {
              error: error.message,
              batchSize: texts.length,
            });
            throw error;
          }
        },
        maxRetries
      );
      
      const duration = Date.now() - startTime;
      const totalTextLength = texts.reduce((sum, text) => sum + text.length, 0);
      
      // Log metrics
      logger.info("Batch embedding generation completed", undefined, {
        model,
        batchSize: texts.length,
        dimensions: embeddings[0]?.length || 0,
        expectedDimensions,
        totalTextLength,
        avgTextLength: Math.round(totalTextLength / texts.length),
        durationMs: duration,
        avgDurationMs: Math.round(duration / texts.length),
      });
      
      return embeddings;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error("Batch embedding generation failed", undefined, {
        model,
        expectedDimensions,
        batchSize: texts.length,
        durationMs: duration,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Store document embedding in database
   */
  async storeDocumentEmbedding(
    tenantId: string,
    documentId: string,
    embedding: number[],
    model: string
  ): Promise<void> {
    try {
      // Validate embedding dimensions match expected model dimensions
      const expectedDimensions = this.embeddingClient.getDimensions();
      if (embedding.length !== expectedDimensions) {
        throw new Error(
          `Embedding dimension mismatch: expected ${expectedDimensions}, got ${embedding.length}. Model: ${model}`
        );
      }

      // Validate embedding is not empty
      if (embedding.length === 0) {
        throw new Error("Cannot store empty embedding");
      }

      // Validate all values are finite numbers
      if (!embedding.every((val) => typeof val === "number" && isFinite(val))) {
        throw new Error("Embedding contains invalid values (non-finite numbers)");
      }

      // Use raw SQL for pgvector since Prisma doesn't fully support it yet
      // pgvector format: '[0.1,0.2,0.3]' or use array_to_string
      const embeddingArray = `[${embedding.join(",")}]`;
      
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO document_embeddings (id, tenant_id, document_id, embedding, model, created_at)
        VALUES ($1, $2, $3, $4::vector, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (document_id) 
        DO UPDATE SET 
          embedding = $4::vector,
          model = $5,
          created_at = CURRENT_TIMESTAMP
        `,
        `embedding_${documentId}`,
        tenantId,
        documentId,
        embeddingArray,
        model
      );

      logger.info("Document embedding stored", { tenantId }, {
        documentId,
        model,
        dimensions: embedding.length,
      });
    } catch (error: any) {
      logger.error("Failed to store document embedding", { tenantId }, {
        error: error.message,
        documentId,
      });
      throw error;
    }
  }

  /**
   * Generate and store embedding for a document
   * Handles text chunking for large documents
   */
  async generateAndStoreDocumentEmbedding(
    tenantId: string,
    documentId: string,
    text: string
  ): Promise<void> {
    try {
      const config = getConfig();
      const chunkSize = config.EMBEDDING_CHUNK_SIZE;
      
      // Estimate token count (rough approximation: 1 token ≈ 4 characters)
      const estimatedTokens = text.length / 4;
      
      let embedding: number[];
      
      if (estimatedTokens > chunkSize) {
        // Chunk the text and generate embedding for the first chunk (or average of chunks)
        logger.info("Document text exceeds chunk size, chunking before embedding", { tenantId }, {
          documentId,
          textLength: text.length,
          estimatedTokens,
          chunkSize,
        });
        
        const chunks = chunkText(text, chunkSize);
        
        // Generate embeddings for all chunks
        const chunkEmbeddings = await this.generateEmbeddings(chunks);
        
        // Average the chunk embeddings to get a single document embedding
        // This is a simple approach - in production, you might want to store multiple chunk embeddings
        const dimensions = chunkEmbeddings[0].length;
        embedding = new Array(dimensions).fill(0);
        
        for (const chunkEmbedding of chunkEmbeddings) {
          for (let i = 0; i < dimensions; i++) {
            embedding[i] += chunkEmbedding[i];
          }
        }
        
        // Average
        for (let i = 0; i < dimensions; i++) {
          embedding[i] /= chunkEmbeddings.length;
        }
        
        logger.info("Generated embedding from chunked document", { tenantId }, {
          documentId,
          chunkCount: chunks.length,
        });
      } else {
        // Generate embedding for the full text
        embedding = await this.generateEmbedding(text);
      }
      
      const model = this.embeddingClient.getModel();
      await this.storeDocumentEmbedding(tenantId, documentId, embedding, model);
    } catch (error: any) {
      logger.error("Failed to generate and store document embedding", { tenantId }, {
        error: error.message,
        documentId,
      });
      // Don't throw - allow document processing to continue even if embedding fails
      // This is a non-critical operation
    }
  }

  /**
   * Get embedding for a document if it exists
   */
  async getDocumentEmbedding(documentId: string): Promise<number[] | null> {
    try {
      const result = await prisma.$queryRawUnsafe<Array<{ embedding: string }>>(
        `
        SELECT embedding::text as embedding
        FROM document_embeddings
        WHERE document_id = $1
        `,
        documentId
      );

      if (result.length === 0 || !result[0].embedding) {
        return null;
      }

      // Parse the vector string back to array
      // pgvector format: '[0.1,0.2,0.3]' or '{0.1,0.2,0.3}'
      const embeddingString = result[0].embedding.trim();
      // Remove brackets/braces and split by comma
      const embedding = embeddingString
        .replace(/^[\[\{]+|[\]\}]+$/g, "")
        .split(",")
        .map((val) => parseFloat(val.trim()))
        .filter((val) => !isNaN(val));

      return embedding.length > 0 ? embedding : null;
    } catch (error: any) {
      logger.error("Failed to get document embedding", undefined, {
        error: error.message,
        documentId,
      });
      return null;
    }
  }

  /**
   * Get embedding dimensions for current model
   */
  getDimensions(): number {
    return this.embeddingClient.getDimensions();
  }

  /**
   * Get embedding model name
   */
  getModel(): string {
    return this.embeddingClient.getModel();
  }
}

export const embeddingService = new EmbeddingService();

