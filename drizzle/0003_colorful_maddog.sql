CREATE TYPE "public"."aeo_lead_status" AS ENUM('new', 'contacted', 'won', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."aeo_panel_source" AS ENUM('canned', 'generated');--> statement-breakpoint
CREATE TYPE "public"."aeo_run_status" AS ENUM('queued', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."aeo_run_tier" AS ENUM('snapshot', 'full');--> statement-breakpoint
CREATE TABLE "aeo_panel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"questions" jsonb NOT NULL,
	"directory_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reference_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aeo_panel_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "aeo_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"business_name" text NOT NULL,
	"domain" text NOT NULL,
	"service" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"panel_slug" text,
	"contact_consent" boolean DEFAULT false NOT NULL,
	"verify_token_hash" text NOT NULL,
	"verify_expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"ip_address" text,
	"lead_status" "aeo_lead_status" DEFAULT 'new' NOT NULL,
	"run_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aeo_request_verify_token_hash_unique" UNIQUE("verify_token_hash")
);
--> statement-breakpoint
CREATE TABLE "aeo_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"category" text NOT NULL,
	"query" text NOT NULL,
	"engine" text NOT NULL,
	"model" text,
	"own_cited" boolean DEFAULT false NOT NULL,
	"name_mentioned" boolean DEFAULT false NOT NULL,
	"directory_only" boolean DEFAULT false NOT NULL,
	"own_rank" integer,
	"rivals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"answer" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"searches" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric DEFAULT '0' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aeo_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"domain" text NOT NULL,
	"tier" "aeo_run_tier" DEFAULT 'snapshot' NOT NULL,
	"engines" jsonb DEFAULT '["perplexity"]'::jsonb NOT NULL,
	"panel_source" "aeo_panel_source" NOT NULL,
	"panel_slug" text,
	"panel_version" integer,
	"status" "aeo_run_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp,
	"question_count" integer DEFAULT 0 NOT NULL,
	"cited_count" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric DEFAULT '0' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	CONSTRAINT "aeo_run_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "aeo_request" ADD CONSTRAINT "aeo_request_run_id_aeo_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."aeo_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aeo_result" ADD CONSTRAINT "aeo_result_run_id_aeo_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."aeo_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aeo_request_domain_idx" ON "aeo_request" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "aeo_request_email_idx" ON "aeo_request" USING btree ("email");--> statement-breakpoint
CREATE INDEX "aeo_request_created_idx" ON "aeo_request" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "aeo_result_run_idx" ON "aeo_result" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "aeo_run_status_created_idx" ON "aeo_run" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "aeo_run_domain_idx" ON "aeo_run" USING btree ("domain");