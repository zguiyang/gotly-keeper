-- Migration: 0003_migrate_bookmarks.sql
-- Description: Migrate bookmarks from assets table to bookmarks table
-- Run after: Phase A schema migration creates the bookmarks table
-- Rollback: DELETE FROM bookmarks WHERE id IN (SELECT id FROM assets WHERE type = 'link')

-- Migrate bookmarks: SELECT * FROM assets WHERE type = 'link' -> INSERT into bookmarks table
-- bookmark_meta JSON is preserved as-is (jsonb column handles it automatically)
INSERT INTO bookmarks (id, user_id, original_text, url, bookmark_meta, created_at, updated_at)
SELECT 
    id,
    user_id,
    original_text,
    url,
    bookmark_meta,
    created_at,
    updated_at
FROM assets
WHERE type = 'link';

-- Verify count
-- SELECT count(*) FROM bookmarks;
-- SELECT count(*) FROM assets WHERE type = 'link';
