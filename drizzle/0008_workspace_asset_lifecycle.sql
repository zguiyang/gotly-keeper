ALTER TABLE "notes"
  ADD COLUMN "lifecycle_status" text NOT NULL DEFAULT 'active',
  ADD COLUMN "archived_at" timestamp,
  ADD COLUMN "trashed_at" timestamp;

ALTER TABLE "todos"
  ADD COLUMN "lifecycle_status" text NOT NULL DEFAULT 'active',
  ADD COLUMN "archived_at" timestamp,
  ADD COLUMN "trashed_at" timestamp;

ALTER TABLE "bookmarks"
  ADD COLUMN "lifecycle_status" text NOT NULL DEFAULT 'active',
  ADD COLUMN "archived_at" timestamp,
  ADD COLUMN "trashed_at" timestamp;

ALTER TABLE "notes"
  ADD CONSTRAINT "notes_lifecycle_status_check"
  CHECK ("lifecycle_status" in ('active', 'archived', 'trashed'));

ALTER TABLE "todos"
  ADD CONSTRAINT "todos_lifecycle_status_check"
  CHECK ("lifecycle_status" in ('active', 'archived', 'trashed'));

ALTER TABLE "bookmarks"
  ADD CONSTRAINT "bookmarks_lifecycle_status_check"
  CHECK ("lifecycle_status" in ('active', 'archived', 'trashed'));

CREATE INDEX "notes_user_lifecycle_created_at_idx"
  ON "notes" ("user_id", "lifecycle_status", "created_at");

CREATE INDEX "todos_user_lifecycle_created_at_idx"
  ON "todos" ("user_id", "lifecycle_status", "created_at");

CREATE INDEX "bookmarks_user_lifecycle_created_at_idx"
  ON "bookmarks" ("user_id", "lifecycle_status", "created_at");
