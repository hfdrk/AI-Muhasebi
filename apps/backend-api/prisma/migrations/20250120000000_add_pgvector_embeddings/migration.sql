-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE IF NOT EXISTS "document_embeddings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "document_embeddings_tenant_id_idx" ON "document_embeddings"("tenant_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "document_embeddings_document_id_idx" ON "document_embeddings"("document_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "document_embeddings_tenant_id_model_idx" ON "document_embeddings"("tenant_id", "model");

-- CreateIndex for vector similarity search using IVFFlat (Inverted File with Flat compression)
-- Note: HNSW requires pgvector 0.5.0+, using IVFFlat for broader compatibility
-- For better performance with pgvector 0.5.0+, you can use:
-- CREATE INDEX ... USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS "document_embeddings_embedding_idx" ON "document_embeddings" 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- AddForeignKey
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_document_id_fkey" 
FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateUniqueConstraint
CREATE UNIQUE INDEX IF NOT EXISTS "document_embeddings_document_id_key" ON "document_embeddings"("document_id");

