CREATE TABLE "aeo_scan_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"domain" text NOT NULL,
	"email" text NOT NULL,
	"ip_address" text,
	"notified_at" timestamp,
	"anonymized_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "aeo_scan_request_created_idx" ON "aeo_scan_request" USING btree ("created_at");