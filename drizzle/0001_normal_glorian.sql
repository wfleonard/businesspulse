CREATE TYPE "public"."recommendation_priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."recommendation_status" AS ENUM('suggested', 'accepted', 'dismissed', 'done');--> statement-breakpoint
CREATE TABLE "recommendation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"rationale" text NOT NULL,
	"priority" "recommendation_priority" DEFAULT 'medium' NOT NULL,
	"metric_refs" jsonb DEFAULT '[]'::jsonb,
	"status" "recommendation_status" DEFAULT 'suggested' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recommendation_org_status_idx" ON "recommendation" USING btree ("org_id","status");