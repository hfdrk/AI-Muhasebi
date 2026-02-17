-- Migration: Add HNSW vector index for DocumentEmbedding table
--
-- This migration upgrades the vector similarity search index from IVFFlat to HNSW
-- and adds a composite B-tree index for efficient tenant+document filtering.
--
-- HNSW (Hierarchical Navigable Small World) parameters:
--   m = 16        : Maximum number of connections per layer. Higher values improve recall
--                   but increase memory usage and build time. 16 is a balanced default
--                   that provides good recall without excessive resource consumption.
--   ef_construction = 64 : Size of the dynamic candidate list during index construction.
--                          Higher values improve recall at the cost of longer build time.
--                          64 provides good recall for most workloads.
--
-- HNSW advantages over IVFFlat:
--   - No training step required (works well even with small datasets)
--   - Better recall at similar speed
--   - Supports concurrent inserts without rebuilding

-- Step 1: Drop the existing IVFFlat index on the embedding column
DROP INDEX IF EXISTS "document_embeddings_embedding_idx";

-- Step 2: Create HNSW index on the embedding column for cosine similarity search
CREATE INDEX IF NOT EXISTS "DocumentEmbedding_embedding_hnsw_idx"
ON "document_embeddings" USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Step 3: Create a composite B-tree index on tenantId + documentId for efficient filtering
-- This speeds up queries that filter by tenant and then join/filter on document,
-- which is the most common access pattern in multi-tenant RAG queries.
CREATE INDEX IF NOT EXISTS "DocumentEmbedding_tenantId_documentId_idx"
ON "document_embeddings" ("tenant_id", "document_id");
