CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "asset_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"embedded_text" text NOT NULL,
	"model_name" text NOT NULL,
	"dimensions" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_embeddings" ADD CONSTRAINT "asset_embeddings_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_embeddings_asset_model_dimensions_idx" ON "asset_embeddings" USING btree ("asset_id","model_name","dimensions");--> statement-breakpoint
CREATE INDEX "asset_embeddings_asset_id_idx" ON "asset_embeddings" USING btree ("asset_id");
--> statement-breakpoint
CREATE INDEX "asset_embeddings_embedding_hnsw_cosine_idx"
  ON "asset_embeddings"
  USING hnsw ("embedding" vector_cosine_ops);