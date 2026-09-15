ALTER TABLE "aeo_request" ADD COLUMN "report_emailed_at" timestamp;--> statement-breakpoint
ALTER TABLE "aeo_request" ADD COLUMN "report_email_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "aeo_request" ADD COLUMN "report_email_attempted_at" timestamp;