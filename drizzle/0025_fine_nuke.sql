CREATE TYPE "public"."pulse_report_status" AS ENUM('queued', 'writing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "pulse_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"status" "pulse_report_status" DEFAULT 'queued' NOT NULL,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fixes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text,
	"cost_usd" numeric DEFAULT '0' NOT NULL,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp,
	"lease_token" uuid,
	"emailed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pulse_report_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
ALTER TABLE "pulse_report" ADD CONSTRAINT "pulse_report_run_id_aeo_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."aeo_run"("id") ON DELETE cascade ON UPDATE no action;