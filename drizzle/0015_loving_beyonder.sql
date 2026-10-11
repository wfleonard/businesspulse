CREATE TYPE "public"."aeo_panel_backlog_status" AS ENUM('planned', 'drafted', 'skipped');--> statement-breakpoint
CREATE TABLE "aeo_panel_backlog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"rank" integer NOT NULL,
	"buyers" text DEFAULT '' NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"guidance" text DEFAULT '' NOT NULL,
	"status" "aeo_panel_backlog_status" DEFAULT 'planned' NOT NULL,
	"draft" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aeo_panel_backlog_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "aeo_panel_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"panel_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"questions" jsonb NOT NULL,
	"directory_domains" jsonb NOT NULL,
	"reference_domains" jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aeo_panel" ADD COLUMN "edited_at" timestamp;--> statement-breakpoint
ALTER TABLE "aeo_panel" ADD COLUMN "dismissed_domains" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "aeo_panel_version" ADD CONSTRAINT "aeo_panel_version_panel_id_aeo_panel_id_fk" FOREIGN KEY ("panel_id") REFERENCES "public"."aeo_panel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aeo_panel_version" ADD CONSTRAINT "aeo_panel_version_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "aeo_panel_version_uq" ON "aeo_panel_version" USING btree ("panel_id","version");