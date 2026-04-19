-- DRIZZLE_MANUAL_DDL_EXCEPTION: legacy schema cleanup predates the Drizzle generated migration discipline.
-- Drop old assets and asset_embeddings tables
-- These tables have been replaced by notes, todos, bookmarks and their embedding tables

DROP TABLE IF EXISTS asset_embeddings;
DROP TABLE IF EXISTS assets;
