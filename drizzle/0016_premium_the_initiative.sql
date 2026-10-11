CREATE TYPE "public"."aeo_mail_send_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TABLE "aeo_mail_send" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"template_id" uuid,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "aeo_mail_send_status" NOT NULL,
	"error" text,
	"token_hash" text,
	"user_id" text,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aeo_mail_send_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "aeo_mail_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aeo_mail_template_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "aeo_mail_send" ADD CONSTRAINT "aeo_mail_send_request_id_aeo_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."aeo_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aeo_mail_send" ADD CONSTRAINT "aeo_mail_send_template_id_aeo_mail_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."aeo_mail_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aeo_mail_send" ADD CONSTRAINT "aeo_mail_send_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aeo_mail_send_request_idx" ON "aeo_mail_send" USING btree ("request_id","sent_at");--> statement-breakpoint
CREATE INDEX "aeo_mail_send_sent_idx" ON "aeo_mail_send" USING btree ("sent_at");