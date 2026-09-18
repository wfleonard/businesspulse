CREATE TABLE "aeo_booking_click" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aeo_booking_click" ADD CONSTRAINT "aeo_booking_click_run_id_aeo_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."aeo_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aeo_booking_click_run_idx" ON "aeo_booking_click" USING btree ("run_id");