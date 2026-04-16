-- Migration: 0001_migrate_notes.sql
-- Description: Migrate notes from assets table to notes table
-- Run after: Phase A schema migration creates the notes table
-- Rollback: DELETE FROM notes WHERE id IN (SELECT id FROM assets WHERE type = 'note')

-- Migrate notes: SELECT * FROM assets WHERE type = 'note' -> INSERT into notes table
INSERT INTO notes (id, user_id, original_text, created_at, updated_at)
SELECT 
    id,
    user_id,
    original_text,
    created_at,
    updated_at
FROM assets
WHERE type = 'note';

-- Verify count
-- SELECT count(*) FROM notes;
-- SELECT count(*) FROM assets WHERE type = 'note';
