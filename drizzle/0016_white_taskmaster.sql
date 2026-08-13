CREATE TABLE "meta_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"ad_account_id" uuid NOT NULL,
	"page_id" text NOT NULL,
	"form_id" text NOT NULL,
	"form_name" text,
	"leadgen_id" text NOT NULL,
	"campaign_id" text,
	"adset_id" text,
	"ad_id" text,
	"created_time" timestamp NOT NULL,
	"lead_date_local" date NOT NULL,
	"name" text,
	"phone" text,
	"email" text,
	"field_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meta_ad_accounts" ADD COLUMN "page_id" text;--> statement-breakpoint
ALTER TABLE "meta_leads" ADD CONSTRAINT "meta_leads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_leads" ADD CONSTRAINT "meta_leads_ad_account_id_meta_ad_accounts_id_fk" FOREIGN KEY ("ad_account_id") REFERENCES "public"."meta_ad_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meta_leads_client_leadgen_idx" ON "meta_leads" USING btree ("client_id","leadgen_id");--> statement-breakpoint
CREATE INDEX "meta_leads_client_campaign_date_idx" ON "meta_leads" USING btree ("client_id","campaign_id","lead_date_local");