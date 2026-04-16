-- Migration: 0004_migrate_embeddings.sql
-- Description: Migrate embeddings from asset_embeddings to entity-specific embeddings tables
-- Run after: Phase A schema migration creates note_embeddings, todo_embeddings, bookmark_embeddings tables
-- Rollback: 
--   DELETE FROM note_embeddings WHERE id IN (SELECT ae.id FROM asset_embeddings ae JOIN assets a ON ae.asset_id = a.id WHERE a.type = 'note');
--   DELETE FROM todo_embeddings WHERE id IN (SELECT ae.id FROM asset_embeddings ae JOIN assets a ON ae.asset_id = a.id WHERE a.type = 'todo');
--   DELETE FROM bookmark_embeddings WHERE id IN (SELECT ae.id FROM asset_embeddings ae JOIN assets a ON ae.asset_id = a.id WHERE a.type = 'link');

-- Migrate note embeddings: asset_embeddings joined with assets WHERE type = 'note'
INSERT INTO note_embeddings (id, note_id, embedding, embedded_text, model_name, dimensions, created_at, updated_at)
SELECT 
    ae.id,
    ae.asset_id,
    ae.embedding,
    ae.embedded_text,
    ae.model_name,
    ae.dimensions,
    ae.created_at,
    ae.updated_at
FROM asset_embeddings ae
JOIN assets a ON ae.asset_id = a.id
WHERE a.type = 'note';

-- Migrate todo embeddings: asset_embeddings joined with assets WHERE type = 'todo'
INSERT INTO todo_embeddings (id, todo_id, embedding, embedded_text, model_name, dimensions, created_at, updated_at)
SELECT 
    ae.id,
    ae.asset_id,
    ae.embedding,
    ae.embedded_text,
    ae.model_name,
    ae.dimensions,
    ae.created_at,
    ae.updated_at
FROM asset_embeddings ae
JOIN assets a ON ae.asset_id = a.id
WHERE a.type = 'todo';

-- Migrate bookmark embeddings: asset_embeddings joined with assets WHERE type = 'link'
INSERT INTO bookmark_embeddings (id, bookmark_id, embedding, embedded_text, model_name, dimensions, created_at, updated_at)
SELECT 
    ae.id,
    ae.asset_id,
    ae.embedding,
    ae.embedded_text,
    ae.model_name,
    ae.dimensions,
    ae.created_at,
    ae.updated_at
FROM asset_embeddings ae
JOIN assets a ON ae.asset_id = a.id
WHERE a.type = 'link';

-- Verify counts
-- SELECT 'note_embeddings' as table_name, count(*) as count FROM note_embeddings
-- UNION ALL SELECT 'todo_embeddings', count(*) FROM todo_embeddings
-- UNION ALL SELECT 'bookmark_embeddings', count(*) FROM bookmark_embeddings
-- UNION ALL SELECT 'asset_embeddings (should be 0 after cleanup)', count(*) FROM asset_embeddings;
