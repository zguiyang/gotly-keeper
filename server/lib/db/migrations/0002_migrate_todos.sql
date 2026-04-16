-- Migration: 0002_migrate_todos.sql
-- Description: Migrate todos from assets table to todos table
-- Run after: Phase A schema migration creates the todos table
-- Rollback: DELETE FROM todos WHERE id IN (SELECT id FROM assets WHERE type = 'todo')

-- Migrate todos: SELECT * FROM assets WHERE type = 'todo' -> INSERT into todos table
INSERT INTO todos (id, user_id, original_text, time_text, due_at, completed_at, created_at, updated_at)
SELECT 
    id,
    user_id,
    original_text,
    time_text,
    due_at,
    completed_at,
    created_at,
    updated_at
FROM assets
WHERE type = 'todo';

-- Verify count
-- SELECT count(*) FROM todos;
-- SELECT count(*) FROM assets WHERE type = 'todo';
