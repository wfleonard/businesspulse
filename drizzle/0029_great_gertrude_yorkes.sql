ALTER TABLE "aeo_panel_backlog" ADD COLUMN "request_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "aeo_panel_backlog" ADD COLUMN "last_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "aeo_panel_backlog" ADD COLUMN "demand_notified_at" timestamp;