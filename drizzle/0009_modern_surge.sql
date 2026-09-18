ALTER TABLE "aeo_run" ADD COLUMN "report_view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "aeo_run" ADD COLUMN "report_first_viewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "aeo_run" ADD COLUMN "report_last_viewed_at" timestamp;