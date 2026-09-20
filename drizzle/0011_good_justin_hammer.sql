CREATE TABLE "aeo_recheck" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"token_hash" text,
	"emailed_at" timestamp,
	"email_attempts" integer DEFAULT 0 NOT NULL,
	"email_attempted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aeo_recheck_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "aeo_request" ADD COLUMN "unsubscribed_at" timestamp;--> statement-breakpoint
ALTER TABLE "aeo_recheck" ADD CONSTRAINT "aeo_recheck_request_id_aeo_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."aeo_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aeo_recheck" ADD CONSTRAINT "aeo_recheck_run_id_aeo_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."aeo_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aeo_recheck_request_idx" ON "aeo_recheck" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "aeo_recheck_run_idx" ON "aeo_recheck" USING btree ("run_id");