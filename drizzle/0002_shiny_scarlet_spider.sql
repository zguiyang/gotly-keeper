ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
WITH first_user AS (
  SELECT "id"
  FROM "users"
  WHERE NOT EXISTS (
    SELECT 1 FROM "users" WHERE "role" = 'super_admin'
  )
  ORDER BY "created_at" ASC, "id" ASC
  LIMIT 1
)
UPDATE "users"
SET "role" = 'super_admin'
WHERE "id" IN (SELECT "id" FROM first_user);--> statement-breakpoint
CREATE UNIQUE INDEX "users_single_super_admin_idx" ON "users" USING btree ("role") WHERE "users"."role" = 'super_admin';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" in ('super_admin', 'user'));--> statement-breakpoint
CREATE OR REPLACE FUNCTION "assign_first_user_super_admin"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('gotly_keeper:first_super_admin'));

  IF NOT EXISTS (
    SELECT 1 FROM "users" WHERE "role" = 'super_admin'
  ) THEN
    NEW."role" := 'super_admin';
  ELSE
    NEW."role" := 'user';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS "users_assign_first_super_admin" ON "users";--> statement-breakpoint
CREATE TRIGGER "users_assign_first_super_admin"
BEFORE INSERT ON "users"
FOR EACH ROW
EXECUTE FUNCTION "assign_first_user_super_admin"();