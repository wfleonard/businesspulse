CREATE TYPE "public"."aeo_request_source" AS ENUM('form', 'outbound');--> statement-breakpoint
ALTER TABLE "aeo_request" ADD COLUMN "source" "aeo_request_source" DEFAULT 'form' NOT NULL;