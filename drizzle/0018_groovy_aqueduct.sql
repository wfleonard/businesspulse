CREATE TYPE "public"."access_request_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "access_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" "access_request_status" DEFAULT 'pending' NOT NULL,
	"ip_address" text,
	"notified_at" timestamp,
	"decided_at" timestamp,
	"decided_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_request" ADD CONSTRAINT "access_request_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_request_status_created_idx" ON "access_request" USING btree ("status","created_at");