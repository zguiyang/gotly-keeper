-- Migration: 0006_add_structured_asset_fields.sql
-- Description: Add structured content fields to notes, todos, and bookmarks
-- Run after: Existing notes, todos, and bookmarks tables have been created and migrated
-- Rollback:
--   ALTER TABLE bookmarks DROP COLUMN IF EXISTS parsed_meta, DROP COLUMN IF EXISTS summary, DROP COLUMN IF EXISTS note, DROP COLUMN IF EXISTS title;
--   ALTER TABLE notes DROP COLUMN IF EXISTS parsed_meta, DROP COLUMN IF EXISTS summary, DROP COLUMN IF EXISTS content, DROP COLUMN IF EXISTS title;
--   ALTER TABLE todos DROP COLUMN IF EXISTS parsed_meta, DROP COLUMN IF EXISTS content, DROP COLUMN IF EXISTS title;

-- Compatibility strategy:
-- 1. New structured fields stay nullable so existing write paths remain valid.
-- 2. Existing rows are left unchanged; no historical backfill happens in this migration.
-- 3. Read/write compatibility remains with legacy fields until a later dedicated backfill or service update.

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS parsed_meta jsonb;

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS parsed_meta jsonb;

ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS parsed_meta jsonb;
