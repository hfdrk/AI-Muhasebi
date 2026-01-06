import { embeddingService } from "./embedding-service";
import { prisma } from "../lib/prisma";
import { logger, createLLMClient, hasRealAIProvider } from "@repo/shared-utils";
import { getConfig } from "@repo/config";

export interface SearchFilters {
  clientCompanyId?: string;
  documentType?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  minSimilarity?: number;
}

export interface RAGOptions {
  topK?: number;
  minSimilarity?: number;
  filters?: SearchFilters;
  includeMetadata?: boolean;
  useHybridSearch?: boolean;
  useReranking?: boolean;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface RAGContext {
  documents: Array<{
    id: string;
    documentId: string;
    similarity: number;
    text?: string;
    metadata?: {
      type?: string;
      clientCompanyId?: string;
      createdAt?: Date;
    };
    rerankScore?: number;
  }>;
  queryEmbedding: number[];
  totalResults: number;
  hybridResults?: number;
}

// Simple in-memory cache for embeddings (use Redis in production)
const embeddingCache = new Map<string, { embedding: number[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * RAG Service
 *
 * Retrieval Augmented Generation service for semantic document search
 *
 * Features:
 * - Semantic search using vector embeddings
 * - Hybrid search (semantic + keyword)
 * - Re-ranking using LLM for better relevance
 * - Conversation history support for multi-turn chat
 * - Embedding caching for performance
 */
export class RAGService {
  private llmClient: ReturnType<typeof createLLMClient> | null = null;

  /**
   * Generate embedding for a query text with caching
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    // Check cache first
    const cacheKey = `query:${query}`;
    const cached = embeddingCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.embedding;
    }

    // Generate new embedding
    const embedding = await embeddingService.generateEmbedding(query);

    // Cache the result
    embeddingCache.set(cacheKey, { embedding, timestamp: Date.now() });

    // Clean old cache entries periodically
    if (embeddingCache.size > 1000) {
      this.cleanEmbeddingCache();
    }

    return embedding;
  }

  /**
   * Clean expired cache entries
   */
  private cleanEmbeddingCache(): void {
    const now = Date.now();
    for (const [key, value] of embeddingCache.entries()) {
      if (now - value.timestamp > CACHE_TTL_MS) {
        embeddingCache.delete(key);
      }
    }
  }

  /**
   * Search for similar documents using vector similarity
   */
  async searchSimilarDocuments(
    queryEmbedding: number[],
    tenantId: string,
    limit: number,
    filters?: SearchFilters
  ): Promise<Array<{ documentId: string; similarity: number }>> {
    try {
      const config = getConfig();
      const minSimilarity = filters?.minSimilarity ?? config.RAG_MIN_SIMILARITY;
      const embeddingString = `[${queryEmbedding.join(",")}]`;

      // Build WHERE clause for filters
      let whereClause = "WHERE de.tenant_id = $1";
      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (filters?.clientCompanyId) {
        whereClause += ` AND d.client_company_id = $${paramIndex}`;
        params.push(filters.clientCompanyId);
        paramIndex++;
      }

      if (filters?.documentType) {
        whereClause += ` AND d.type = $${paramIndex}`;
        params.push(filters.documentType);
        paramIndex++;
      }

      if (filters?.dateRange) {
        whereClause += ` AND d.created_at >= $${paramIndex} AND d.created_at <= $${paramIndex + 1}`;
        params.push(filters.dateRange.from, filters.dateRange.to);
        paramIndex += 2;
      }

      // Add deleted filter
      whereClause += ` AND d.is_deleted = false`;

      // Use cosine similarity for vector search
      // pgvector cosine distance: 1 - cosine_similarity
      // We want similarity (higher is better), so we use 1 - cosine_distance
      const embeddingParamIndex = paramIndex;
      const similarityParamIndex = paramIndex + 1;
      const limitParamIndex = paramIndex + 2;
      
      const query = `
        SELECT 
          de.document_id,
          1 - (de.embedding <=> $${embeddingParamIndex}::vector) as similarity
        FROM document_embeddings de
        INNER JOIN documents d ON d.id = de.document_id
        ${whereClause}
        AND (1 - (de.embedding <=> $${embeddingParamIndex}::vector)) >= $${similarityParamIndex}
        ORDER BY de.embedding <=> $${embeddingParamIndex}::vector
        LIMIT $${limitParamIndex}
      `;

      params.push(embeddingString, minSimilarity, limit);
      
      const results = await prisma.$queryRawUnsafe<Array<{ document_id: string; similarity: number }>>(
        query,
        ...params
      );

      return results.map((r) => ({
        documentId: r.document_id,
        similarity: parseFloat(r.similarity.toString()),
      }));
    } catch (error: any) {
      // Enhanced error handling for pgvector-specific errors
      let errorMessage = error.message || "Unknown error";
      let errorType = "SQL_ERROR";
      
      // Check for pgvector-specific errors
      if (error.message?.includes("vector") || error.message?.includes("pgvector")) {
        errorType = "PGVECTOR_ERROR";
        if (error.message.includes("extension") || error.message.includes("vector")) {
          errorMessage = "pgvector extension not installed or not available. Please ensure the vector extension is enabled in PostgreSQL.";
        } else if (error.message.includes("dimension") || error.message.includes("length")) {
          errorMessage = "Embedding dimension mismatch. The query embedding dimensions don't match stored embeddings.";
        }
      } else if (error.message?.includes("syntax error")) {
        errorType = "SQL_SYNTAX_ERROR";
        errorMessage = `SQL syntax error in vector search query: ${error.message}`;
      } else if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
        errorType = "TABLE_NOT_FOUND";
        errorMessage = "document_embeddings table not found. Please run database migrations.";
      } else if (error.message?.includes("permission") || error.message?.includes("access")) {
        errorType = "PERMISSION_ERROR";
        errorMessage = "Database permission error. Check database user permissions.";
      }
      
      logger.error("Failed to search similar documents", { tenantId }, {
        error: errorMessage,
        errorType,
        originalError: error.message,
        limit,
        stack: error.stack,
      });
      
      // Throw a more user-friendly error
      throw new Error(`RAG search failed: ${errorMessage}`);
    }
  }

  /**
   * Retrieve context for RAG using semantic search
   */
  async retrieveContext(question: string, tenantId: string, options: RAGOptions = {}): Promise<RAGContext> {
    try {
      // Validate input
      if (!question || question.trim().length === 0) {
        throw new Error("Question cannot be empty");
      }

      const config = getConfig();
      const topK = options.topK ?? config.RAG_TOP_K;
      const minSimilarity = options.minSimilarity ?? config.RAG_MIN_SIMILARITY;

      // Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(question);

      // Search for similar documents
      const similarDocs = await this.searchSimilarDocuments(
        queryEmbedding,
        tenantId,
        topK,
        {
          ...options.filters,
          minSimilarity,
        }
      );

      // Fetch document details if metadata is requested
      const documents = await Promise.all(
        similarDocs.map(async (doc) => {
          const document = await prisma.document.findUnique({
            where: { id: doc.documentId },
            include: {
              ocrResult: options.includeMetadata,
              parsedData: options.includeMetadata,
            },
          });

          return {
            id: doc.documentId,
            documentId: doc.documentId,
            similarity: doc.similarity,
            text: document?.ocrResult?.rawText?.substring(0, 1000), // Limit text length
            metadata: options.includeMetadata
              ? {
                  type: document?.type,
                  clientCompanyId: document?.clientCompanyId,
                  createdAt: document?.createdAt,
                }
              : undefined,
          };
        })
      );

      return {
        documents,
        queryEmbedding,
        totalResults: documents.length,
      };
    } catch (error: any) {
      logger.error("Failed to retrieve RAG context", { tenantId }, {
        error: error.message,
        questionLength: question.length,
      });
      throw error;
    }
  }

  /**
   * Retrieve context from multiple sources (documents, invoices, transactions)
   */
  async retrieveMultiSourceContext(
    question: string,
    tenantId: string,
    options: RAGOptions = {}
  ): Promise<{
    documents: RAGContext["documents"];
    invoices?: Array<{ id: string; invoiceNumber: string; totalAmount: number; similarity: number }>;
    transactions?: Array<{ id: string; referenceNumber: string; amount: number; similarity: number }>;
  }> {
    const documentContext = await this.retrieveContext(question, tenantId, options);

    // For invoices and transactions, we can use keyword search or extend to embeddings later
    // For now, return document context
    return {
      documents: documentContext.documents,
    };
  }

  /**
   * Perform hybrid search combining semantic and keyword search
   */
  async hybridSearch(
    question: string,
    tenantId: string,
    options: RAGOptions = {}
  ): Promise<RAGContext> {
    const config = getConfig();
    const topK = options.topK ?? config.RAG_TOP_K;
    const minSimilarity = options.minSimilarity ?? config.RAG_MIN_SIMILARITY;

    // Generate query embedding
    const queryEmbedding = await this.generateQueryEmbedding(question);

    // Semantic search
    const semanticResults = await this.searchSimilarDocuments(
      queryEmbedding,
      tenantId,
      topK * 2, // Get more results for merging
      {
        ...options.filters,
        minSimilarity: minSimilarity * 0.8, // Lower threshold for hybrid
      }
    );

    // Keyword search using PostgreSQL full-text search
    const keywordResults = await this.keywordSearch(question, tenantId, topK * 2, options.filters);

    // Merge and deduplicate results using Reciprocal Rank Fusion (RRF)
    const mergedResults = this.reciprocalRankFusion(semanticResults, keywordResults, topK);

    // Fetch document details
    const documents = await Promise.all(
      mergedResults.map(async (result) => {
        const document = await prisma.document.findUnique({
          where: { id: result.documentId },
          include: {
            ocrResult: options.includeMetadata,
            parsedData: options.includeMetadata,
          },
        });

        return {
          id: result.documentId,
          documentId: result.documentId,
          similarity: result.similarity,
          text: document?.ocrResult?.rawText?.substring(0, 1000),
          metadata: options.includeMetadata
            ? {
                type: document?.type,
                clientCompanyId: document?.clientCompanyId,
                createdAt: document?.createdAt,
              }
            : undefined,
        };
      })
    );

    // Optionally re-rank results using LLM
    let finalDocuments = documents;
    if (options.useReranking && hasRealAIProvider()) {
      finalDocuments = await this.rerankResults(question, documents);
    }

    return {
      documents: finalDocuments,
      queryEmbedding,
      totalResults: finalDocuments.length,
      hybridResults: keywordResults.length,
    };
  }

  /**
   * Keyword search using PostgreSQL full-text search
   */
  private async keywordSearch(
    query: string,
    tenantId: string,
    limit: number,
    filters?: SearchFilters
  ): Promise<Array<{ documentId: string; similarity: number }>> {
    try {
      // Tokenize query for Turkish text search
      // Using plainto_tsquery for simple queries, or to_tsquery for more control
      const searchTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length > 2)
        .join(" & ");

      if (!searchTerms) {
        return [];
      }

      // Build WHERE clause
      let whereClause = "WHERE d.tenant_id = $1 AND d.is_deleted = false";
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (filters?.clientCompanyId) {
        whereClause += ` AND d.client_company_id = $${paramIndex}`;
        params.push(filters.clientCompanyId);
        paramIndex++;
      }

      if (filters?.documentType) {
        whereClause += ` AND d.type = $${paramIndex}`;
        params.push(filters.documentType);
        paramIndex++;
      }

      if (filters?.dateRange) {
        whereClause += ` AND d.created_at >= $${paramIndex} AND d.created_at <= $${paramIndex + 1}`;
        params.push(filters.dateRange.from, filters.dateRange.to);
        paramIndex += 2;
      }

      // Full-text search on OCR text
      const searchQuery = `
        SELECT DISTINCT
          d.id as document_id,
          ts_rank(
            to_tsvector('turkish', COALESCE(ocr.raw_text, '')),
            plainto_tsquery('turkish', $${paramIndex})
          ) as rank
        FROM documents d
        LEFT JOIN document_ocr_results ocr ON d.id = ocr.document_id
        ${whereClause}
        AND to_tsvector('turkish', COALESCE(ocr.raw_text, '')) @@ plainto_tsquery('turkish', $${paramIndex})
        ORDER BY rank DESC
        LIMIT $${paramIndex + 1}
      `;

      params.push(query, limit);

      const results = await prisma.$queryRawUnsafe<Array<{ document_id: string; rank: number }>>(
        searchQuery,
        ...params
      );

      // Normalize rank to similarity score (0-1 range)
      const maxRank = Math.max(...results.map((r) => r.rank), 0.001);
      return results.map((r) => ({
        documentId: r.document_id,
        similarity: r.rank / maxRank,
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Keyword search failed, returning empty results", { tenantId }, {
        error: errorMessage,
      });
      return [];
    }
  }

  /**
   * Merge results using Reciprocal Rank Fusion (RRF)
   * RRF score = sum(1 / (k + rank_i)) for each result list
   */
  private reciprocalRankFusion(
    semanticResults: Array<{ documentId: string; similarity: number }>,
    keywordResults: Array<{ documentId: string; similarity: number }>,
    limit: number,
    k: number = 60 // RRF constant
  ): Array<{ documentId: string; similarity: number }> {
    const scores = new Map<string, number>();

    // Add semantic search scores
    semanticResults.forEach((result, index) => {
      const rrfScore = 1 / (k + index + 1);
      scores.set(result.documentId, (scores.get(result.documentId) || 0) + rrfScore);
    });

    // Add keyword search scores
    keywordResults.forEach((result, index) => {
      const rrfScore = 1 / (k + index + 1);
      scores.set(result.documentId, (scores.get(result.documentId) || 0) + rrfScore);
    });

    // Sort by combined score and return top results
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([documentId, score]) => ({
        documentId,
        similarity: score,
      }));
  }

  /**
   * Re-rank results using LLM for better relevance
   */
  private async rerankResults(
    question: string,
    documents: RAGContext["documents"]
  ): Promise<RAGContext["documents"]> {
    if (documents.length <= 1) {
      return documents;
    }

    try {
      if (!this.llmClient) {
        this.llmClient = createLLMClient();
      }

      // Build reranking prompt
      const systemPrompt = `Sen bir belge alaka değerlendirme uzmanısın. Verilen soru için belgeleri alaka düzeyine göre sırala.
Her belge için 0-10 arası bir puan ver (10 = çok alakalı, 0 = alakasız).
Yanıtı JSON formatında ver: {"scores": [{"id": "doc_id", "score": 8}, ...]}`;

      const userPrompt = `Soru: ${question}

Belgeler:
${documents.map((doc, i) => `[${i + 1}] ID: ${doc.documentId}
İçerik: ${doc.text?.substring(0, 300) || "Metin yok"}
---`).join("\n")}

Her belge için alaka puanı ver (0-10):`;

      const response = await this.llmClient.generateJSON({
        systemPrompt,
        userPrompt,
        jsonSchema: {
          type: "object",
          properties: {
            scores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  score: { type: "number" },
                },
              },
            },
          },
        },
        maxTokens: 500,
      });

