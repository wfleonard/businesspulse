CREATE TABLE "business" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"other_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"panel_slug" text,
	"custom_industry" text DEFAULT '' NOT NULL,
	"service" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "aeo_request" ADD COLUMN "business_id" uuid;--> statement-breakpoint
ALTER TABLE "aeo_run" ADD COLUMN "business_id" uuid;--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_domain_idx" ON "business" USING btree ("domain");--> statement-breakpoint
ALTER TABLE "aeo_request" ADD CONSTRAINT "aeo_request_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aeo_run" ADD CONSTRAINT "aeo_run_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aeo_request_business_idx" ON "aeo_request" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "aeo_run_business_idx" ON "aeo_run" USING btree ("business_id");