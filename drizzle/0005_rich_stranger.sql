CREATE INDEX IF NOT EXISTS "asset_embeddings_embedding_hnsw_cosine_idx" ON "asset_embeddings" USING hnsw ("embedding" vector_cosine_ops);
