CREATE TABLE "workspace_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"run_id" text NOT NULL,
	"phase" text NOT NULL,
	"status" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_runs_status_check" CHECK ("status" IN ('awaiting_user', 'running', 'completed', 'failed'))
);

CREATE INDEX "workspace_runs_user_id_idx" ON "workspace_runs"("user_id");
CREATE INDEX "workspace_runs_user_status_idx" ON "workspace_runs"("user_id", "status");
CREATE UNIQUE INDEX "workspace_runs_run_id_idx" ON "workspace_runs"("run_id");
