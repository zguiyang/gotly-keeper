CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"original_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "todos" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"original_text" text NOT NULL,
	"time_text" text,
	"due_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"original_text" text NOT NULL,
	"url" text,
	"bookmark_meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "note_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"embedded_text" text NOT NULL,
	"model_name" text NOT NULL,
	"dimensions" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "todo_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"todo_id" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"embedded_text" text NOT NULL,
	"model_name" text NOT NULL,
	"dimensions" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookmark_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"bookmark_id" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"embedded_text" text NOT NULL,
	"model_name" text NOT NULL,
	"dimensions" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'notes_user_id_users_id_fk'
	) THEN
		ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'todos_user_id_users_id_fk'
	) THEN
		ALTER TABLE "todos" ADD CONSTRAINT "todos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_user_id_users_id_fk'
	) THEN
		ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'note_embeddings_note_id_notes_id_fk'
	) THEN
		ALTER TABLE "note_embeddings" ADD CONSTRAINT "note_embeddings_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'todo_embeddings_todo_id_todos_id_fk'
	) THEN
		ALTER TABLE "todo_embeddings" ADD CONSTRAINT "todo_embeddings_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'bookmark_embeddings_bookmark_id_bookmarks_id_fk'
	) THEN
		ALTER TABLE "bookmark_embeddings" ADD CONSTRAINT "bookmark_embeddings_bookmark_id_bookmarks_id_fk" FOREIGN KEY ("bookmark_id") REFERENCES "public"."bookmarks"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_user_created_at_idx" ON "notes" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "todos_user_created_at_idx" ON "todos" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "todos_user_completed_at_idx" ON "todos" USING btree ("user_id","completed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookmarks_user_created_at_idx" ON "bookmarks" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "note_embeddings_note_model_dimensions_idx" ON "note_embeddings" USING btree ("note_id","model_name","dimensions");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "note_embeddings_note_id_idx" ON "note_embeddings" USING btree ("note_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "note_embeddings_embedding_hnsw_cosine_idx" ON "note_embeddings" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "todo_embeddings_todo_model_dimensions_idx" ON "todo_embeddings" USING btree ("todo_id","model_name","dimensions");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "todo_embeddings_todo_id_idx" ON "todo_embeddings" USING btree ("todo_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "todo_embeddings_embedding_hnsw_cosine_idx" ON "todo_embeddings" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bookmark_embeddings_bookmark_model_dimensions_idx" ON "bookmark_embeddings" USING btree ("bookmark_id","model_name","dimensions");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookmark_embeddings_bookmark_id_idx" ON "bookmark_embeddings" USING btree ("bookmark_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookmark_embeddings_embedding_hnsw_cosine_idx" ON "bookmark_embeddings" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
INSERT INTO "notes" ("id", "user_id", "original_text", "created_at", "updated_at")
SELECT "id", "user_id", "original_text", "created_at", "updated_at"
FROM "assets"
WHERE "type" = 'note'
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "todos" ("id", "user_id", "original_text", "time_text", "due_at", "completed_at", "created_at", "updated_at")
SELECT "id", "user_id", "original_text", "time_text", "due_at", "completed_at", "created_at", "updated_at"
FROM "assets"
WHERE "type" = 'todo'
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "bookmarks" ("id", "user_id", "original_text", "url", "bookmark_meta", "created_at", "updated_at")
SELECT "id", "user_id", "original_text", "url", "bookmark_meta", "created_at", "updated_at"
FROM "assets"
WHERE "type" = 'link'
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "note_embeddings" ("id", "note_id", "embedding", "embedded_text", "model_name", "dimensions", "created_at", "updated_at")
SELECT ae."id", ae."asset_id", ae."embedding", ae."embedded_text", ae."model_name", ae."dimensions", ae."created_at", ae."updated_at"
FROM "asset_embeddings" ae
JOIN "assets" a ON ae."asset_id" = a."id"
WHERE a."type" = 'note'
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "todo_embeddings" ("id", "todo_id", "embedding", "embedded_text", "model_name", "dimensions", "created_at", "updated_at")
SELECT ae."id", ae."asset_id", ae."embedding", ae."embedded_text", ae."model_name", ae."dimensions", ae."created_at", ae."updated_at"
FROM "asset_embeddings" ae
JOIN "assets" a ON ae."asset_id" = a."id"
WHERE a."type" = 'todo'
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "bookmark_embeddings" ("id", "bookmark_id", "embedding", "embedded_text", "model_name", "dimensions", "created_at", "updated_at")
SELECT ae."id", ae."asset_id", ae."embedding", ae."embedded_text", ae."model_name", ae."dimensions", ae."created_at", ae."updated_at"
FROM "asset_embeddings" ae
JOIN "assets" a ON ae."asset_id" = a."id"
WHERE a."type" = 'link'
ON CONFLICT ("id") DO NOTHING;
