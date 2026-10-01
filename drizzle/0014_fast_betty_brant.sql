CREATE TYPE "public"."aeo_monitor_interest_kind" AS ENUM('click', 'waitlist');--> statement-breakpoint
CREATE TABLE "aeo_monitor_interest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"kind" "aeo_monitor_interest_kind" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aeo_monitor_interest" ADD CONSTRAINT "aeo_monitor_interest_run_id_aeo_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."aeo_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aeo_monitor_interest_run_idx" ON "aeo_monitor_interest" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "aeo_monitor_waitlist_run_uq" ON "aeo_monitor_interest" USING btree ("run_id") WHERE kind = 'waitlist';