CREATE TYPE "public"."business_brief_status" AS ENUM('queued', 'reading', 'ready', 'confirmed', 'failed');--> statement-breakpoint
CREATE TABLE "business_brief" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"status" "business_brief_status" DEFAULT 'queued' NOT NULL,
	"brief" jsonb,
	"pages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"crawl_source" text,
	"confirmed" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp,
	"lease_token" uuid,
	"cost_usd" numeric DEFAULT '0' NOT NULL,
	"error" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_brief_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
ALTER TABLE "business_brief" ADD CONSTRAINT "business_brief_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;