CREATE TYPE "public"."fix_request_status" AS ENUM('requested', 'quoted', 'paid', 'in_progress', 'done', 'declined', 'withdrawn', 'refunded');--> statement-breakpoint
CREATE TABLE "fix_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"run_id" uuid,
	"status" "fix_request_status" DEFAULT 'requested' NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_note" text DEFAULT '' NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"amount_cents" integer DEFAULT 50000 NOT NULL,
	"checkout_session_id" text,
	"payment_intent_id" text,
	"amount_tax" integer DEFAULT 0 NOT NULL,
	"amount_total" integer DEFAULT 0 NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"quoted_at" timestamp,
	"paid_at" timestamp,
	"started_at" timestamp,
	"done_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fix_request" ADD CONSTRAINT "fix_request_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fix_request" ADD CONSTRAINT "fix_request_run_id_aeo_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."aeo_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fix_request_business_idx" ON "fix_request" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "fix_request_payment_intent_idx" ON "fix_request" USING btree ("payment_intent_id");