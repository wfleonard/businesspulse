CREATE TYPE "public"."business_panel_status" AS ENUM('queued', 'drafting', 'draft', 'approved', 'retired', 'failed');--> statement-breakpoint
ALTER TYPE "public"."aeo_panel_source" ADD VALUE 'business';--> statement-breakpoint
CREATE TABLE "business_panel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "business_panel_status" DEFAULT 'queued' NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"directory_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reference_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_panels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text,
	"cost_usd" numeric DEFAULT '0' NOT NULL,
	"error" text,
	"note" text DEFAULT '' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp,
	"lease_token" uuid,
	"approved_by" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aeo_run" ADD COLUMN "business_panel_id" uuid;--> statement-breakpoint
ALTER TABLE "business_panel" ADD CONSTRAINT "business_panel_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_panel" ADD CONSTRAINT "business_panel_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_panel_version_uq" ON "business_panel" USING btree ("business_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "business_panel_approved_uq" ON "business_panel" USING btree ("business_id") WHERE status = 'approved';--> statement-breakpoint
ALTER TABLE "aeo_run" ADD CONSTRAINT "aeo_run_business_panel_id_business_panel_id_fk" FOREIGN KEY ("business_panel_id") REFERENCES "public"."business_panel"("id") ON DELETE set null ON UPDATE no action;