      // Parse scores and sort documents
      const scoreMap = new Map<string, number>();
      if (response.scores && Array.isArray(response.scores)) {
        for (const item of response.scores) {
          if (item.id && typeof item.score === "number") {
            scoreMap.set(item.id, item.score);
          }
        }
      }

      // Add rerank scores to documents and sort
      const rerankedDocs = documents.map((doc) => ({
        ...doc,
        rerankScore: scoreMap.get(doc.documentId) ?? doc.similarity * 10,
      }));

      rerankedDocs.sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0));

      logger.info("Documents re-ranked successfully", undefined, {
        originalCount: documents.length,
        rerankedCount: rerankedDocs.length,
      });

      return rerankedDocs;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Re-ranking failed, using original order", undefined, {
        error: errorMessage,
      });
      return documents;
    }
  }

  /**
   * Expand query using conversation history for multi-turn chat
   */
  async expandQueryWithHistory(
    question: string,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
  ): Promise<string> {
    if (!conversationHistory || conversationHistory.length === 0) {
      return question;
    }

    // If no LLM available, return original question with context hint
    if (!hasRealAIProvider()) {
      // Simple expansion: add relevant terms from history
      const historyTerms = conversationHistory
        .filter((msg) => msg.role === "user")
        .map((msg) => msg.content)
        .join(" ");

      return `${question} (Önceki bağlam: ${historyTerms.substring(0, 200)})`;
    }

    try {
      if (!this.llmClient) {
        this.llmClient = createLLMClient();
      }

      const systemPrompt = `Sen bir soru genişletme uzmanısın. Konuşma geçmişini kullanarak verilen soruyu daha bağlamsal ve anlaşılır hale getir.
Orijinal sorunun anlamını koru ama eksik referansları (bu, o, bunlar vb.) konuşma geçmişinden tamamla.
Sadece genişletilmiş soruyu döndür, açıklama ekleme.`;

      const historyText = conversationHistory
        .slice(-4) // Last 4 messages
        .map((msg) => `${msg.role === "user" ? "Kullanıcı" : "Asistan"}: ${msg.content}`)
        .join("\n");

      const userPrompt = `Konuşma Geçmişi:
${historyText}

Mevcut Soru: ${question}

Genişletilmiş soru:`;

      const expandedQuery = await this.llmClient.generateText({
        systemPrompt,
        userPrompt,
        maxTokens: 200,
      });

      logger.debug("Query expanded with history", undefined, {
        originalLength: question.length,
        expandedLength: expandedQuery.length,
      });

      return expandedQuery.trim() || question;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Query expansion failed, using original", undefined, {
        error: errorMessage,
      });
      return question;
    }
  }

  /**
   * Enhanced context retrieval with all features
   */
  async retrieveEnhancedContext(
    question: string,
    tenantId: string,
    options: RAGOptions = {}
  ): Promise<RAGContext> {
    // Expand query if conversation history is provided
    let expandedQuestion = question;
    if (options.conversationHistory && options.conversationHistory.length > 0) {
      expandedQuestion = await this.expandQueryWithHistory(question, options.conversationHistory);
    }

    // Use hybrid search if enabled, otherwise use standard semantic search
    if (options.useHybridSearch) {
      return await this.hybridSearch(expandedQuestion, tenantId, options);
    }

    return await this.retrieveContext(expandedQuestion, tenantId, options);
  }
}

export const ragService = new RAGService();

