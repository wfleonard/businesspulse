CREATE TYPE "public"."pulse_order_status" AS ENUM('pending', 'paid', 'expired', 'refunded');--> statement-breakpoint
CREATE TABLE "pulse_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"status" "pulse_order_status" DEFAULT 'pending' NOT NULL,
	"checkout_session_id" text,
	"payment_intent_id" text,
	"currency" text DEFAULT 'usd' NOT NULL,
	"amount_subtotal" integer DEFAULT 0 NOT NULL,
	"amount_tax" integer DEFAULT 0 NOT NULL,
	"amount_total" integer DEFAULT 0 NOT NULL,
	"customer_email" text,
	"run_id" uuid,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	"refunded_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pulse_order_checkout_session_id_unique" UNIQUE("checkout_session_id")
);
--> statement-breakpoint
ALTER TABLE "pulse_order" ADD CONSTRAINT "pulse_order_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulse_order" ADD CONSTRAINT "pulse_order_run_id_aeo_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."aeo_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pulse_order_business_idx" ON "pulse_order" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "pulse_order_payment_intent_idx" ON "pulse_order" USING btree ("payment_intent_id");