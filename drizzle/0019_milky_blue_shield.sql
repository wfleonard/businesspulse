CREATE TYPE "public"."user_role" AS ENUM('admin', 'customer');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" "user_role" DEFAULT 'customer' NOT NULL;--> statement-breakpoint
-- Everyone with a login before roles existed was an admin (seeded or approved).
UPDATE "user" SET "role" = 'admin';