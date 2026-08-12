CREATE TYPE "public"."meta_connection_status" AS ENUM('connected', 'expired', 'revoked', 'error');--> statement-breakpoint
CREATE TYPE "public"."meta_insights_level" AS ENUM('campaign', 'adset', 'ad');--> statement-breakpoint
CREATE TABLE "meta_ad_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"currency" text,
	"timezone_name" text,
	"account_status" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_ads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"adset_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"creative_id" text,
	"name" text NOT NULL,
	"status" text,
	"media_type" text,
	"thumbnail_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_adsets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"ad_account_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"objective" text,
	"status" text,
	"created_time" timestamp,
	"updated_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"external_user_id" text,
	"external_user_name" text,
	"status" "meta_connection_status" DEFAULT 'connected' NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"expires_at" timestamp,
	"last_validated_at" timestamp,
	"last_error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_insights_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"ad_account_id" uuid NOT NULL,
	"level" "meta_insights_level" NOT NULL,
	"entity_id" text NOT NULL,
	"date" date NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meta_ad_accounts" ADD CONSTRAINT "meta_ad_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_ad_accounts" ADD CONSTRAINT "meta_ad_accounts_connection_id_meta_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."meta_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_campaign_id_meta_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."meta_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_adset_id_meta_adsets_id_fk" FOREIGN KEY ("adset_id") REFERENCES "public"."meta_adsets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_adsets" ADD CONSTRAINT "meta_adsets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_adsets" ADD CONSTRAINT "meta_adsets_campaign_id_meta_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."meta_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_campaigns" ADD CONSTRAINT "meta_campaigns_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_campaigns" ADD CONSTRAINT "meta_campaigns_ad_account_id_meta_ad_accounts_id_fk" FOREIGN KEY ("ad_account_id") REFERENCES "public"."meta_ad_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_connections" ADD CONSTRAINT "meta_connections_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_insights_daily" ADD CONSTRAINT "meta_insights_daily_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_insights_daily" ADD CONSTRAINT "meta_insights_daily_ad_account_id_meta_ad_accounts_id_fk" FOREIGN KEY ("ad_account_id") REFERENCES "public"."meta_ad_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meta_ad_accounts_external_id_idx" ON "meta_ad_accounts" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meta_ads_external_id_idx" ON "meta_ads" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meta_adsets_external_id_idx" ON "meta_adsets" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meta_campaigns_external_id_idx" ON "meta_campaigns" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meta_insights_daily_unique_idx" ON "meta_insights_daily" USING btree ("client_id","level","entity_id","date");--> statement-breakpoint
CREATE INDEX "meta_insights_daily_client_date_idx" ON "meta_insights_daily" USING btree ("client_id","level","date");